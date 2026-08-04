package com.example.barreplenishment.features.home

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.barreplenishment.core.data.CartLine
import com.example.barreplenishment.core.data.RequestStatus
import com.example.barreplenishment.core.data.RequestWithDetails
import com.example.barreplenishment.core.database.ProductEntity
import com.example.barreplenishment.core.ui.Amber
import com.example.barreplenishment.core.ui.AppCard
import com.example.barreplenishment.core.ui.Charcoal
import com.example.barreplenishment.core.ui.Chip
import com.example.barreplenishment.core.ui.Coral
import com.example.barreplenishment.core.ui.Gap
import com.example.barreplenishment.core.ui.Graphite
import com.example.barreplenishment.core.ui.Ice
import com.example.barreplenishment.core.ui.Lime
import com.example.barreplenishment.core.ui.MetricCard
import com.example.barreplenishment.core.ui.Mist
import com.example.barreplenishment.core.ui.Muted
import com.example.barreplenishment.core.ui.PrimaryButton
import com.example.barreplenishment.core.ui.RowGap
import com.example.barreplenishment.core.ui.SectionTitle
import com.example.barreplenishment.core.ui.Soda
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun LoginScreen(
    user: String,
    password: String,
    onUser: (String) -> Unit,
    onPassword: (String) -> Unit,
    onLogin: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Graphite)
            .padding(horizontal = 22.dp, vertical = 28.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(Lime, MaterialTheme.shapes.large),
                    contentAlignment = Alignment.Center
                ) {
                    Text("B", color = Graphite, style = MaterialTheme.typography.headlineMedium)
                }
                RowGap(12)
                Column {
                    Text("BAR", color = Color.White, style = MaterialTheme.typography.displaySmall)
                    Text("Reposição operacional", color = Color(0xFFCDD6DC), style = MaterialTheme.typography.bodyMedium)
                }
            }
            Gap(26)
            Text(
                "Controle o que falta antes do atendimento apertar.",
                color = Color.White,
                style = MaterialTheme.typography.displaySmall
            )
            Gap(12)
            Text(
                "Entre no seu turno para registrar produtos, acompanhar pendências e marcar reposições concluídas.",
                color = Color(0xFFC9D2D8),
                style = MaterialTheme.typography.bodyLarge
            )
        }

        Column {
            Row(Modifier.fillMaxWidth()) {
                LoginSignal("Offline", "Cache local", Amber, Icons.Filled.CloudOff, Modifier.weight(1f))
                RowGap(10)
                LoginSignal("Sync", "Supabase", Soda, Icons.Filled.Sync, Modifier.weight(1f))
            }
            Gap(14)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.extraLarge,
                colors = CardDefaults.cardColors(containerColor = Ice),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Acesso do responsável", style = MaterialTheme.typography.titleLarge, color = Graphite)
                            Text("Setor ativo: BAR", style = MaterialTheme.typography.bodyMedium, color = Muted)
                        }
                        Text(
                            "Turno",
                            color = Graphite,
                            style = MaterialTheme.typography.labelMedium,
                            modifier = Modifier
                                .background(Lime, CircleShape)
                                .padding(horizontal = 12.dp, vertical = 7.dp)
                        )
                    }
                    Gap(18)
                    OutlinedTextField(
                        value = user,
                        onValueChange = onUser,
                        label = { Text("Usuário ou email") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        colors = inputColors()
                    )
                    Gap(10)
                    OutlinedTextField(
                        value = password,
                        onValueChange = onPassword,
                        label = { Text("Senha") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        colors = inputColors()
                    )
                    Gap(18)
                    PrimaryButton("Entrar no BAR", Lime, Graphite, onLogin)
                }
            }
        }
    }
}

