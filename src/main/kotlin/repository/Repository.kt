package com.newmotion.repository

import com.newmotion.database.*
import com.newmotion.models_dtos.*
import org.jetbrains.exposed.sql.*
import kotlinx.datetime.Clock
import kotlinx.datetime.toLocalDateTime
import kotlinx.datetime.toInstant
import kotlinx.datetime.TimeZone
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.selectAll
import java.math.BigDecimal

// Repository Interfaces
interface CategoryRepository {
    suspend fun findAll(): List<Category>
    suspend fun findById(id: Long): Category?
    suspend fun create(categoryDto: CategoryDto): Category
    suspend fun update(id: Long, categoryDto: CategoryDto): Category?
    suspend fun delete(id: Long): Boolean
}

interface PartRepository {
    suspend fun findAll(): List<Part>
    suspend fun findById(id: Long): Part?
    suspend fun search(query: String): List<Part>
    suspend fun create(request: AddPartRequest): Part
    suspend fun update(id: Long, request: UpdatePartRequest): Part?
    suspend fun delete(id: Long): Boolean
    suspend fun updateStock(partId: Long, newStock: Int): Boolean
    suspend fun findLowStockParts(): List<Part>
    suspend fun existsByPartNumber(partNumber: String): Boolean
    suspend fun findByPartNumber(partNumber: String): Part?
}

// UPDATED: TransactionRepository for multi-item transactions
interface TransactionRepository {
    suspend fun findAll(): List<TransactionTable>
    suspend fun findById(id: Long): TransactionTable?
    suspend fun findByPartId(partId: Long): List<TransactionTable>
    suspend fun create(request: CreateTransactionRequest): TransactionTable
    suspend fun updatePayment(id: Long, request: PaymentUpdateRequest): TransactionTable?
    suspend fun delete(id: Long): Boolean
    suspend fun getFastMovingParts(limit: Int = 10): List<FastMovingPartDto>
}

interface StatsRepository {
    suspend fun getInventoryStats(): InventoryStatsDto
    suspend fun getCategoryStats(): List<CategoryStatsDto>
}

interface UserRepository {
    suspend fun findAll(): List<User>
    suspend fun findById(id: Long): UserDto?
    suspend fun findUserById(id: Long): User?
    suspend fun findByUsername(username: String): User?
    suspend fun findByEmail(email: String): User?
    suspend fun createUser(userDto: UserDto, passwordHash: String): UserDto
    suspend fun updateUser(id: Long, request: UpdateUserRequest): UserDto?
    suspend fun updateLastLogin(id: Long, instant: kotlinx.datetime.Instant): Boolean
    suspend fun deleteUser(id: Long): Boolean
    suspend fun updatePassword(id: Long, newPasswordHash: String): Boolean
    suspend fun getAllUsers(): List<UserDto>
}

interface InvoiceRepository {
    suspend fun findAll(): List<Invoice>
    suspend fun findById(id: Long): Invoice?
    suspend fun findByTransactionId(transactionId: Long): List<Invoice>
    suspend fun findByInvoiceNumber(invoiceNumber: String): Invoice?
    suspend fun delete(id: Long): Boolean
}

// Implementations
class CategoryRepositoryImpl : CategoryRepository {

    override suspend fun findAll(): List<Category> = dbQuery {
        Category.all().toList()
    }

    override suspend fun findById(id: Long): Category? = dbQuery {
        Category.findById(id)
    }

    override suspend fun create(categoryDto: CategoryDto): Category = dbQuery {
        Category.new {
            name = categoryDto.name
            description = categoryDto.description
        }
    }

    override suspend fun update(id: Long, categoryDto: CategoryDto): Category? = dbQuery {
        Category.findById(id)?.apply {
            name = categoryDto.name
            description = categoryDto.description
        }
    }

    override suspend fun delete(id: Long): Boolean = dbQuery {
        Category.findById(id)?.delete() != null
    }
}

class PartRepositoryImpl : PartRepository {

    override suspend fun findAll(): List<Part> = dbQuery {
        Part.all().orderBy(Parts.name to SortOrder.ASC).toList()
    }

    override suspend fun findById(id: Long): Part? = dbQuery {
        Part.findById(id)
    }

    override suspend fun findByPartNumber(partNumber: String): Part? = dbQuery {
        Part.find { Parts.partNumber eq partNumber }.singleOrNull()
    }

