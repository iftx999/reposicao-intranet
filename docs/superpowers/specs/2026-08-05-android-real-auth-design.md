# Android app: real Supabase Auth login

## Context (investigation findings, not assumptions)

Before writing this spec, the Android app's code was read directly:

- `MainActivity.kt`'s login is **entirely local**: any non-blank username/password is accepted, stored in `SharedPreferences`, no server call at all.
- `SupabaseClient.kt` (`core/network/SupabaseClient.kt`) uploads to `replenishment_requests`, `replenishment_request_items`, `request_status_events` using **only the anon/publishable key** in the `Authorization` header — never a signed-in user's JWT.
- `products` in the app are **entirely local seed data** (`BarRepository.seedProducts()`), never fetched from or written to the remote `products` table. Sectors (Phase 2) and Estoque (Phase 3) therefore need **zero Android changes** — nothing in the app touches those columns remotely.
- Consequence of Phase 1 (multi-tenant): RLS on `replenishment_requests`/`replenishment_request_items`/`request_status_events` now requires `company_id = current_user_company_id()`, which resolves via `auth.uid()`. A request carrying only the anon key has no `auth.uid()`, so **every upload from the app will be rejected** until it authenticates as a real user.

This spec is scoped to exactly that: replace the fake local login with real Supabase Auth (email/password), and use the resulting user JWT for uploads. Nothing about Setores or Estoque needs to change in the Android codebase.

## Design

**`SupabaseClient.kt`** gains:
- `accessToken`/`refreshToken` mutable fields (in-memory).
- `signIn(email, password): AuthResult` — calls `POST {baseUrl}/auth/v1/token?grant_type=password` (Supabase's standard password-grant endpoint) with the `apikey` header set to the anon key, parses `access_token`/`refresh_token`/`user` from the JSON response. Returns a sealed `AuthResult` (`Success`/`Failure`) rather than throwing, matching the existing code's style of returning booleans/results instead of exceptions for network outcomes.
- `restoreSession(access, refresh)` — lets the app re-hydrate a previously stored session on cold start without forcing a fresh login every time.
- `post()` (the existing private upload helper) sends `Authorization: Bearer ${accessToken ?: anonKey}` instead of always the anon key, and on a `401` response, tries one silent token refresh (`grant_type=refresh_token`) and retries the request once.

**`MainActivity.kt`**:
- The `SupabaseClient` instance is hoisted into a `remember` so both `SyncManager` and the login handler share it, and its session is restored from `SharedPreferences` (`access_token`/`refresh_token` keys, alongside the existing `logged_in`/`user_name`) on first composition.
- `onLogin` calls `supabaseClient.signIn(user, password)` on `Dispatchers.IO` instead of just flipping `loggedIn` to true. On success, tokens are persisted to `SharedPreferences` and `loggedIn` becomes true. On failure, an error message is shown and the user stays on the login screen.

**`LoginScreen` (`BarScreens.kt`)**: gains optional `error`/`loading` parameters to surface the new failure/pending states; defaults keep the function's existing call sites elsewhere (none currently) compiling if any exist.

## Out of scope

Sign-up/registration in the app (accounts are created via the intranet's Empresas/Usuários screens, same as today's assumption that a person already has credentials), token storage hardening (`EncryptedSharedPreferences` — noted as a follow-up, not blocking this fix), Sectors/Estoque features in the app (confirmed above they need no app changes), any change to `products`/`sectors` local tables.

## Verification

Codex cannot run a Gradle build in its sandbox (no network to resolve dependencies, and Android SDK access is unconfirmed there) — it writes the Kotlin only. The orchestrator (who has both the Android SDK installed locally and network access, confirmed via `local.properties` pointing at a real SDK install) runs `gradlew assembleDebug` after Codex's changes land, as the actual compile check.
