package com.example.barreplenishment.core.sync

import com.example.barreplenishment.core.data.BarRepository
import com.example.barreplenishment.core.network.SupabaseClient

class SyncManager(
    private val repository: BarRepository,
    private val supabase: SupabaseClient
) {
    suspend fun syncWaitingUploads(): Int {
        if (!supabase.enabled) return 0
        var synced = 0
        repository.waitingUpload().forEach { details ->
            if (supabase.upsertRequest(details)) {
                repository.markSynced(details.request.id)
                synced++
            }
        }
        return synced
    }
}