    override suspend fun search(query: String): List<Part> = dbQuery {
        val searchQuery = "%${query.trim().lowercase()}%"
        Part.find {
            (Parts.name.lowerCase() like searchQuery) or
                    (Parts.partNumber.lowerCase() like searchQuery) or
                    (Parts.description.lowerCase() like searchQuery) or
                    (Parts.supplier.lowerCase() like searchQuery) or
                    (Parts.machineModels.lowerCase() like searchQuery)
        }.orderBy(Parts.name to SortOrder.ASC).toList()
    }

    override suspend fun create(request: AddPartRequest): Part = dbQuery {
        // Validate that category exists
        val category = Category.findById(request.categoryId)
            ?: throw IllegalArgumentException("Category with id ${request.categoryId} not found")

        // Check if part number already exists
        val existingPart = Part.find { Parts.partNumber eq request.partNumber }.singleOrNull()
        if (existingPart != null) {
            throw IllegalArgumentException("Part with part number '${request.partNumber}' already exists")
        }

        val part = Part.new {
            name = request.name
            description = request.description
            partNumber = request.partNumber
            categoryId = EntityID(request.categoryId, Categories)
            unitPrice = request.unitPrice.toBigDecimal()
            currentStock = request.initialStock
            minimumStock = request.minimumStock
            maxStock = request.maxStock
            location = request.location
            supplier = request.supplier
            machineModels = request.machineModels?.joinToString(",")
            createdAt = Clock.System.now().toLocalDateTime(TimeZone.UTC)
            updatedAt = Clock.System.now().toLocalDateTime(TimeZone.UTC)
        }

        // Create initial stock transaction if there's initial stock
        if (request.initialStock > 0) {
            val totalValue = request.unitPrice * request.initialStock

            val transaction = TransactionTable.new {
                type = TransactionType.IN
                reason = "Initial stock for new part: ${request.name}"
                isPaid = true
                amountPaid = totalValue.toBigDecimal()
                totalAmount = totalValue.toBigDecimal()
                notes = "Automatically created during part creation"
            }

            TransactionItem.new {
                this.transaction = transaction
                this.part = part
                quantity = request.initialStock
                unitPrice = request.unitPrice.toBigDecimal()
                lineTotal = totalValue.toBigDecimal()
            }
        }

        part
    }

    override suspend fun update(id: Long, request: UpdatePartRequest): Part? = dbQuery {
        val part = Part.findById(id) ?: return@dbQuery null

        // Check if part number is being changed and if it conflicts
        request.partNumber?.let { newPartNumber ->
            if (newPartNumber != part.partNumber) {
                val existingPart = Part.find {
                    (Parts.partNumber eq newPartNumber) and (Parts.id neq id)
                }.singleOrNull()

                if (existingPart != null) {
                    throw IllegalArgumentException("Part number '$newPartNumber' is already in use by another part")
                }
            }
        }

        // Validate category if being changed
        request.categoryId?.let { newCategoryId ->
            Category.findById(newCategoryId)
                ?: throw IllegalArgumentException("Category with id $newCategoryId not found")
        }

        part.apply {
            request.name?.let { name = it }
            request.description?.let { description = it }
            request.partNumber?.let { partNumber = it }
            request.categoryId?.let { categoryId = EntityID(it, Categories) }
            request.unitPrice?.let { unitPrice = it.toBigDecimal() }
            request.minimumStock?.let { minimumStock = it }
            request.maxStock?.let { maxStock = it }
            request.location?.let { location = it }
            request.supplier?.let { supplier = it }
            request.machineModels?.let { machineModels = it.joinToString(",") }
            updatedAt = Clock.System.now().toLocalDateTime(TimeZone.UTC)
        }
    }

