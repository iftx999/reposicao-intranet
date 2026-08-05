# Android Product Sync + Request ID Fix Implementation Plan

> **For agentic workers:** Executed by the Codex subagent (`codex:codex-rescue`), handed off by the orchestrating Claude session. Codex writes Kotlin only — no Gradle build (no network in its sandbox). The orchestrator builds, installs on a connected device, and runs the end-to-end test.

**Goal:** Fix the request id format bug and the hardcoded-product-catalog bug so requests created in the Android app actually reach Supabase, and the app's product list reflects the intranet's Produtos screen.

**Architecture:** `SupabaseClient` gains a `fetchProducts()` read call, mirroring the existing `upsertRequest()` write call. `BarRepository`/`SyncManager` gain a download-direction counterpart to the existing upload sync. `MainActivity` calls it every refresh. The request id generator switches to a real UUID; the UI keeps showing a short human-friendly code derived from it.

**Tech Stack:** Kotlin, `java.net.HttpURLConnection` + `org.json` (no new dependencies).

## Global Constraints

- No new Gradle dependencies.
- Do not commit from Codex tasks.
- Codex must not attempt Gradle builds.

---

### Task 1 (parallel-safe, independent file): Add fetchProducts to SupabaseClient

**Files:**
- Modify: `app/src/main/java/com/example/barreplenishment/core/network/SupabaseClient.kt`

**Interfaces:**
- Produces: `SupabaseClient.fetchProducts(): List<ProductEntity>?`. Consumed by Task 5 (SyncManager).

- [ ] **Step 1:** Add the import, right after the existing `import com.example.barreplenishment.core.data.RequestWithDetails`:
```kotlin
import com.example.barreplenishment.core.database.ProductEntity
```

- [ ] **Step 2:** Add this method to the `SupabaseClient` class, right after `restoreSession`:
```kotlin
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
```
(`BufferedReader`/`InputStreamReader` are already imported in this file from the auth work in the previous plan.)

- [ ] **Step 3:** No build possible. Report the diff. Do not commit.

---

### Task 2 (parallel-safe, independent file): Add deleteAll to ProductDao

**Files:**
- Modify: `app/src/main/java/com/example/barreplenishment/core/database/AppDatabase.kt`

**Interfaces:**
- Produces: `ProductDao.deleteAll(): Unit` (suspend). Consumed by Task 4 (BarRepository).

- [ ] **Step 1:** Add this method to the `ProductDao` interface, right after `upsertAll`:
```kotlin
    @Query("DELETE FROM products")
    suspend fun deleteAll()
```

- [ ] **Step 2:** No build possible. Report the diff. Do not commit.

---

### Task 3 (parallel-safe, independent file): Fix request id display in BarScreens

**Files:**
- Modify: `app/src/main/java/com/example/barreplenishment/features/home/BarScreens.kt`

- [ ] **Step 1:** Add a private helper function anywhere at file scope (e.g. right after the `LoginScreen` composable, before `LoginSignal`):
```kotlin
private fun requestCode(id: String): String = "BAR-" + id.takeLast(7).uppercase()
```

- [ ] **Step 2:** In `DetailScreen`, change:
```kotlin
            Text("Detalhe ${details.request.id}", style = MaterialTheme.typography.titleLarge, color = Graphite)
```
to:
```kotlin
            Text("Detalhe ${requestCode(details.request.id)}", style = MaterialTheme.typography.titleLarge, color = Graphite)
```

- [ ] **Step 3:** In `RequestCard`, change:
```kotlin
        Column(Modifier.clickable(onClickLabel = "Abrir solicitação ${details.request.id}") { onOpen(details.request.id) }) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(details.request.id, style = MaterialTheme.typography.titleMedium, color = Graphite)
```
to:
```kotlin
        Column(Modifier.clickable(onClickLabel = "Abrir solicitação ${requestCode(details.request.id)}") { onOpen(details.request.id) }) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(requestCode(details.request.id), style = MaterialTheme.typography.titleMedium, color = Graphite)
```
(`onOpen(details.request.id)` keeps using the real id — only the two `Text`/label displays change to the short code.)

- [ ] **Step 4:** No build possible. Report the diff. Do not commit.

---

### Task 4 (parallel-safe, independent file): Fix request id generation and add replaceProducts to BarRepository

