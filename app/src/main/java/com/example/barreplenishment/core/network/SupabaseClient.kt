package com.example.barreplenishment.core.network

import android.util.Log
import com.example.barreplenishment.BuildConfig
import com.example.barreplenishment.core.data.RequestWithDetails
import com.example.barreplenishment.core.database.ProductEntity
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL
import java.nio.charset.StandardCharsets

sealed class AuthResult {
    data class Success(
        val accessToken: String,
        val refreshToken: String,
        val userId: String,
        val userEmail: String
    ) : AuthResult()

    data class Failure(val message: String) : AuthResult()
}

data class CurrentUserProfile(
    val role: String,
    val sectorId: String?,
    val active: Boolean,
    val isSuperAdmin: Boolean
)

data class ProductDownload(
    val products: List<ProductEntity>,
    val scopeKey: String
)

class SupabaseClient {
    private val baseUrl: String = BuildConfig.SUPABASE_URL.trimEnd('/')
    private val anonKey: String = BuildConfig.SUPABASE_ANON_KEY
    val enabled: Boolean = baseUrl.isNotBlank() && anonKey.isNotBlank()

    var accessToken: String? = null
        private set
    var refreshToken: String? = null
        private set
    var onSessionUpdated: ((accessToken: String, refreshToken: String) -> Unit)? = null
    private var userId: String? = null
    private var currentProfile: CurrentUserProfile? = null

    fun restoreSession(access: String, refresh: String) {
        accessToken = access
        refreshToken = refresh
        currentProfile = null
    }

