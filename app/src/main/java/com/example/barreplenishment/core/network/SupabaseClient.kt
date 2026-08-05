package com.example.barreplenishment.core.network

import com.example.barreplenishment.BuildConfig
import com.example.barreplenishment.core.data.RequestWithDetails
import com.example.barreplenishment.core.database.ProductEntity
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

sealed class AuthResult {
    data class Success(
        val accessToken: String,
        val refreshToken: String,
        val userId: String,
        val userEmail: String
    ) : AuthResult()

    data class Failure(val message: String) : AuthResult()
}

class SupabaseClient {
    private val baseUrl: String = BuildConfig.SUPABASE_URL.trimEnd('/')
    private val anonKey: String = BuildConfig.SUPABASE_ANON_KEY
    val enabled: Boolean = baseUrl.isNotBlank() && anonKey.isNotBlank()

    var accessToken: String? = null
        private set
    var refreshToken: String? = null
        private set

    fun restoreSession(access: String, refresh: String) {
        accessToken = access
        refreshToken = refresh
    }

    fun fetchProducts(): List<ProductEntity>? {
        if (!enabled) return null
        val url = URL("$baseUrl/rest/v1/products?select=id,sector_id,name,category,unit,active,favorite&active=eq.true")
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
            (0 until array.length()).map { i ->
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
            true
        } catch (_: Exception) {
            false
        } finally {
            connection.disconnect()
        }
    }

    fun upsertRequest(details: RequestWithDetails): Boolean {
        if (!enabled) return false
        val request = details.request
        val body = JSONObject()
            .put("id", request.id)
            .put("restaurant_unit_id", request.restaurantUnitId)
            .put("sector_id", request.sectorId)
            .put("created_by", request.createdBy)
            .put("priority", request.priority)
            .put("status", request.status)
            .put("notes", request.notes)
            .put("created_at", request.createdAt)
            .put("updated_at", request.updatedAt)
            .put("synced_at", System.currentTimeMillis())
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
        if (items.length() > 0 && !post("replenishment_request_items", items)) return false

        val events = JSONArray()
        details.events.forEach { event ->
            events.put(
                JSONObject()
                    .put("id", event.id)
                    .put("request_id", event.requestId)
                    .put("status", event.status)
                    .put("message", event.message)
                    .put("user_id", event.userId)
                    .put("created_at", event.createdAt)
            )
        }
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
