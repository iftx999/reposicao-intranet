package com.example.barreplenishment

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.view.Window
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.room.Room
import com.example.barreplenishment.core.data.BarRepository
import com.example.barreplenishment.core.data.CartLine
import com.example.barreplenishment.core.data.RequestStatus
import com.example.barreplenishment.core.data.RequestWithDetails
import com.example.barreplenishment.core.database.AppDatabase
import com.example.barreplenishment.core.database.ProductEntity
import com.example.barreplenishment.core.network.SupabaseClient
import com.example.barreplenishment.core.network.AuthResult
import com.example.barreplenishment.core.sync.SyncManager
import com.example.barreplenishment.core.ui.BarTheme
import com.example.barreplenishment.core.ui.BottomTabs
import com.example.barreplenishment.core.ui.TopBar
import com.example.barreplenishment.features.home.DetailScreen
import com.example.barreplenishment.features.home.HomeScreen
import com.example.barreplenishment.features.home.LoginScreen
import com.example.barreplenishment.features.home.ProductsScreen
import com.example.barreplenishment.features.home.ReplenishScreen
import com.example.barreplenishment.features.home.RequestsScreen
import com.example.barreplenishment.features.home.ReviewScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val window: Window = window
        window.statusBarColor = android.graphics.Color.rgb(22, 25, 29)
        window.navigationBarColor = android.graphics.Color.WHITE
        setContent {
            BarTheme {
                BarApp()
            }
        }
    }
}

