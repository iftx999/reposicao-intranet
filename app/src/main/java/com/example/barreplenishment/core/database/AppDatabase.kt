package com.example.barreplenishment.core.database

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RoomDatabase

@Dao
interface ProductDao {
    @Query("SELECT * FROM products WHERE active = 1 ORDER BY favorite DESC, name ASC")
    suspend fun activeProducts(): List<ProductEntity>

    @Query("SELECT * FROM products WHERE active = 1 AND category = :category ORDER BY favorite DESC, name ASC")
    suspend fun productsByCategory(category: String): List<ProductEntity>

    @Query("SELECT * FROM products WHERE favorite = 1 AND active = 1 ORDER BY name ASC")
    suspend fun favorites(): List<ProductEntity>

    @Query("SELECT COUNT(*) FROM products")
    suspend fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(products: List<ProductEntity>)

    @Query("DELETE FROM products")
    suspend fun deleteAll()
}

@Dao
interface RequestDao {
    @Query("SELECT * FROM replenishment_requests ORDER BY createdAt DESC")
    suspend fun allRequests(): List<ReplenishmentRequestEntity>

    @Query("SELECT * FROM replenishment_requests WHERE status = :status ORDER BY createdAt DESC")
    suspend fun requestsByStatus(status: String): List<ReplenishmentRequestEntity>

    @Query("SELECT * FROM replenishment_requests WHERE id = :id LIMIT 1")
    suspend fun requestById(id: String): ReplenishmentRequestEntity?

    @Query("SELECT * FROM replenishment_request_items WHERE requestId = :requestId ORDER BY productName ASC")
    suspend fun itemsFor(requestId: String): List<ReplenishmentRequestItemEntity>

    @Query("SELECT * FROM request_status_events WHERE requestId = :requestId ORDER BY createdAt ASC")
    suspend fun eventsFor(requestId: String): List<RequestStatusEventEntity>

    @Query("SELECT COUNT(*) FROM replenishment_requests WHERE status = :status")
    suspend fun countByStatus(status: String): Int

    @Query("SELECT * FROM replenishment_requests WHERE syncState = 'waiting_upload' ORDER BY createdAt ASC")
    suspend fun waitingUpload(): List<ReplenishmentRequestEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertRequest(request: ReplenishmentRequestEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertItems(items: List<ReplenishmentRequestItemEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertEvent(event: RequestStatusEventEntity)

    @Query("UPDATE replenishment_requests SET status = :status, updatedAt = :updatedAt, syncState = :syncState, syncedAt = :syncedAt WHERE id = :id")
    suspend fun updateStatus(id: String, status: String, updatedAt: Long, syncState: String, syncedAt: Long?)

    @Query("UPDATE replenishment_requests SET syncState = 'synced', syncedAt = :syncedAt WHERE id = :id")
    suspend fun markSynced(id: String, syncedAt: Long)
}

@Database(
    entities = [ProductEntity::class, ReplenishmentRequestEntity::class, ReplenishmentRequestItemEntity::class, RequestStatusEventEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun requestDao(): RequestDao
}
