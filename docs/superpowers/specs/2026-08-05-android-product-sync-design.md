# Android app: real product sync + fix broken request sync

## Context (investigation findings)

After wiring real Supabase Auth (previous spec), testing on a real device showed requests still never reach Supabase (`GET /rest/v1/replenishment_requests` returns `[]` even after creating one in the app). Two separate, pre-existing bugs, unrelated to auth, are the cause:

1. **`BarRepository.createRequest()`** generates the request's `id` as `"BAR-" + timestamp` (e.g. `"BAR-1234567"`) — not a valid UUID. `replenishment_requests.id` in Postgres is `uuid`. Every insert has always been rejected at the database level (invalid UUID syntax), regardless of auth. Item/event ids already use `UUID.randomUUID().toString()` correctly — only the request's own id is wrong.
2. **Products in the app are hardcoded local seed data** (`BarRepository.seedProducts()`, ids `"p1"`..`"p10"`) — never fetched from Supabase. `replenishment_request_items.product_id` has `references public.products(id)` — a real FK. Even after fixing bug 1, item inserts would still fail because `"p1"` matches no row in the remote `products` table.

User's directive: fix both, and make the app's product catalog reflect what's managed in the intranet (Produtos screen) — "o que tem na intranet tem que refletir no app."

## Design

- **`SupabaseClient.fetchProducts(): List<ProductEntity>?`** — `GET {baseUrl}/rest/v1/products?select=id,sector_id,name,category,unit,active,favorite&active=eq.true`, authenticated the same way as uploads (`Authorization: Bearer ${accessToken ?: anonKey}`) so RLS scopes it to the signed-in user's company automatically. Returns `null` on any failure (network, non-2xx, parse) so callers can fall back gracefully; returns the list directly as `ProductEntity` (matching this codebase's existing style of the network layer constructing domain/Room types directly, as `upsertRequest` already does with `RequestWithDetails`).
- **`BarRepository.replaceProducts(products)`** — replaces the local product cache wholesale inside a transaction (delete-all then insert). Guarded against an empty list so a transient empty/failed fetch never wipes an already-populated local cache.
- **`SyncManager.downloadProducts(): Boolean`** — the read-direction counterpart to the existing `syncWaitingUploads()` (the write direction). Fetches remote products and replaces the local cache; returns whether it succeeded.
- **`MainActivity`'s `refresh()`** calls `syncManager.downloadProducts()` on every refresh cycle (same cadence it already calls `syncWaitingUploads()`), so the catalog stays current with the intranet whenever the device is online and authenticated. `seedIfNeeded()` (hardcoded fallback) stays as-is for the pure-offline first-run case.
- **`BarRepository.createRequest()`**: `id` becomes `UUID.randomUUID().toString()`.
- **`BarScreens.kt`** display sites (`DetailScreen`, `RequestCard`) that currently show the raw request id to the user get a small `requestCode(id)` helper (`"BAR-" + last 7 chars of the UUID, uppercased`) instead, preserving the short human-friendly reference the UI already had — only the underlying id sent to Supabase changes, not what the user sees.

## Out of scope

Sectors are not separately fetched/managed in the app in this pass — `ProductEntity.sectorId` just stores whatever UUID string the remote `products.sector_id` has (opaque to the app, no local FK enforcement since Room has none defined on that column today). A dedicated Setores screen in the app, if ever wanted, is a future change. Deleting/editing products from the app (still read-only catalog, same as before). Any offline-queue product edits.

## Verification

Same constraint as before: Codex cannot run Gradle (no network for dependency resolution). The orchestrator runs `gradlew assembleDebug`, installs on the connected device/emulator via `adb install -r`, and drives an end-to-end test (create a request in the app, confirm it lands in `replenishment_requests`/`replenishment_request_items` via a REST check, confirm the product catalog shown in the app matches what's in the intranet's Produtos screen).