@Composable
fun BarApp() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("session", Context.MODE_PRIVATE) }
    val db = remember { Room.databaseBuilder(context, AppDatabase::class.java, "bar-replenishment.db").build() }
    val repository = remember { BarRepository(db) }
    val supabaseClient = remember {
        SupabaseClient().apply {
            val savedAccess = prefs.getString("access_token", null)
            val savedRefresh = prefs.getString("refresh_token", null)
            if (savedAccess != null && savedRefresh != null) {
                restoreSession(savedAccess, savedRefresh)
            }
            onSessionUpdated = { access, refresh ->
                prefs.edit().putString("access_token", access).putString("refresh_token", refresh).apply()
            }
        }
    }
    val syncManager = remember { SyncManager(repository, supabaseClient) }
    val scope = rememberCoroutineScope()

    var loggedIn by remember { mutableStateOf(prefs.getBoolean("logged_in", false)) }
    var user by remember { mutableStateOf(prefs.getString("user_name", "") ?: "") }
    var password by remember { mutableStateOf("") }
    var authError by remember { mutableStateOf("") }
    var authLoading by remember { mutableStateOf(false) }
    var tab by remember { mutableIntStateOf(0) }
    var reviewing by remember { mutableStateOf(false) }
    var selectedRequestId by remember { mutableStateOf<String?>(null) }
    var category by remember { mutableStateOf("Todos") }
    var search by remember { mutableStateOf("") }
    var requestFilter by remember { mutableStateOf(RequestStatus.Pending) }
    var priority by remember { mutableStateOf("Normal") }
    var notes by remember { mutableStateOf("") }
    var products by remember { mutableStateOf(emptyList<ProductEntity>()) }
    var favorites by remember { mutableStateOf(emptyList<ProductEntity>()) }
    var requests by remember { mutableStateOf(emptyList<RequestWithDetails>()) }
    var pending by remember { mutableIntStateOf(0) }
    var separating by remember { mutableIntStateOf(0) }
    var replenished by remember { mutableIntStateOf(0) }
    var loading by remember { mutableStateOf(false) }
    val cart = remember { mutableStateMapOf<String, Int>() }

    fun refresh() {
        loading = true
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    repository.seedIfNeeded()
                    syncManager.downloadProducts()
                    syncManager.syncWaitingUploads()
                    products = repository.products(category, search)
                    favorites = repository.favorites()
                    requests = if (tab == 2) repository.requests(requestFilter) else repository.requests(null)
                    pending = repository.countByStatus(RequestStatus.Pending)
                    separating = repository.countByStatus(RequestStatus.InSeparation)
                    replenished = repository.countByStatus(RequestStatus.Replenished)
                }
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(loggedIn, tab, category, search, requestFilter) { if (loggedIn) refresh() }

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        if (!loggedIn) {
            LoginScreen(
                user = user,
                password = password,
                onUser = { user = it },
                onPassword = { password = it },
                error = authError,
                loading = authLoading,
                onLogin = {
                    if (user.isBlank() || password.isBlank()) {
                        toast(context, "Preencha usuario e senha.")
                    } else {
                        authLoading = true
                        authError = ""
                        scope.launch {
                            val result = withContext(Dispatchers.IO) { supabaseClient.signIn(user, password) }
                            authLoading = false
                            when (result) {
                                is AuthResult.Success -> {
                                    withContext(Dispatchers.IO) { repository.clearProducts() }
                                    prefs.edit()
                                        .putBoolean("logged_in", true)
                                        .putString("user_name", result.userEmail)
                                        .putString("access_token", result.accessToken)
                                        .putString("refresh_token", result.refreshToken)
                                        .apply()
                                    user = result.userEmail
                                    loggedIn = true
                                }
                                is AuthResult.Failure -> {
                                    authError = result.message
                                    toast(context, result.message)
                                }
                            }
                        }
                    }
                }
            )
            return@Box
        }

        Column(Modifier.fillMaxSize()) {
            TopBar(
                title = when {
                    selectedRequestId != null -> "Detalhe da solicitação"
                    reviewing -> "Revise antes de enviar"
                    tab == 0 -> "Controle rápido de reposição"
                    tab == 1 -> "Escolha produtos para repor"
                    tab == 2 -> "Acompanhe cada solicitação"
                    else -> "Catálogo ativo do setor"
                },
                subtitle = "Turno atual - $pending pendentes",
                onLogout = {
                    prefs.edit().clear().apply()
                    products = emptyList()
                    favorites = emptyList()
                    cart.clear()
                    scope.launch { withContext(Dispatchers.IO) { repository.clearProducts() } }
                    loggedIn = false
                }
            )
            if (loading) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
            }

            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(bottom = 82.dp)) {
                val lineItems = cart.mapNotNull { entry -> products.find { it.id == entry.key }?.let { CartLine(it, entry.value) } }
                val selected = selectedRequestId?.let { id -> requests.find { it.request.id == id } }
                val contentKey = when {
                    selected != null -> "detail-${selected.request.id}"
                    reviewing -> "review"
                    else -> "tab-$tab"
                }
                Crossfade(targetState = contentKey, label = "screenTransition") {
                    when {
                        selected != null -> DetailScreen(
                            details = selected,
                            onStatus = { status: String ->
                                scope.launch {
                                    withContext(Dispatchers.IO) { repository.updateStatus(selected.request.id, status, user, isOnline(context)); syncManager.syncWaitingUploads() }
                                    selectedRequestId = null
                                    tab = 2
                                    refresh()
                                }
                            },
                            onBack = { selectedRequestId = null; refresh() }
                        )
                        reviewing -> ReviewScreen(
                            lines = lineItems,
                            priority = priority,
                            notes = notes,
                            onPriority = { priority = it },
                            onNotes = { notes = it },
                            onMinus = { product: ProductEntity -> val next = (cart[product.id] ?: 0) - 1; if (next <= 0) cart.remove(product.id) else cart[product.id] = next },
                            onPlus = { product: ProductEntity -> cart[product.id] = (cart[product.id] ?: 0) + 1 },
                            onSubmit = {
                                if (lineItems.isEmpty()) toast(context, "Selecione pelo menos um item.") else scope.launch {
                                    withContext(Dispatchers.IO) {
                                        repository.createRequest(user, priority.lowercase(), notes, lineItems, isOnline(context))
                                        syncManager.syncWaitingUploads()
                                    }
                                    cart.clear(); notes = ""; priority = "Normal"; reviewing = false; tab = 2; requestFilter = RequestStatus.Pending; refresh()
                                }
                            }
                        )
                        tab == 0 -> HomeScreen(pending, separating, replenished, favorites, requests.take(3), onNew = { tab = 1 }, onQuickAdd = { product -> cart[product.id] = (cart[product.id] ?: 0) + 1; tab = 1 }, onOpenRequest = { selectedRequestId = it })
                        tab == 1 -> ReplenishScreen(products, CATEGORIES, category, search, cart, onCategory = { category = it }, onSearch = { search = it }, onMinus = { product: ProductEntity -> val next = (cart[product.id] ?: 0) - 1; if (next <= 0) cart.remove(product.id) else cart[product.id] = next }, onPlus = { product: ProductEntity -> cart[product.id] = (cart[product.id] ?: 0) + 1 }, onReview = { reviewing = true })
                        tab == 2 -> RequestsScreen(requests, requestFilter, onFilter = { requestFilter = it }, onOpen = { selectedRequestId = it })
                        tab == 3 -> ProductsScreen(products, CATEGORIES, category, search, onCategory = { category = it }, onSearch = { search = it })
                    }
                }
            }
            BottomTabs(tab) { index -> tab = index; reviewing = false; selectedRequestId = null }
        }
    }
}

private val CATEGORIES = listOf("Todos", "Bebidas", "Gelo", "Frutas", "Descartaveis", "Insumos")

private fun toast(context: Context, message: String) = Toast.makeText(context, message, Toast.LENGTH_SHORT).show()

private fun isOnline(context: Context): Boolean {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    val network = cm.activeNetwork ?: return false
    val caps = cm.getNetworkCapabilities(network) ?: return false
    return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
}



