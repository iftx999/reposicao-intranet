# Android Real Auth Implementation Plan

> **For agentic workers:** Executed by the Codex subagent (`codex:codex-rescue`), handed off by the orchestrating Claude session — NOT via `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Codex writes the Kotlin only; it cannot run a Gradle build (no network for dependency resolution). The orchestrator runs `gradlew assembleDebug` for the actual compile check after each task.

**Goal:** Replace the Android app's fake local login with real Supabase Auth so its uploads carry an authenticated user's JWT, satisfying the multi-tenant RLS added in Phase 1.

**Architecture:** `SupabaseClient` gains sign-in/refresh methods and uses the resulting access token (falling back to the anon key only when signed out) for its existing upload calls. `MainActivity` wires the login form to it and persists the session.

**Tech Stack:** Kotlin, Android (Jetpack Compose), `java.net.HttpURLConnection` + `org.json` (matching the existing code's style — no new Gradle dependencies).

## Global Constraints

- No new Gradle dependencies (stay with `HttpURLConnection`/`org.json`, matching the existing `SupabaseClient.kt` style).
- No changes to `products`/`sectors` local tables or any Setores/Estoque behavior — confirmed out of scope by the spec's investigation.
- Do not commit from Codex tasks — the orchestrator reviews and commits after `gradlew assembleDebug` passes.
- Codex must not attempt `gradlew`/Gradle builds — no network for dependency resolution in its sandbox. It writes code and reports; the orchestrator compiles.

---

### Task 1: Add sign-in/refresh to SupabaseClient

**Files:**
- Modify: `app/src/main/java/com/example/barreplenishment/core/network/SupabaseClient.kt`

**Interfaces:**
- Produces: `sealed class AuthResult` with `Success(accessToken: String, refreshToken: String, userId: String, userEmail: String)` and `Failure(message: String)` variants; `SupabaseClient.signIn(email: String, password: String): AuthResult`; `SupabaseClient.restoreSession(access: String, refresh: String)`. Consumed by Task 2.

- [ ] **Step 1:** Replace the entire file content with:

```kotlin
package com.example.barreplenishment.core.network

import com.example.barreplenishment.BuildConfig
import com.example.barreplenishment.core.data.RequestWithDetails
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
```

- [ ] **Step 2:** Do not attempt a Gradle build (no network in this sandbox). Report the file was written with this exact content. Do not commit.

---

### Task 2: Wire real login into MainActivity and LoginScreen

**Executor:** Codex. Depends on Task 1 being committed first (consumes `AuthResult`).

**Files:**
- Modify: `app/src/main/java/com/example/barreplenishment/MainActivity.kt`
- Modify: `app/src/main/java/com/example/barreplenishment/features/home/BarScreens.kt`

- [ ] **Step 1:** In `MainActivity.kt`, add the import:
```kotlin
import com.example.barreplenishment.core.network.AuthResult
```
(right after the existing `import com.example.barreplenishment.core.network.SupabaseClient`)

- [ ] **Step 2:** Change:
```kotlin
    val syncManager = remember { SyncManager(repository, SupabaseClient()) }
```
to:
```kotlin
    val supabaseClient = remember {
        SupabaseClient().apply {
            val savedAccess = prefs.getString("access_token", null)
            val savedRefresh = prefs.getString("refresh_token", null)
            if (savedAccess != null && savedRefresh != null) {
                restoreSession(savedAccess, savedRefresh)
            }
        }
    }
    val syncManager = remember { SyncManager(repository, supabaseClient) }
```

- [ ] **Step 3:** Add two state variables right after the existing `var password by remember { mutableStateOf("") }` line:
```kotlin
    var authError by remember { mutableStateOf("") }
    var authLoading by remember { mutableStateOf(false) }