@Composable
private fun LoginSignal(title: String, body: String, color: Color, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.height(76.dp),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = Charcoal),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = title, tint = color, modifier = Modifier.size(22.dp))
            RowGap(10)
            Column(verticalArrangement = Arrangement.Center) {
                Text(title, color = color, style = MaterialTheme.typography.labelLarge)
                Text(body, color = Color.White, style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}

@Composable
fun HomeScreen(
    pending: Int,
    separating: Int,
    replenished: Int,
    favorites: List<ProductEntity>,
    latest: List<RequestWithDetails>,
    onNew: () -> Unit,
    onQuickAdd: (ProductEntity) -> Unit,
    onOpenRequest: (String) -> Unit
) {
    Column(Modifier.padding(18.dp)) {
        Card(
            Modifier
                .fillMaxWidth()
                .height(134.dp)
                .clickable(onClickLabel = "Criar nova reposição", onClick = onNew),
            shape = MaterialTheme.shapes.extraLarge,
            colors = CardDefaults.cardColors(containerColor = Amber),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp, pressedElevation = 10.dp)
        ) {
            Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
                    Text("Nova reposição", color = Graphite, style = MaterialTheme.typography.headlineMedium)
                    Gap(6)
                    Text(
                        "Monte uma solicitação com vários itens do bar.",
                        color = Graphite.copy(alpha = 0.78f),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Box(Modifier.size(48.dp).background(Graphite, CircleShape), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Add, contentDescription = "Criar reposição", tint = Lime)
                }
            }
        }
        Gap(14)
        Row(Modifier.fillMaxWidth()) {
            MetricCard("Pendentes", pending, Amber, Modifier.weight(1f))
            RowGap(10)
            MetricCard("Separação", separating, Soda, Modifier.weight(1f))
            RowGap(10)
            MetricCard("Repostos", replenished, Lime, Modifier.weight(1f))
        }
        Gap(18)
        SectionTitle("Produtos frequentes")
        if (favorites.isEmpty()) {
            EmptyCard("Sem favoritos ainda", "Os produtos usados com frequência aparecem aqui.", Icons.Filled.Inventory2)
        } else {
            Row(Modifier.horizontalScroll(rememberScrollState())) {
                favorites.forEach {
                    Chip(it.name, color = Amber, onClick = { onQuickAdd(it) })
                    RowGap(8)
                }
            }
        }
        Gap(18)
        SectionTitle("Últimas solicitações")
        if (latest.isEmpty()) {
            EmptyCard("Nenhuma solicitação ainda", "Use Nova reposição para criar a primeira.", Icons.Filled.Inbox)
        }
        latest.forEach { RequestCard(it, onOpenRequest) }
    }
}

@Composable
fun ProductsScreen(
    products: List<ProductEntity>,
    categories: List<String>,
    category: String,
    search: String,
    onCategory: (String) -> Unit,
    onSearch: (String) -> Unit
) {
    Column(Modifier.padding(18.dp)) {
        SearchField(search, onSearch)
        Gap(12)
        CategoryRow(categories, category, onCategory)
        Gap(14)
        if (products.isEmpty()) EmptyCard("Nenhum produto encontrado", "Ajuste a busca ou a categoria selecionada.", Icons.Filled.Search)
        products.forEach { ProductRow(product = it, quantity = null, onMinus = {}, onPlus = {}) }
    }
}

@Composable
fun ReplenishScreen(
    products: List<ProductEntity>,
    categories: List<String>,
    category: String,
    search: String,
    cart: Map<String, Int>,
    onCategory: (String) -> Unit,
    onSearch: (String) -> Unit,
    onMinus: (ProductEntity) -> Unit,
    onPlus: (ProductEntity) -> Unit,
    onReview: () -> Unit
) {
    Column(Modifier.padding(18.dp)) {
        SearchField(search, onSearch)
        Gap(12)
        CategoryRow(categories, category, onCategory)
        Gap(14)
        if (products.isEmpty()) EmptyCard("Nenhum item disponível", "Tente outra categoria ou termo de busca.", Icons.Filled.Inventory2)
        products.forEach { ProductRow(it, cart[it.id] ?: 0, { onMinus(it) }, { onPlus(it) }) }
        Gap(12)
        AppCard(Graphite) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f)) {
                    Crossfade(cart.values.sum(), label = "cartCount") { count ->
                        Text(
                            "$count itens selecionados",
                            color = Color.White,
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                }
                Text(
                    "Revisar",
                    color = Graphite,
                    style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier
                        .background(Lime, MaterialTheme.shapes.medium)
                        .clickable(onClickLabel = "Revisar solicitação", onClick = onReview)
                        .padding(horizontal = 22.dp, vertical = 12.dp)
                )
            }
        }
    }
}