    override suspend fun delete(id: Long): Boolean = dbQuery {
        try {
            val part = Part.findById(id) ?: return@dbQuery false

            println("Attempting to delete part: ${part.name} (ID: $id, Part Number: ${part.partNumber})")

            // Check current dependencies
            val transactionItemsCount = TransactionItems.selectAll().where { TransactionItems.partId eq id }.count()
            val invoiceItemsCount = InvoiceItems.selectAll().where { InvoiceItems.partId eq id }.count()

            println("Found $transactionItemsCount transaction items and $invoiceItemsCount invoice items referencing this part")

            if (transactionItemsCount > 0 || invoiceItemsCount > 0) {
                println("Part has dependencies. With CASCADE constraints, these should be automatically deleted.")
            }

            // Try to delete the part - CASCADE should handle dependencies automatically
            part.delete()

            println("Successfully deleted part '${part.name}' (ID: $id)")
            true

        } catch (e: Exception) {
            println("Error deleting part with id $id: ${e.message}")
            e.printStackTrace()

            // Fallback: Manual cascade delete if automatic CASCADE fails
            try {
                println("Attempting manual cascade delete for part $id...")

                // Delete dependencies manually
                val deletedInvoiceItems = InvoiceItems.deleteWhere { InvoiceItems.partId eq id }
                println("Manually deleted $deletedInvoiceItems invoice items")

                val deletedTransactionItems = TransactionItems.deleteWhere { TransactionItems.partId eq id }
                println("Manually deleted $deletedTransactionItems transaction items")

                // Now try to delete the part again
                val part = Part.findById(id)
                if (part != null) {
                    part.delete()
                    println("Successfully deleted part after manual cascade")
                    true
                } else {
                    println("Part was already deleted")
                    true
                }

            } catch (fallbackException: Exception) {
                println("Manual cascade delete also failed: ${fallbackException.message}")
                fallbackException.printStackTrace()
                false
            }
        }
    }

    override suspend fun updateStock(partId: Long, newStock: Int): Boolean = dbQuery {
        val part = Part.findById(partId) ?: return@dbQuery false

        val oldStock = part.currentStock
        part.currentStock = newStock
        part.updatedAt = Clock.System.now().toLocalDateTime(TimeZone.UTC)

        // Create stock adjustment transaction
        val transaction = TransactionTable.new {
            type = TransactionType.ADJUSTMENT
            reason = "Stock adjustment: $oldStock → $newStock"
            isPaid = true
            amountPaid = BigDecimal.ZERO
            totalAmount = BigDecimal.ZERO
            notes = "Manual stock adjustment"
        }

        TransactionItem.new {
            this.transaction = transaction
            this.part = part
            quantity = newStock - oldStock // The difference
            unitPrice = part.unitPrice
            lineTotal = part.unitPrice * (newStock - oldStock).toBigDecimal()
        }

        true
    }

    override suspend fun findLowStockParts(): List<Part> = dbQuery {
        Part.find {
            Parts.currentStock lessEq Parts.minimumStock
        }.orderBy(Parts.currentStock to SortOrder.ASC).toList()
    }

    override suspend fun existsByPartNumber(partNumber: String): Boolean = dbQuery {
        Part.find { Parts.partNumber eq partNumber }.count() > 0
    }
}

// Extension functions for additional functionality
suspend fun PartRepository.getStockHistory(partId: Long): List<TransactionItemDto> = dbQuery {
    TransactionItem.find { TransactionItems.partId eq partId }
        .orderBy(TransactionItems.createdAt to SortOrder.DESC)
        .map { it.toDto() }
}

suspend fun PartRepository.getPartsByCategory(categoryId: Long): List<Part> = dbQuery {
    Part.find { Parts.categoryId eq categoryId }
        .orderBy(Parts.name to SortOrder.ASC)
        .toList()
}

suspend fun PartRepository.bulkUpdateStock(updates: List<Pair<Long, Int>>): Boolean = dbQuery {
    try {
        updates.forEach { (partId, newStock) ->
            val part = Part.findById(partId)
                ?: throw IllegalArgumentException("Part with id $partId not found")

            if (newStock < 0) {
                throw IllegalArgumentException("Stock cannot be negative for part ${part.name}")
            }

            part.currentStock = newStock
            part.updatedAt = Clock.System.now().toLocalDateTime(TimeZone.UTC)
        }
        true
    } catch (e: Exception) {
        println("Bulk stock update failed: ${e.message}")
        false
    }
}

// Validation helper functions
fun validatePartRequest(request: AddPartRequest) {
    require(request.name.isNotBlank()) { "Part name cannot be blank" }
    require(request.partNumber.isNotBlank()) { "Part number cannot be blank" }
    require(request.unitPrice > 0) { "Unit price must be positive" }
    require(request.initialStock >= 0) { "Initial stock cannot be negative" }
    require(request.minimumStock >= 0) { "Minimum stock cannot be negative" }
    request.maxStock?.let { maxStock ->
        require(maxStock >= request.minimumStock) { "Maximum stock must be greater than or equal to minimum stock" }
    }
}

