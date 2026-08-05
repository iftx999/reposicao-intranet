package com.example.barreplenishment.core.data

import androidx.room.withTransaction
import com.example.barreplenishment.core.database.AppDatabase
import com.example.barreplenishment.core.database.ProductEntity
import com.example.barreplenishment.core.database.ReplenishmentRequestEntity
import com.example.barreplenishment.core.database.ReplenishmentRequestItemEntity
import com.example.barreplenishment.core.database.RequestStatusEventEntity
import java.util.UUID

class BarRepository(private val db: AppDatabase) {
    private val productDao = db.productDao()
    private val requestDao = db.requestDao()

    suspend fun seedIfNeeded() {
        if (productDao.count() > 0) return
        productDao.upsertAll(seedProducts())
    }

    suspend fun replaceProducts(products: List<ProductEntity>) {
        if (products.isEmpty()) return
        db.withTransaction {
            productDao.deleteAll()
            productDao.upsertAll(products)
        }
    }

    suspend fun products(category: String = "Todos", query: String = ""): List<ProductEntity> {
        val base = if (category == "Todos") productDao.activeProducts() else productDao.productsByCategory(category)
        return if (query.isBlank()) base else base.filter { it.name.contains(query, ignoreCase = true) }
    }

    suspend fun favorites(): List<ProductEntity> = productDao.favorites()

    suspend fun requests(status: String? = null): List<RequestWithDetails> {
        val rows = if (status == null) requestDao.allRequests() else requestDao.requestsByStatus(status)
        return rows.map { request -> details(request) }
    }

    suspend fun request(id: String): RequestWithDetails? {
        val request = requestDao.requestById(id) ?: return null
        return details(request)
    }

    suspend fun countByStatus(status: String): Int = requestDao.countByStatus(status)

    suspend fun waitingUpload(): List<RequestWithDetails> = requestDao.waitingUpload().map { details(it) }

    suspend fun createRequest(createdBy: String, priority: String, notes: String, lines: List<CartLine>, online: Boolean): String {
        require(lines.isNotEmpty()) { "Uma solicitação precisa ter pelo menos um item." }
        val now = System.currentTimeMillis()
        val id = UUID.randomUUID().toString()
        val request = ReplenishmentRequestEntity(
            id = id,
            restaurantUnitId = "main",
            sectorId = "bar",
            createdBy = createdBy.ifBlank { "responsável_bar" },
            priority = priority,
            status = RequestStatus.Pending,
            notes = notes,
            createdAt = now,
            updatedAt = now,
            syncedAt = null,
            syncState = SyncState.WaitingUpload
        )
        val items = lines.map { line ->
            require(line.quantity > 0) { "Quantidade deve ser maior que zero." }
            ReplenishmentRequestItemEntity(
                id = UUID.randomUUID().toString(),
                requestId = id,
                productId = line.product.id,
                productName = line.product.name,
                quantity = line.quantity,
                unit = line.product.unit
            )
        }
        db.withTransaction {
            requestDao.upsertRequest(request)
            requestDao.upsertItems(items)
            requestDao.upsertEvent(event(id, RequestStatus.Pending, "Solicitação criada", request.createdBy, now))
        }
        return id
    }

    suspend fun updateStatus(id: String, status: String, user: String, online: Boolean) {
        val now = System.currentTimeMillis()
        val message = when (status) {
            RequestStatus.InSeparation -> "Separação iniciada"
            RequestStatus.Replenished -> "Reposição concluída"
            RequestStatus.Cancelled -> "Solicitação cancelada"
            else -> "Status atualizado"
        }
        db.withTransaction {
            requestDao.updateStatus(
                id = id,
                status = status,
                updatedAt = now,
                syncState = SyncState.WaitingUpload,
                syncedAt = null
            )
            requestDao.upsertEvent(event(id, status, message, user.ifBlank { "responsável_bar" }, now))
        }
    }

    suspend fun markSynced(id: String) = requestDao.markSynced(id, System.currentTimeMillis())

    private suspend fun details(request: ReplenishmentRequestEntity): RequestWithDetails = RequestWithDetails(
        request = request,
        items = requestDao.itemsFor(request.id),
        events = requestDao.eventsFor(request.id)
    )

    private fun event(requestId: String, status: String, message: String, user: String, now: Long) = RequestStatusEventEntity(
        id = UUID.randomUUID().toString(),
        requestId = requestId,
        status = status,
        message = message,
        userId = user,
        createdAt = now
    )

    private fun seedProducts() = listOf(
        ProductEntity("p1", "bar", "Gin", "Bebidas", "garrafa", true, true),
        ProductEntity("p2", "bar", "Vodka", "Bebidas", "garrafa", true, true),
        ProductEntity("p3", "bar", "Água tônica", "Bebidas", "cx", true, true),
        ProductEntity("p4", "bar", "Gelo cubo", "Gelo", "saco", true, true),
        ProductEntity("p5", "bar", "Limão tahiti", "Frutas", "kg", true, false),
        ProductEntity("p6", "bar", "Hortela", "Frutas", "maço", true, false),
        ProductEntity("p7", "bar", "Canudo", "Descartaveis", "pct", true, false),
        ProductEntity("p8", "bar", "Guardanapo", "Descartaveis", "pct", true, false),
        ProductEntity("p9", "bar", "Açúcar refinado", "Insumos", "kg", true, false),
        ProductEntity("p10", "bar", "Xarope simples", "Insumos", "L", true, false)
    )
}

