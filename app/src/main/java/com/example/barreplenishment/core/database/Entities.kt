package com.example.barreplenishment.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val sectorId: String,
    val name: String,
    val category: String,
    val unit: String,
    val active: Boolean,
    val favorite: Boolean
)

@Entity(tableName = "replenishment_requests")
data class ReplenishmentRequestEntity(
    @PrimaryKey val id: String,
    val restaurantUnitId: String,
    val sectorId: String,
    val createdBy: String,
    val priority: String,
    val status: String,
    val notes: String,
    val createdAt: Long,
    val updatedAt: Long,
    val syncedAt: Long?,
    val syncState: String
)

@Entity(tableName = "replenishment_request_items", primaryKeys = ["id"])
data class ReplenishmentRequestItemEntity(
    val id: String,
    val requestId: String,
    val productId: String,
    val productName: String,
    val quantity: Int,
    val unit: String,
    val notes: String = ""
)

@Entity(tableName = "request_status_events", primaryKeys = ["id"])
data class RequestStatusEventEntity(
    val id: String,
    val requestId: String,
    val status: String,
    val message: String,
    val userId: String,
    val createdAt: Long
)