@Composable
fun ReviewScreen(
    lines: List<CartLine>,
    priority: String,
    notes: String,
    onPriority: (String) -> Unit,
    onNotes: (String) -> Unit,
    onMinus: (ProductEntity) -> Unit,
    onPlus: (ProductEntity) -> Unit,
    onSubmit: () -> Unit
) {
    Column(Modifier.padding(18.dp)) {
        SectionTitle("Revisão da solicitação")
        if (lines.isEmpty()) EmptyCard("Carrinho vazio", "Adicione pelo menos um produto antes de enviar.", Icons.Filled.Inbox)
        lines.forEach { ProductRow(it.product, it.quantity, { onMinus(it.product) }, { onPlus(it.product) }) }
        Gap(10)
        Row(Modifier.horizontalScroll(rememberScrollState())) {
            listOf("Normal", "Alta", "Urgente").forEach {
                Chip(it, selected = it == priority, color = if (it == "Urgente") Coral else Amber, onClick = { onPriority(it) })
                RowGap(8)
            }
        }
        Gap(12)
        OutlinedTextField(
            value = notes,
            onValueChange = onNotes,
            label = { Text("Observação opcional") },
            modifier = Modifier
                .fillMaxWidth()
                .height(104.dp),
            colors = inputColors()
        )
        Gap(16)
        PrimaryButton("Enviar solicitação", onClick = onSubmit)
    }
}

@Composable
fun RequestsScreen(requests: List<RequestWithDetails>, filter: String, onFilter: (String) -> Unit, onOpen: (String) -> Unit) {
    Column(Modifier.padding(18.dp)) {
        Row(Modifier.horizontalScroll(rememberScrollState())) {
            listOf(RequestStatus.Pending, RequestStatus.InSeparation, RequestStatus.Replenished, RequestStatus.Cancelled).forEach {
                Chip(statusLabel(it), selected = it == filter, onClick = { onFilter(it) })
                RowGap(8)
            }
        }
        Gap(14)
        if (requests.isEmpty()) EmptyCard("Nada por aqui", "As solicitações do BAR aparecem nesta lista.", Icons.Filled.Assignment)
        requests.forEach { RequestCard(it, onOpen) }
    }
}

@Composable
fun DetailScreen(details: RequestWithDetails, onStatus: (String) -> Unit, onBack: () -> Unit) {
    Column(Modifier.padding(18.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Voltar", tint = Graphite)
            }
            Text("Detalhe ${details.request.id}", style = MaterialTheme.typography.titleLarge, color = Graphite)
        }
        RequestCard(details, onOpen = {})
        Gap(14)
        SectionTitle("Itens")
        details.items.forEach {
            AppCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(38.dp).background(Mist, CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.Inventory2, contentDescription = null, tint = Graphite)
                    }
                    RowGap(12)
                    Column(Modifier.weight(1f)) {
                        Text(it.productName, style = MaterialTheme.typography.titleMedium, color = Graphite)
                        Text("${it.quantity} ${it.unit}", color = Muted, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            Gap(8)
        }
        SectionTitle("Histórico")
        details.events.forEach {
            Text(
                "${date(it.createdAt)} - ${it.message}",
                color = Muted,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }
        Gap(14)
        when (details.request.status) {
            RequestStatus.Pending -> {
                PrimaryButton("Iniciar separação", Soda, Color.White) { onStatus(RequestStatus.InSeparation) }
                Gap(8)
                PrimaryButton("Cancelar", Coral, Color.White) { onStatus(RequestStatus.Cancelled) }
            }
            RequestStatus.InSeparation -> {
                PrimaryButton("Marcar como reposto", Lime, Graphite) { onStatus(RequestStatus.Replenished) }
                Gap(8)
                PrimaryButton("Cancelar", Coral, Color.White) { onStatus(RequestStatus.Cancelled) }
            }
        }
        Gap(8)
        PrimaryButton("Voltar", onClick = onBack)
    }
}

@Composable
private fun SearchField(value: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text("Buscar") },
        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = {}),
        shape = MaterialTheme.shapes.large,
        colors = inputColors()
    )
}

@Composable
private fun CategoryRow(categories: List<String>, selected: String, onSelect: (String) -> Unit) {
    Row(Modifier.horizontalScroll(rememberScrollState())) {
        categories.forEach {
            Chip(it, selected = it == selected, onClick = { onSelect(it) })
            RowGap(8)
        }
    }
}