fun validateUpdateRequest(request: UpdatePartRequest) {
    request.name?.let { require(it.isNotBlank()) { "Part name cannot be blank" } }
    request.partNumber?.let { require(it.isNotBlank()) { "Part number cannot be blank" } }
    request.unitPrice?.let { require(it > 0) { "Unit price must be positive" } }
    request.minimumStock?.let { require(it >= 0) { "Minimum stock cannot be negative" } }
    request.maxStock?.let { maxStock ->
        request.minimumStock?.let { minStock ->
            require(maxStock >= minStock) { "Maximum stock must be greater than or equal to minimum stock" }
        }
    }
}

// UPDATED: TransactionRepositoryImpl for multi-item transactions
class TransactionRepositoryImpl : TransactionRepository {

    override suspend fun findAll(): List<TransactionTable> = dbQuery {
        TransactionTable.all().orderBy(Transactions.createdAt to SortOrder.DESC).toList()
    }

    override suspend fun findById(id: Long): TransactionTable? = dbQuery {
        TransactionTable.findById(id)
    }

    override suspend fun findByPartId(partId: Long): List<TransactionTable> = dbQuery {
        // Find transactions that contain items with the specified partId
        TransactionItem.find { TransactionItems.partId eq partId }
            .map { it.transaction }
            .distinct()
    }

    override suspend fun create(request: CreateTransactionRequest): TransactionTable = dbQuery {
        // 1. Validate all parts exist and have sufficient stock
        val partsData = mutableMapOf<Long, Pair<Part, TransactionPartDto>>()

        request.parts.forEach { partData ->
            val part = Part.findById(partData.partId)
                ?: throw IllegalArgumentException("Part with id ${partData.partId} not found")

            // Check stock for OUT transactions
            if (request.type == TransactionType.OUT) {
                if (part.currentStock < partData.quantity) {
                    throw IllegalArgumentException(
                        "Insufficient stock for part ${part.name}. Available: ${part.currentStock}, Requested: ${partData.quantity}"
                    )
                }
            }

            partsData[partData.partId] = Pair(part, partData)
        }

        // 2. Calculate total amount
        val totalAmount = request.parts.sumOf { partData ->
            val part = partsData[partData.partId]!!.first
            val unitPrice = partData.unitPrice ?: part.unitPrice.toDouble()
            partData.quantity * unitPrice
        }

        // 3. Create the main transaction
        val transaction = TransactionTable.new {
            type = request.type
            recipientName = request.recipientName
            reason = request.reason
            isPaid = request.isPaid
            amountPaid = BigDecimal(request.amountPaid)
            this.totalAmount = BigDecimal(totalAmount)
            currency = request.currency
            notes = request.notes
        }

        // 4. Create transaction items and update stock
        request.parts.forEach { partData ->
            val (part, _) = partsData[partData.partId]!!
            val unitPrice = partData.unitPrice ?: part.unitPrice.toDouble()
            val lineTotal = partData.quantity * unitPrice

            // Update part stock
            when (request.type) {
                TransactionType.IN -> {
                    part.currentStock += partData.quantity
                }
                TransactionType.OUT -> {
                    part.currentStock -= partData.quantity
                }
                TransactionType.ADJUSTMENT -> {
                    // For adjustments, the quantity represents the new stock level
                    part.currentStock = partData.quantity
                }
            }
            part.updatedAt = Clock.System.now().toLocalDateTime(TimeZone.UTC)

            // Create transaction item
            TransactionItem.new {
                this.transaction = transaction
                this.part = part
                quantity = partData.quantity
                this.unitPrice = BigDecimal(unitPrice)
                this.lineTotal = BigDecimal(lineTotal)
            }
        }

        transaction
    }

    override suspend fun updatePayment(id: Long, request: PaymentUpdateRequest): TransactionTable? = dbQuery {
        TransactionTable.findById(id)?.apply {
            amountPaid = request.amountPaid.toBigDecimal()
            isPaid = request.isPaid

            // Update related invoices
            invoices.forEach { invoice ->
                invoice.amountPaid = request.amountPaid.toBigDecimal()
                invoice.isPaid = request.isPaid
            }
        }
    }

