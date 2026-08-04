package com.example.barreplenishment.core.network

import com.example.barreplenishment.BuildConfig
import com.example.barreplenishment.core.data.RequestWithDetails
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class SupabaseClient {
    private val baseUrl: String = BuildConfig.SUPABASE_URL.trimEnd('/')
    private val anonKey: String = BuildConfig.SUPABASE_ANON_KEY
    val enabled: Boolean = baseUrl.isNotBlank() && anonKey.isNotBlank()

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
            items.put(JSONObject()
                .put("id", item.id)
                .put("request_id", item.requestId)
                .put("product_id", item.productId)
                .put("quantity", item.quantity)
                .put("unit", item.unit)
                .put("notes", item.notes))
        }
        if (items.length() > 0 && !post("replenishment_request_items", items)) return false

        val events = JSONArray()
        details.events.forEach { event ->
            events.put(JSONObject()
                .put("id", event.id)
                .put("request_id", event.requestId)
                .put("status", event.status)
                .put("message", event.message)
                .put("user_id", event.userId)
                .put("created_at", event.createdAt))
        }
        return events.length() == 0 || post("request_status_events", events)
    }

    private fun post(table: String, body: JSONArray): Boolean {
        val url = URL("$baseUrl/rest/v1/$table?on_conflict=id")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8000
            readTimeout = 8000
            doOutput = true
            setRequestProperty("apikey", anonKey)
            setRequestProperty("Authorization", "Bearer $anonKey")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Prefer", "resolution=merge-duplicates")
        }
        return try {
            OutputStreamWriter(connection.outputStream).use { it.write(body.toString()) }
            connection.responseCode in 200..299
        } catch (_: Exception) {
            false
        } finally {
            connection.disconnect()
        }
    }
}