@Composable
private fun ProductRow(product: ProductEntity, quantity: Int?, onMinus: () -> Unit, onPlus: () -> Unit) {
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(42.dp).background(Mist, MaterialTheme.shapes.medium), contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.Inventory2, contentDescription = null, tint = Graphite)
            }
            RowGap(12)
            Column(Modifier.weight(1f)) {
                Text(product.name, style = MaterialTheme.typography.titleMedium, color = Graphite, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${product.category} - ${product.unit}", color = Muted, style = MaterialTheme.typography.bodyMedium)
            }
            if (quantity != null) {
                Step(Icons.Filled.Remove, "Diminuir quantidade", onMinus)
                Crossfade(quantity, label = "quantityChange") {
                    Text(
                        it.toString(),
                        style = MaterialTheme.typography.titleMedium,
                        color = Graphite,
                        modifier = Modifier.padding(horizontal = 12.dp)
                    )
                }
                Step(Icons.Filled.Add, "Aumentar quantidade", onPlus)
            }
        }
    }
    Gap(10)
}

@Composable
private fun Step(icon: androidx.compose.ui.graphics.vector.ImageVector, description: String, onClick: () -> Unit) {
    IconButton(
        onClick = onClick,
        modifier = Modifier
            .size(40.dp)
            .clip(MaterialTheme.shapes.medium)
            .background(Mist)
    ) {
        Icon(icon, contentDescription = description, tint = Graphite)
    }
}

@Composable
private fun RequestCard(details: RequestWithDetails, onOpen: (String) -> Unit) {
    AppCard {
        Column(Modifier.clickable(onClickLabel = "Abrir solicitação ${details.request.id}") { onOpen(details.request.id) }) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(details.request.id, style = MaterialTheme.typography.titleMedium, color = Graphite)
                    Text("${date(details.request.createdAt)} - ${priorityLabel(details.request.priority)}", color = Muted, style = MaterialTheme.typography.bodyMedium)
                }
                StatusPill(details.request.status)
            }
            Gap(10)
            Text(
                details.items.joinToString { "${it.productName} x${it.quantity}" },
                color = Graphite,
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            if (details.request.syncState != "synced") {
                Gap(8)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.WarningAmber, contentDescription = "Aguardando envio", tint = Amber, modifier = Modifier.size(18.dp))
                    RowGap(6)
                    Text("Aguardando envio para o servidor", color = Graphite, style = MaterialTheme.typography.labelMedium)
                }
            }
        }
    }
    Gap(10)
}

@Composable
private fun StatusPill(status: String) {
    val background = statusColor(status)
    Text(
        statusLabel(status),
        color = statusTextColor(status),
        style = MaterialTheme.typography.labelMedium,
        modifier = Modifier
            .background(background, CircleShape)
            .padding(horizontal = 10.dp, vertical = 6.dp)
    )
}

@Composable
private fun EmptyCard(title: String, body: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(50.dp).background(Lime.copy(alpha = 0.25f), CircleShape), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = Graphite)
            }
            RowGap(14)
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium, color = Graphite)
                Text(body, color = Muted, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun inputColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Graphite,
    focusedLabelColor = Graphite,
    cursorColor = Graphite,
    focusedContainerColor = Color.White,
    unfocusedContainerColor = Color.White
)

private fun statusLabel(status: String) = when (status) {
    RequestStatus.Pending -> "Pendente"
    RequestStatus.InSeparation -> "Em separação"
    RequestStatus.Replenished -> "Reposto"
    RequestStatus.Cancelled -> "Cancelado"
    else -> status
}

private fun priorityLabel(priority: String) = priority.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.ROOT) else it.toString() }

private fun statusColor(status: String) = when (status) {
    RequestStatus.InSeparation -> Soda
    RequestStatus.Replenished -> Lime
    RequestStatus.Cancelled -> Coral
    else -> Amber
}

private fun statusTextColor(status: String) = when (status) {
    RequestStatus.Replenished, RequestStatus.Pending -> Graphite
    else -> Color.White
}

private fun date(value: Long) = SimpleDateFormat("dd/MM HH:mm", Locale.ROOT).format(Date(value))