    override suspend fun delete(id: Long): Boolean = dbQuery {
        val transaction = TransactionTable.findById(id) ?: return@dbQuery false

        // Reverse stock changes before deleting
        transaction.items.forEach { item ->
            when (transaction.type) {
                TransactionType.IN -> {
                    item.part.currentStock -= item.quantity
                }
                TransactionType.OUT -> {
                    item.part.currentStock += item.quantity
                }
                TransactionType.ADJUSTMENT -> {
                    // For adjustments, we can't really reverse without knowing the previous stock
                    // This would need to be handled based on business rules
                }
            }
            item.part.updatedAt = Clock.System.now().toLocalDateTime(TimeZone.UTC)
        }

        // Delete transaction (cascade will handle items and invoices)
        transaction.delete()
        true
    }

    override suspend fun getFastMovingParts(limit: Int): List<FastMovingPartDto> = dbQuery {
        // Use .select with required columns and aggregates directly
        (TransactionItems innerJoin Parts innerJoin Transactions)
            .select(
                Parts.id,
                Parts.name,
                TransactionItems.quantity.sum(),
                TransactionItems.id.count()
            )
            .where { Transactions.type eq TransactionType.OUT }
            .groupBy(Parts.id, Parts.name)
            .orderBy(TransactionItems.quantity.sum(), SortOrder.DESC)
            .limit(limit)
            .map {
                FastMovingPartDto(
                    partId = it[Parts.id].value,
                    partName = it[Parts.name],
                    totalOutQuantity = (it[TransactionItems.quantity.sum()] ?: 0).toInt(),
                    transactionCount = (it[TransactionItems.id.count()] ?: 0L).toInt(),
                    averagePerMonth = ((it[TransactionItems.quantity.sum()] ?: 0).toDouble() / 12.0)
                )
            }
    }
}

class StatsRepositoryImpl : StatsRepository {

    override suspend fun getInventoryStats(): InventoryStatsDto = dbQuery {
        val totalCategories = Categories.selectAll().count().toInt()
        val totalParts = Parts.selectAll().count().toInt()

        val totalValue = Parts.selectAll().sumOf { row ->
            row[Parts.currentStock] * row[Parts.unitPrice].toDouble()
        }

        val lowStockParts = Part.find { Parts.currentStock lessEq Parts.minimumStock }.toList()

        // Use .select with required columns and aggregates directly
        val fastMovingResult = (TransactionItems innerJoin Parts innerJoin Transactions)
            .select(
                Parts.id,
                Parts.name,
                TransactionItems.quantity.sum(),
                TransactionItems.id.count()
            )
            .where { Transactions.type eq TransactionType.OUT }
            .groupBy(Parts.id, Parts.name)
            .orderBy(TransactionItems.quantity.sum(), SortOrder.DESC)
            .limit(5)
        val fastMovingParts = fastMovingResult.map {
            FastMovingPartDto(
                partId = it[Parts.id].value,
                partName = it[Parts.name],
                totalOutQuantity = (it[TransactionItems.quantity.sum()] ?: 0).toInt(),
                transactionCount = (it[TransactionItems.id.count()] ?: 0L).toInt(),
                averagePerMonth = ((it[TransactionItems.quantity.sum()] ?: 0).toDouble() / 12.0)
            )
        }

        // Get category stats
        val categoryStats = (Categories leftJoin Parts)
            .select(
                Categories.id, Categories.name,
                Parts.id.count(),
                Parts.currentStock.sum(),
                Parts.unitPrice.sum()
            )
            .groupBy(Categories.id, Categories.name)
            .orderBy(Parts.id.count(), SortOrder.DESC)

        val topCategories = categoryStats.take(5).map { row ->
            val categoryId = row[Categories.id].value
            val lowStockCount = Part.find {
                (Parts.categoryId eq categoryId) and (Parts.currentStock lessEq Parts.minimumStock)
            }.count().toInt()

            CategoryStatsDto(
                categoryId = categoryId,
                categoryName = row[Categories.name],
                partCount = row[Parts.id.count()].toInt(),
                totalValue = (row[Parts.currentStock.sum()] ?: 0) * (row[Parts.unitPrice.sum()]?.toDouble() ?: 0.0),
                lowStockCount = lowStockCount
            )
        }

        InventoryStatsDto(
            totalCategories = totalCategories,
            totalParts = totalParts,
            totalValue = totalValue,
            lowStockParts = lowStockParts.map { it.toDto() },
            fastMovingParts = fastMovingParts,
            topCategories = topCategories
        )
    }