    fun fetchProducts(): ProductDownload? {
        if (!enabled) return null
        val profile = fetchCurrentProfile() ?: return ProductDownload(emptyList(), "profile_unavailable")
        if (!profile.active) return ProductDownload(emptyList(), "inactive")

        val productSectorFilter = if (profile.isSuperAdmin || profile.role == "admin" || profile.role == "gestor") {
            null
        } else {
            val sectorId = profile.sectorId?.takeIf { it.isNotBlank() } ?: return ProductDownload(emptyList(), "operator:no_sector")
            "sector_id=eq.${urlEncode(sectorId)}"
        }
        val scopeKey = productSectorFilter ?: "company_all"
        val filter = productSectorFilter?.let { "&$it" } ?: ""
        val url = URL("$baseUrl/rest/v1/products?select=id,sector_id,name,category,unit,active,favorite&active=eq.true$filter")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 8000
            readTimeout = 8000
            setRequestProperty("apikey", anonKey)
            setRequestProperty("Authorization", "Bearer ${accessToken ?: anonKey}")
        }
        return try {
            val code = connection.responseCode
            if (code !in 200..299) return null
            val text = BufferedReader(InputStreamReader(connection.inputStream)).use { it.readText() }
            val array = JSONArray(text)
            val products = (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                ProductEntity(
                    id = obj.getString("id"),
                    sectorId = obj.getString("sector_id"),
                    name = obj.getString("name"),
                    category = obj.getString("category"),
                    unit = obj.getString("unit"),
                    active = obj.getBoolean("active"),
                    favorite = obj.getBoolean("favorite")
                )
            }
            ProductDownload(products, scopeKey)
        } catch (_: Exception) {
            null
        } finally {
            connection.disconnect()
        }
    }

    fun signIn(email: String, password: String): AuthResult {
        if (!enabled) return AuthResult.Failure("Supabase nao configurado.")

        val url = URL("$baseUrl/auth/v1/token?grant_type=password")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8000
            readTimeout = 8000
            doOutput = true
            setRequestProperty("apikey", anonKey)
            setRequestProperty("Content-Type", "application/json")
        }

        return try {
            val body = JSONObject().put("email", email).put("password", password)
            OutputStreamWriter(connection.outputStream).use { it.write(body.toString()) }

            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = BufferedReader(InputStreamReader(stream)).use { it.readText() }

            if (code in 200..299) {
                val json = JSONObject(text)
                val token = json.getString("access_token")
                val refresh = json.getString("refresh_token")
                val userObj = json.getJSONObject("user")
                accessToken = token
                refreshToken = refresh
                userId = userObj.getString("id")
                currentProfile = null
                onSessionUpdated?.invoke(token, refresh)
                AuthResult.Success(token, refresh, userObj.getString("id"), userObj.optString("email", email))
            } else {
                val message = try {
                    JSONObject(text).optString("error_description", "Credenciais invalidas.")
                } catch (_: Exception) {
                    "Credenciais invalidas."
                }
                AuthResult.Failure(message)
            }
        } catch (e: Exception) {
            AuthResult.Failure("Falha de conexao: ${e.message}")
        } finally {
            connection.disconnect()
        }
    }

    private fun fetchCurrentProfile(): CurrentUserProfile? {
        currentProfile?.let { return it }
        val currentUserId = userId ?: fetchUserId() ?: return null
        val url = URL("$baseUrl/rest/v1/profiles?select=role,sector_id,active,is_super_admin&id=eq.${urlEncode(currentUserId)}&limit=1")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 8000
            readTimeout = 8000
            setRequestProperty("apikey", anonKey)
            setRequestProperty("Authorization", "Bearer ${accessToken ?: anonKey}")
        }
        return try {
            val code = connection.responseCode
            if (code !in 200..299) return null
            val text = BufferedReader(InputStreamReader(connection.inputStream)).use { it.readText() }
            val array = JSONArray(text)
            if (array.length() == 0) return null
            val obj = array.getJSONObject(0)
            CurrentUserProfile(
                role = obj.optString("role", "operador"),
                sectorId = obj.optString("sector_id").takeIf { it.isNotBlank() && it != "null" },
                active = obj.optBoolean("active", false),
                isSuperAdmin = obj.optBoolean("is_super_admin", false)
            ).also { currentProfile = it }
        } catch (_: Exception) {
            null
        } finally {
            connection.disconnect()
        }
    }

    private fun fetchUserId(): String? {
        val url = URL("$baseUrl/auth/v1/user")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 8000
            readTimeout = 8000
            setRequestProperty("apikey", anonKey)
            setRequestProperty("Authorization", "Bearer ${accessToken ?: anonKey}")
        }
        return try {
            val code = connection.responseCode
            if (code !in 200..299) return null
            val text = BufferedReader(InputStreamReader(connection.inputStream)).use { it.readText() }
            JSONObject(text).getString("id").also { userId = it }
        } catch (_: Exception) {
            null
        } finally {
            connection.disconnect()
        }
    }

    private fun urlEncode(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8.name())

    private fun refreshAccessToken(): Boolean {
        val currentRefresh = refreshToken ?: return false
        val url = URL("$baseUrl/auth/v1/token?grant_type=refresh_token")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8000
            readTimeout = 8000
            doOutput = true
            setRequestProperty("apikey", anonKey)
            setRequestProperty("Content-Type", "application/json")
        }

        return try {
            val body = JSONObject().put("refresh_token", currentRefresh)
            OutputStreamWriter(connection.outputStream).use { it.write(body.toString()) }

            val code = connection.responseCode
            if (code !in 200..299) return false

            val text = BufferedReader(InputStreamReader(connection.inputStream)).use { it.readText() }
            val json = JSONObject(text)
            accessToken = json.getString("access_token")
            refreshToken = json.getString("refresh_token")
            currentProfile = null
            onSessionUpdated?.invoke(accessToken!!, refreshToken!!)
            true
        } catch (_: Exception) {
            false
        } finally {
            connection.disconnect()
        }
    }

    private fun isoTimestamp(millis: Long): String = java.time.Instant.ofEpochMilli(millis).toString()

    fun upsertRequest(details: RequestWithDetails): Boolean {
        if (!enabled) return false
        val request = details.request
        val body = JSONObject()
            .put("id", request.id)
            .put("restaurant_unit_id", request.restaurantUnitId)
            .put("sector_id", request.sectorId)
            .put("created_by", request.createdBy.takeIf { it.isNotBlank() } ?: JSONObject.NULL)
            .put("priority", request.priority)
            .put("status", request.status)
            .put("notes", request.notes)
            .put("created_at", isoTimestamp(request.createdAt))
            .put("updated_at", isoTimestamp(request.updatedAt))
            .put("synced_at", isoTimestamp(System.currentTimeMillis()))
        Log.d("BarSync", "upsertRequest: posting request id=${request.id}")
        if (!post("replenishment_requests", JSONArray().put(body))) return false

        val items = JSONArray()
        details.items.forEach { item ->
            items.put(
                JSONObject()
                    .put("id", item.id)
                    .put("request_id", item.requestId)
                    .put("product_id", item.productId)
                    .put("quantity", item.quantity)
                    .put("unit", item.unit)
                    .put("notes", item.notes)
            )
        }
        Log.d("BarSync", "upsertRequest: items.length()=${items.length()} for request ${request.id}")
        if (items.length() > 0 && !post("replenishment_request_items", items)) return false

        val events = JSONArray()
        details.events.forEach { event ->
            events.put(
                JSONObject()
                    .put("id", event.id)
                    .put("request_id", event.requestId)
                    .put("status", event.status)
                    .put("message", event.message)
                    .put("user_id", event.userId.takeIf { it.isNotBlank() } ?: JSONObject.NULL)
                    .put("created_at", isoTimestamp(event.createdAt))
            )
        }
        Log.d("BarSync", "upsertRequest: events.length()=${events.length()} for request ${request.id}")
        return events.length() == 0 || post("request_status_events", events)
    }
    private fun post(table: String, body: JSONArray, retrying: Boolean = false): Boolean {
        val url = URL("$baseUrl/rest/v1/$table?on_conflict=id")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8000
            readTimeout = 8000
            doOutput = true
            setRequestProperty("apikey", anonKey)
            setRequestProperty("Authorization", "Bearer ${accessToken ?: anonKey}")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Prefer", "resolution=merge-duplicates")
        }
        return try {
            OutputStreamWriter(connection.outputStream).use { it.write(body.toString()) }
            val code = connection.responseCode
            if (code == 401 && !retrying && refreshAccessToken()) {
                connection.disconnect()
                return post(table, body, retrying = true)
            }
            code in 200..299
        } catch (_: Exception) {
            false
        } finally {
            connection.disconnect()
        }
    }
}
