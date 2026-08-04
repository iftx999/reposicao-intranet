package com.example.barreplenishment.core.data

import com.example.barreplenishment.core.database.ProductEntity
import com.example.barreplenishment.core.database.ReplenishmentRequestEntity
import com.example.barreplenishment.core.database.ReplenishmentRequestItemEntity
import com.example.barreplenishment.core.database.RequestStatusEventEntity

data class RequestWithDetails(
    val request: ReplenishmentRequestEntity,
    val items: List<ReplenishmentRequestItemEntity>,
    val events: List<RequestStatusEventEntity>
)

data class CartLine(
    val product: ProductEntity,
    val quantity: Int
)

object RequestStatus {
    const val Pending = "pending"
    const val InSeparation = "in_separation"
    const val Replenished = "replenished"
    const val Cancelled = "cancelled"
}

object SyncState {
    const val Synced = "synced"
    const val WaitingUpload = "waiting_upload"
}