    override suspend fun getCategoryStats(): List<CategoryStatsDto> = dbQuery {
        val stats = (Categories leftJoin Parts)
            .select(
                Categories.id, Categories.name,
                Parts.id.count(),
                Parts.currentStock.sum(),
                Parts.unitPrice.sum()
            )
            .groupBy(Categories.id, Categories.name)
            .orderBy(Parts.id.count(), SortOrder.DESC)

        stats.map { row ->
            val categoryId = row[Categories.id].value
            val lowStockCount = Part.find {
                (Parts.categoryId eq categoryId) and (Parts.currentStock lessEq Parts.minimumStock)
            }.count().toInt()

            CategoryStatsDto(
                categoryId = categoryId,
                categoryName = row[Categories.name],
                partCount = row[Parts.id.count()].toInt(),
                totalValue = (row[Parts.currentStock.sum()] ?: 0) * (row[Parts.unitPrice.sum()]?.toDouble() ?: 0.0),
                lowStockCount = lowStockCount
            )
        }
    }
}

class UserRepositoryImpl : UserRepository {

    override suspend fun findAll(): List<User> = dbQuery {
        User.all().toList()
    }

    override suspend fun findById(id: Long): UserDto? = dbQuery {
        User.findById(id)?.toDto()
    }

    override suspend fun findUserById(id: Long): User? = dbQuery {
        User.findById(id)
    }

    override suspend fun findByUsername(username: String): User? = dbQuery {
        User.find { Users.username eq username }.singleOrNull()
    }

    override suspend fun findByEmail(email: String): User? = dbQuery {
        User.find { Users.email eq email }.singleOrNull()
    }

    override suspend fun createUser(userDto: UserDto, passwordHash: String): UserDto = dbQuery {
        User.new {
            username = userDto.username
            email = userDto.email
            this.passwordHash = passwordHash
            fullName = userDto.fullName
            role = userDto.role
            isActive = userDto.isActive
        }.toDto()
    }

    override suspend fun updateUser(id: Long, request: UpdateUserRequest): UserDto? = dbQuery {
        println("Repository updateUser called - ID: $id, request: $request")
        
        val user = User.findById(id)
        if (user == null) {
            println("User not found for ID: $id")
            return@dbQuery null
        }
        
        println("Found user - current isActive: ${user.isActive}")
        
        val updatedUser = user.apply {
            request.email?.let { 
                println("Updating email to: $it")
                email = it 
            }
            request.fullName?.let { 
                println("Updating fullName to: $it")
                fullName = it 
            }
            request.role?.let { 
                println("Updating role to: $it")
                role = it 
            }
            request.isActive?.let { 
                println("Updating isActive from ${this.isActive} to: $it")
                isActive = it 
            }
        }
        
        val result = updatedUser.toDto()
        println("Repository returning user with isActive: ${result.isActive}")
        result
    }

    override suspend fun updateLastLogin(id: Long, instant: kotlinx.datetime.Instant): Boolean = dbQuery {
        User.findById(id)?.apply {
            lastLoginAt = instant.toLocalDateTime(TimeZone.UTC)
        } != null
    }

    override suspend fun deleteUser(id: Long): Boolean = dbQuery {
        User.findById(id)?.delete() != null
    }

    override suspend fun updatePassword(id: Long, newPasswordHash: String): Boolean = dbQuery {
        User.findById(id)?.let { user ->
            user.passwordHash = newPasswordHash
            true
        } ?: false
    }

    override suspend fun getAllUsers(): List<UserDto> = dbQuery {
        User.all().map { it.toDto() }
    }
}

class InvoiceRepositoryImpl : InvoiceRepository {

    override suspend fun findAll(): List<Invoice> = dbQuery {
        Invoice.all().toList()
    }

    override suspend fun findById(id: Long): Invoice? = dbQuery {
        Invoice.findById(id)
    }

    override suspend fun findByTransactionId(transactionId: Long): List<Invoice> = dbQuery {
        Invoice.find { Invoices.transactionId eq transactionId }.toList()
    }