```

- [ ] **Step 4:** Replace the `onLogin` handler. Change:
```kotlin
                onLogin = {
                    if (user.isBlank() || password.isBlank()) toast(context, "Preencha usuario e senha.")
                    else {
                        prefs.edit().putBoolean("logged_in", true).putString("user_name", user).apply()
                        loggedIn = true
                    }
                }
```
to:
```kotlin
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
```

- [ ] **Step 5:** Pass the new state into `LoginScreen`. Change:
```kotlin
            LoginScreen(
                user = user,
                password = password,
                onUser = { user = it },
                onPassword = { password = it },
                onLogin = {
```
to:
```kotlin
            LoginScreen(
                user = user,
                password = password,
                onUser = { user = it },
                onPassword = { password = it },
                error = authError,
                loading = authLoading,
                onLogin = {
```
(keep everything else about the `onLogin = { ... }` block exactly as replaced in Step 4 — this just adds two named arguments before it)

- [ ] **Step 6:** In `BarScreens.kt`, add `error`/`loading` parameters to `LoginScreen` and surface them. Change:
```kotlin
@Composable
fun LoginScreen(
    user: String,
    password: String,
    onUser: (String) -> Unit,
    onPassword: (String) -> Unit,
    onLogin: () -> Unit
) {
```
to:
```kotlin
@Composable
fun LoginScreen(
    user: String,
    password: String,
    onUser: (String) -> Unit,
    onPassword: (String) -> Unit,
    onLogin: () -> Unit,
    error: String = "",
    loading: Boolean = false
) {
```

- [ ] **Step 7:** In the same file, show the error and reflect loading state on the button. Change:
```kotlin
                    Gap(18)
                    PrimaryButton("Entrar no BAR", Lime, Graphite, onLogin)
                }
            }
        }
    }
}
```
to:
```kotlin
                    if (error.isNotBlank()) {
                        Gap(10)
                        Text(error, color = Coral, style = MaterialTheme.typography.bodyMedium)
                    }
                    Gap(18)
                    PrimaryButton(if (loading) "Entrando..." else "Entrar no BAR", Lime, Graphite, onLogin)
                }
            }
        }
    }
}
```
If `Coral` is not already imported in this file from `com.example.barreplenishment.core.ui` (check the existing `import com.example.barreplenishment.core.ui.Soda` line and neighbors), add `import com.example.barreplenishment.core.ui.Coral` next to it — the intranet's Tailwind palette has a `coral` color and this Android UI module mirrors the same brand palette (`Graphite`, `Lime`, `Amber`, `Soda` are already imported), so `Coral` should already exist there; if it genuinely does not exist in `core/ui`, use `MaterialTheme.colorScheme.error` instead and report that substitution.

- [ ] **Step 8:** Do not attempt a Gradle build. Report the diffs for both files. Do not commit.

---

### Task 3: Compile verification

**Executor:** Orchestrator only.

- [ ] **Step 1:** Run `gradlew assembleDebug` (or `gradlew.bat assembleDebug` on Windows) from the repo root.

- [ ] **Step 2:** If it fails, read the error, fix it directly (small Kotlin fixes only — if it's a structural problem, stop and report to the user rather than guessing further), and re-run until it passes.

- [ ] **Step 3:** Commit both files together once the build passes.

- [ ] **Step 4:** Report completion. Note to the user that actually signing in on a device/emulator against the live Supabase project is still theirs to verify (no emulator available here).

## Self-Review Notes

- **Spec coverage:** `SupabaseClient` auth methods + token-aware `post()` → Task 1. `MainActivity`/`LoginScreen` wiring → Task 2. Compile check → Task 3.
- **Placeholder scan:** none — all steps have literal file content.
- **Type consistency:** `AuthResult.Success`/`Failure` defined once in Task 1, matched exactly by the `when (result)` branches added in Task 2.
- **Scope discipline:** no changes to `ProductEntity`, `BarRepository.seedProducts()`, or any Sectors/Estoque-related code — confirmed unnecessary by the spec's investigation, not silently dropped.