**Files:**
- Modify: `app/src/main/java/com/example/barreplenishment/core/data/BarRepository.kt`

**Interfaces:**
- Produces: `BarRepository.replaceProducts(products: List<ProductEntity>): Unit` (suspend). Consumed by Task 5 (SyncManager). Assumes `ProductDao.deleteAll()` exists (Task 2 — different file, no build dependency for Codex since it can't build anyway; the orchestrator sequences the real compile check after both land).

- [ ] **Step 1:** Change:
```kotlin
        val id = "BAR-" + now.toString().takeLast(7)
```
to:
```kotlin
        val id = UUID.randomUUID().toString()
```
(`UUID` is already imported in this file.)

- [ ] **Step 2:** Add this method anywhere in the `BarRepository` class, e.g. right after `seedIfNeeded`:
```kotlin
    suspend fun replaceProducts(products: List<ProductEntity>) {
        if (products.isEmpty()) return
        db.withTransaction {
            productDao.deleteAll()
            productDao.upsertAll(products)
        }
    }
```

- [ ] **Step 3:** No build possible. Report the diff. Do not commit.

---

### Task 5: Add downloadProducts to SyncManager

**Executor:** Codex. Depends on Tasks 1 and 4 being committed first (consumes `SupabaseClient.fetchProducts()` and `BarRepository.replaceProducts()`).

**Files:**
- Modify: `app/src/main/java/com/example/barreplenishment/core/sync/SyncManager.kt`

- [ ] **Step 1:** Add this method to the `SyncManager` class, right after `syncWaitingUploads`:
```kotlin
    suspend fun downloadProducts(): Boolean {
        val remote = supabase.fetchProducts() ?: return false
        repository.replaceProducts(remote)
        return true
    }
```

- [ ] **Step 2:** No build possible. Report the diff. Do not commit.

---

### Task 6: Call downloadProducts from MainActivity's refresh loop

**Executor:** Codex. Depends on Task 5 being committed first.

**Files:**
- Modify: `app/src/main/java/com/example/barreplenishment/MainActivity.kt`

- [ ] **Step 1:** Change:
```kotlin
                withContext(Dispatchers.IO) {
                    repository.seedIfNeeded()
                    syncManager.syncWaitingUploads()
                    products = repository.products(category, search)
```
to:
```kotlin
                withContext(Dispatchers.IO) {
                    repository.seedIfNeeded()
                    syncManager.downloadProducts()
                    syncManager.syncWaitingUploads()
                    products = repository.products(category, search)
```

- [ ] **Step 2:** No build possible. Report the diff. Do not commit.

---

### Task 7: Compile, install, and end-to-end verification

**Executor:** Orchestrator only.

- [ ] **Step 1:** Run `gradlew assembleDebug` (JDK 17, same as before). Fix any small issues directly; stop and report to the user if something structural comes up.

- [ ] **Step 2:** Commit all six files together once the build passes.

- [ ] **Step 3:** `adb install -r` the new APK on the connected device(s).

- [ ] **Step 4:** Launch the app, log in with a real account, create a replenishment request with at least one item, and confirm via `GET /rest/v1/replenishment_requests` and `GET /rest/v1/replenishment_request_items` (service role key) that it landed with a valid UUID id and a `product_id` matching a real row in `products`.

- [ ] **Step 5:** Confirm the app's product list matches what's in the intranet's Produtos screen for that company (same names/count).

- [ ] **Step 6:** Report the outcome to the user.

## Self-Review Notes

- **Spec coverage:** `fetchProducts` → Task 1. `deleteAll` → Task 2. Display fix → Task 3. id fix + `replaceProducts` → Task 4. `downloadProducts` → Task 5. Wiring into refresh → Task 6. Build/install/e2e → Task 7.
- **Placeholder scan:** none.
- **Type consistency:** `ProductEntity` constructed identically (named args, same field set) in Task 1's `fetchProducts` and the existing `seedProducts()`. `replaceProducts(products: List<ProductEntity>)` signature matches exactly what Task 5's `downloadProducts()` passes it.
- **Task independence:** Tasks 1–4 touch four different files and don't depend on each other's code existing to be *written* (only to eventually compile, which Codex can't check anyway) — safe to dispatch in parallel. Tasks 5 and 6 are genuinely sequential (each consumes the previous task's new method).