    override suspend fun findByInvoiceNumber(invoiceNumber: String): Invoice? = dbQuery {
        Invoice.find { Invoices.invoiceNumber eq invoiceNumber }.singleOrNull()
    }

    override suspend fun delete(id: Long): Boolean = dbQuery {
        Invoice.findById(id)?.delete() != null
    }
}

// Extension functions to convert entities to DTOs
fun Category.toDto(): CategoryDto {
    return CategoryDto(
        id = this.id.value,
        name = this.name,
        description = this.description,
        createdAt = this.createdAt.toInstant(TimeZone.UTC)
    )
}

fun Part.toDto(): PartDto {
    return PartDto(
        id = this.id.value,
        name = this.name,
        description = this.description,
        partNumber = this.partNumber,
        categoryId = this.categoryId.value,
        categoryName = try {
            this.category.name
        } catch (e: Exception) {
            null
        },
        unitPrice = this.unitPrice.toDouble(),
        currentStock = this.currentStock,
        minimumStock = this.minimumStock,
        maxStock = this.maxStock,
        location = this.location,
        supplier = this.supplier,
        machineModels = this.machineModels?.split(',')?.map { it.trim() }?.filter { it.isNotEmpty() },
        createdAt = this.createdAt.toInstant(TimeZone.UTC),
        updatedAt = this.updatedAt.toInstant(TimeZone.UTC)
    )
}

fun TransactionTable.toDto(): TransactionDto {
    return TransactionDto(
        id = this.id.value,
        type = this.type,
        recipientName = this.recipientName,
        reason = this.reason,
        isPaid = this.isPaid,
        amountPaid = this.amountPaid.toDouble(),
        totalAmount = this.totalAmount.toDouble(),
        transactionDate = this.transactionDate.toInstant(TimeZone.UTC),
        notes = this.notes,
        currency = this.currency,
        items = this.items.map { it.toDto() }
    )
}

fun TransactionItem.toDto(): TransactionItemDto {
    return TransactionItemDto(
        id = this.id.value,
        transactionId = this.transaction.id.value,
        partId = this.part.id.value,
        partName = this.part.name,
        partNumber = this.part.partNumber,
        quantity = this.quantity,
        unitPrice = this.unitPrice.toDouble(),
        lineTotal = this.lineTotal.toDouble()
    )
}

fun User.toDto(): UserDto {
    return UserDto(
        id = this.id.value,
        username = this.username,
        email = this.email,
        fullName = this.fullName,
        role = this.role,
        isActive = this.isActive,
        createdAt = this.createdAt.toInstant(TimeZone.UTC),
        lastLoginAt = this.lastLoginAt?.toInstant(TimeZone.UTC)
    )
}

fun PartDto.toStaffDto(): PartDtoStaff {
    return PartDtoStaff(
        id = this.id,
        name = this.name,
        description = this.description,
        partNumber = this.partNumber,
        categoryId = this.categoryId,
        categoryName = this.categoryName,
        currentStock = this.currentStock,
        minimumStock = this.minimumStock,
        maxStock = this.maxStock,
        location = this.location,
        supplier = this.supplier,
        machineModels = this.machineModels,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt
    )
}

fun Invoice.toDto(): InvoiceDto {
    return InvoiceDto(
        id = this.id.value,
        invoiceNumber = this.invoiceNumber,
        transactionId = this.transaction.id.value,
        type = this.type,
        recipientName = this.recipientName,
        reason = this.reason,
        isPaid = this.isPaid,
        amountPaid = this.amountPaid.toDouble(),
        totalAmount = this.totalAmount.toDouble(),
        notes = this.notes,
        createdAt = this.createdAt.toInstant(TimeZone.UTC),
        currency = this.currency,
        companyName = this.companyName,
        companyAddress = this.companyAddress,
        companyPhone = this.companyPhone,
        companyEmail = this.companyEmail,
        licenseNumber = this.licenseNumber,
        items = this.items.map { it.toDto() }
    )
}

fun InvoiceItem.toDto(): InvoiceItemDto {
    return InvoiceItemDto(
        id = this.id.value,
        invoiceId = this.invoice.id.value,
        partId = this.part.id.value,
        partName = this.partName,
        partNumber = this.partNumber,
        quantity = this.quantity,
        unitPrice = this.unitPrice.toDouble(),
        lineTotal = this.lineTotal.toDouble()
    )
}

