package com.newmotion.services

import com.newmotion.database.*
import com.newmotion.models_dtos.*
import com.newmotion.repository.*
import kotlinx.datetime.toLocalDateTime
import org.jetbrains.exposed.sql.Op
import org.jetbrains.exposed.sql.SqlExpressionBuilder
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.selectAll

// Removed import kotlinx.html.Entities

// Updated interfaces
interface CategoryService {
    suspend fun getAllCategories(): List<CategoryDto>
    suspend fun getCategoryById(id: Long): CategoryDto?
    suspend fun createCategory(categoryDto: CategoryDto): CategoryDto
    suspend fun updateCategory(id: Long, categoryDto: CategoryDto): CategoryDto?
    suspend fun deleteCategory(id: Long): Boolean
}

interface PartService {
    suspend fun getAllParts(): List<PartDto>
    suspend fun getPartById(id: Long): PartDto?
    suspend fun getPartByPartNumber(partNumber: String): PartDto?
    suspend fun searchParts(query: String): List<PartDto>
    suspend fun createPart(request: AddPartRequest): PartDto
    suspend fun updatePart(id: Long, request: UpdatePartRequest): PartDto?
    suspend fun deletePart(id: Long): DeletePartResult
    suspend fun updateStock(partId: Long, newStock: Int): Boolean
    suspend fun getLowStockParts(): List<PartDto>
    suspend fun getPartsByCategory(categoryId: Long): List<PartDto>
    suspend fun getStockHistory(partId: Long): List<TransactionItemDto>
    suspend fun bulkUpdateStock(updates: List<StockUpdateRequest>): BulkUpdateResult
    suspend fun validatePartNumber(partNumber: String, excludeId: Long? = null): Boolean
}
// UPDATED: TransactionService now returns single TransactionWithInvoicesDto
interface TransactionService {
    suspend fun getAllTransactions(): List<TransactionDto>
    suspend fun getTransactionById(id: Long): TransactionDto?
    suspend fun getTransactionsByPartId(partId: Long): List<TransactionDto>

    // UPDATED: Return single transaction instead of list
    suspend fun createTransaction(request: CreateTransactionRequest): TransactionWithInvoicesDto

    suspend fun updatePayment(id: Long, request: PaymentUpdateRequest): TransactionDto?
    suspend fun deleteTransaction(id: Long): Boolean
    suspend fun getFastMovingParts(limit: Int = 10): List<FastMovingPartDto>
}

interface StatsService {
    suspend fun getInventoryStats(): InventoryStatsDto
    suspend fun getCategoryStats(): List<CategoryStatsDto>
}

interface InvoiceService {
    suspend fun getAllInvoices(): List<InvoiceDto>
    suspend fun getInvoiceById(id: Long): InvoiceDto?
    suspend fun getInvoicesByTransactionId(transactionId: Long): List<InvoiceDto>
    suspend fun getInvoiceByNumber(invoiceNumber: String): InvoiceDto?
    suspend fun deleteInvoice(id: Long): Boolean
    suspend fun generateInvoicePDF(invoice: InvoiceDto): ByteArray
    suspend fun generateInvoiceHTML(invoice: InvoiceDto): String
    suspend fun getInvoicePrintData(invoice: InvoiceDto): InvoicePrintData
    suspend fun generateBulkInvoices(request: BulkInvoiceRequest): List<InvoiceDto>
    suspend fun createInvoicesForTransaction(transactionId: Long): List<InvoiceDto>
}


// Service implementations
class PartServiceImpl(
    private val partRepository: PartRepository
) : PartService {

    override suspend fun getAllParts(): List<PartDto> = dbQuery {
        partRepository.findAll().map { it.toDto() }
    }

    override suspend fun getPartById(id: Long): PartDto? = dbQuery {
        partRepository.findById(id)?.toDto()
    }

    override suspend fun getPartByPartNumber(partNumber: String): PartDto? = dbQuery {
        partRepository.findByPartNumber(partNumber)?.toDto()
    }

    override suspend fun searchParts(query: String): List<PartDto> = dbQuery {
        if (query.isBlank()) {
            partRepository.findAll().map { it.toDto() }
        } else {
            partRepository.search(query).map { it.toDto() }
        }
    }

    override suspend fun createPart(request: AddPartRequest): PartDto = dbQuery {
        // Validate the request
        validatePartRequest(request)

        // Check if part number already exists
        if (partRepository.existsByPartNumber(request.partNumber)) {
            throw IllegalArgumentException("Part with part number '${request.partNumber}' already exists")
        }

        val part = partRepository.create(request)
        part.toDto()
    }

    override suspend fun updatePart(id: Long, request: UpdatePartRequest): PartDto? = dbQuery {
        // Validate the request
        validateUpdateRequest(request)

        // Check if part number conflicts (if being changed)
        request.partNumber?.let { newPartNumber ->
            val existingPart = partRepository.findByPartNumber(newPartNumber)
            if (existingPart != null && existingPart.id.value != id) {
                throw IllegalArgumentException("Part number '$newPartNumber' is already in use")
            }
        }

        partRepository.update(id, request)?.toDto()
    }

    override suspend fun deletePart(id: Long): DeletePartResult {
        return try {
            // First check if part exists
            val part = partRepository.findById(id)
            if (part == null) {
                return DeletePartResult(
                    success = false,
                    message = "Part with id $id not found",
                    errorType = DeleteErrorType.NOT_FOUND
                )
            }

            // Check dependencies before deletion
            val (transactionItemsCount, invoiceItemsCount) = dbQuery {
                val txItems = TransactionItems.selectAll().where { TransactionItems.partId eq id }.count()
                val invItems = InvoiceItems.selectAll().where { InvoiceItems.partId eq id }.count()
                Pair(txItems, invItems)
            }

            val totalDependencies = transactionItemsCount + invoiceItemsCount

            // Attempt deletion
            val success = partRepository.delete(id)

            if (success) {
                DeletePartResult(
                    success = true,
                    message = buildString {
                        append("Part '${part.name}' deleted successfully")
                        if (totalDependencies > 0) {
                            append(" (removed $totalDependencies dependent records)")
                        }
                    },
                    errorType = null,
                    dependenciesRemoved = totalDependencies.toInt()
                )
            } else {
                DeletePartResult(
                    success = false,
                    message = "Failed to delete part '${part.name}' due to database constraints",
                    errorType = DeleteErrorType.CONSTRAINT_VIOLATION,
                    dependenciesFound = totalDependencies.toInt()
                )
            }

        } catch (e: Exception) {
            DeletePartResult(
                success = false,
                message = "Error deleting part: ${e.message}",
                errorType = DeleteErrorType.SYSTEM_ERROR
            )
        }
    }

    override suspend fun updateStock(partId: Long, newStock: Int): Boolean {
        return try {
            if (newStock < 0) {
                throw IllegalArgumentException("Stock cannot be negative")
            }
            partRepository.updateStock(partId, newStock)
        } catch (e: Exception) {
            println("Error updating stock for part $partId: ${e.message}")
            false
        }
    }

    override suspend fun getLowStockParts(): List<PartDto> = dbQuery {
        partRepository.findLowStockParts().map { it.toDto() }
    }

    override suspend fun getPartsByCategory(categoryId: Long): List<PartDto> = dbQuery {
        partRepository.getPartsByCategory(categoryId).map { it.toDto() }
    }

    override suspend fun getStockHistory(partId: Long): List<TransactionItemDto> {
        return partRepository.getStockHistory(partId)
    }

    override suspend fun bulkUpdateStock(updates: List<StockUpdateRequest>): BulkUpdateResult {
        return try {
            val results = mutableListOf<StockUpdateResult>()
            var successCount = 0
            var failureCount = 0

            updates.forEach { update ->
                try {
                    val success = updateStock(update.partId, update.newStock)
                    if (success) {
                        successCount++
                        results.add(StockUpdateResult(update.partId, true, null))
                    } else {
                        failureCount++
                        results.add(StockUpdateResult(update.partId, false, "Update failed"))
                    }
                } catch (e: Exception) {
                    failureCount++
                    results.add(StockUpdateResult(update.partId, false, e.message))
                }
            }

            BulkUpdateResult(
                totalRequests = updates.size,
                successCount = successCount,
                failureCount = failureCount,
                results = results
            )
        } catch (e: Exception) {
            BulkUpdateResult(
                totalRequests = updates.size,
                successCount = 0,
                failureCount = updates.size,
                results = updates.map {
                    StockUpdateResult(it.partId, false, "Bulk operation failed: ${e.message}")
                }
            )
        }
    }

    override suspend fun validatePartNumber(partNumber: String, excludeId: Long?): Boolean {
        return try {
            val existingPart = partRepository.findByPartNumber(partNumber)
            existingPart == null || (excludeId != null && existingPart.id.value == excludeId)
        } catch (e: Exception) {
            false
        }
    }
}

// Service helper functions
private fun validatePartRequest(request: AddPartRequest) {
    require(request.name.isNotBlank()) { "Part name cannot be blank" }
    require(request.partNumber.isNotBlank()) { "Part number cannot be blank" }
    require(request.unitPrice > 0) { "Unit price must be positive" }
    require(request.initialStock >= 0) { "Initial stock cannot be negative" }
    require(request.minimumStock >= 0) { "Minimum stock cannot be negative" }
    request.maxStock?.let { maxStock ->
        require(maxStock >= request.minimumStock) { "Maximum stock must be greater than or equal to minimum stock" }
    }
}

private fun validateUpdateRequest(request: UpdatePartRequest) {
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

// UPDATED: TransactionServiceImpl for multi-item transactions
class TransactionServiceImpl(
    private val transactionRepository: TransactionRepository,
    private val partRepository: PartRepository,
    private val invoiceRepository: InvoiceRepository
) : TransactionService {

    override suspend fun createTransaction(request: CreateTransactionRequest): TransactionWithInvoicesDto = dbQuery {
        // Create the transaction using the repository
        val transaction = transactionRepository.create(request)

        // Create invoices for OUT transactions
        val invoices = if (request.type == TransactionType.OUT) {
            createInvoicesForTransactionInternal(transaction)
        } else {
            emptyList()
        }

        TransactionWithInvoicesDto(
            transaction = transaction.toDto(),
            invoices = invoices.map { it.toDto() }
        )
    }

    /**
     * Creates both customer and company invoice copies for the given transaction
     * using its associated line items.
     */
    private fun createInvoicesForTransactionInternal(transaction: TransactionTable): List<Invoice> {
        return listOf(
            // Customer copy
            Invoice.new {
                invoiceNumber = generateInvoiceNumber()
                this.transaction = transaction
                type = InvoiceType.CUSTOMER_COPY
                recipientName = transaction.recipientName
                reason = transaction.reason
                isPaid = transaction.isPaid
                amountPaid = transaction.amountPaid
                totalAmount = transaction.totalAmount
                currency = transaction.currency
                notes = transaction.notes
            }.also { invoice ->
                // Create invoice items based on transaction
                transaction.items.forEach { transactionItem ->
                    InvoiceItem.new {
                        this.invoice = invoice
                        part = transactionItem.part
                        partName = transactionItem.part.name
                        partNumber = transactionItem.part.partNumber
                        quantity = transactionItem.quantity
                        unitPrice = transactionItem.unitPrice
                        lineTotal = transactionItem.lineTotal
                    }
                }
            },

            // Company copy
            Invoice.new {
                invoiceNumber = generateInvoiceNumber()
                this.transaction = transaction
                type = InvoiceType.COMPANY_COPY
                recipientName = transaction.recipientName
                reason = transaction.reason
                isPaid = transaction.isPaid
                amountPaid = transaction.amountPaid
                totalAmount = transaction.totalAmount
                currency = transaction.currency
                notes = transaction.notes
            }.also { invoice ->
                transaction.items.forEach { transactionItem ->
                    InvoiceItem.new {
                        this.invoice = invoice
                        part = transactionItem.part
                        partName = transactionItem.part.name
                        partNumber = transactionItem.part.partNumber
                        quantity = transactionItem.quantity
                        unitPrice = transactionItem.unitPrice
                        lineTotal = transactionItem.lineTotal
                    }
                }
            }
        )
    }

    /**
     * Generates a unique invoice number using current timestamp and random digits.
     */
    private fun generateInvoiceNumber(): String {
        val timestamp = System.currentTimeMillis()
        val random = (1000..9999).random()
        return "INV-$timestamp-$random"
    }

    override suspend fun getAllTransactions(): List<TransactionDto> = dbQuery {
        transactionRepository.findAll().map { it.toDto() }
    }

    override suspend fun getTransactionById(id: Long): TransactionDto? = dbQuery {
        transactionRepository.findById(id)?.toDto()
    }

    override suspend fun getTransactionsByPartId(partId: Long): List<TransactionDto> = dbQuery {
        transactionRepository.findByPartId(partId).map { it.toDto() }
    }

    override suspend fun updatePayment(id: Long, request: PaymentUpdateRequest): TransactionDto? = dbQuery {
        transactionRepository.updatePayment(id, request)?.toDto()
    }

    override suspend fun deleteTransaction(id: Long): Boolean {
        return transactionRepository.delete(id)
    }

    override suspend fun getFastMovingParts(limit: Int): List<FastMovingPartDto> {
        return transactionRepository.getFastMovingParts(limit)
    }
}

class CategoryServiceImpl(
    private val categoryRepository: CategoryRepository
) : CategoryService {

    override suspend fun getAllCategories(): List<CategoryDto> = dbQuery {
        categoryRepository.findAll().map { it.toDto() }
    }

    override suspend fun getCategoryById(id: Long): CategoryDto? = dbQuery {
        categoryRepository.findById(id)?.toDto()
    }

    override suspend fun createCategory(categoryDto: CategoryDto): CategoryDto = dbQuery {
        categoryRepository.create(categoryDto).toDto()
    }

    override suspend fun updateCategory(id: Long, categoryDto: CategoryDto): CategoryDto? = dbQuery {
        categoryRepository.update(id, categoryDto)?.toDto()
    }

    override suspend fun deleteCategory(id: Long): Boolean {
        return categoryRepository.delete(id)
    }
}

class StatsServiceImpl(
    private val statsRepository: StatsRepository
) : StatsService {

    override suspend fun getInventoryStats(): InventoryStatsDto = dbQuery {
        statsRepository.getInventoryStats()
    }

    override suspend fun getCategoryStats(): List<CategoryStatsDto> = dbQuery {
        statsRepository.getCategoryStats()
    }
}

class InvoiceServiceImpl(
    private val invoiceRepository: InvoiceRepository
) : InvoiceService {

    companion object {
        /**
         * Company main logo as base64 PNG (paste the string after 'base64,')
         */
        const val COMPANY_LOGO_BASE64 =
            "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"
        /**
         * Company seal as base64 PNG (replace as needed)
         */
        const val COMPANY_SEAL_BASE64 = COMPANY_LOGO_BASE64
    }

    override suspend fun getAllInvoices(): List<InvoiceDto> = dbQuery {
        invoiceRepository.findAll().map { it.toDto() }
    }

    override suspend fun getInvoiceById(id: Long): InvoiceDto? = dbQuery {
        invoiceRepository.findById(id)?.toDto()
    }

    override suspend fun getInvoicesByTransactionId(transactionId: Long): List<InvoiceDto> = dbQuery {
        invoiceRepository.findByTransactionId(transactionId).map { it.toDto() }
    }

    override suspend fun getInvoiceByNumber(invoiceNumber: String): InvoiceDto? = dbQuery {
        invoiceRepository.findByInvoiceNumber(invoiceNumber)?.toDto()
    }

    override suspend fun deleteInvoice(id: Long): Boolean = dbQuery {
        invoiceRepository.delete(id)
    }

    override suspend fun generateInvoicePDF(invoice: InvoiceDto): ByteArray {
        val htmlContent = generateInvoiceHTML(invoice)

        val outputStream = java.io.ByteArrayOutputStream()
        try {
            val renderer = org.xhtmlrenderer.pdf.ITextRenderer()
            renderer.setDocumentFromString(htmlContent)
            renderer.layout()
            renderer.createPDF(outputStream)
        } catch (e: Exception) {
            throw RuntimeException("Failed to generate PDF: ${e.message}")
        }

        return outputStream.toByteArray()
    }

    override suspend fun generateInvoiceHTML(invoice: InvoiceDto): String {
        val printData = getInvoicePrintData(invoice)

        return buildString {
            append("""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        @media print {
            @page {
                size: A4;
                margin: 12mm;
            }
            
            html, body {
                width: 210mm;
                height: 297mm;
                margin: 0;
                padding: 0;
                font-size: 11px !important;
                line-height: 1.3 !important;
                color: #000 !important;
                background: white !important;
            }
            
            .invoice-container {
                box-shadow: none !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 2px solid #000 !important;
                border-radius: 0 !important;
                max-width: none !important;
                background: white !important;
            }
            
            .invoice-header {
                background: white !important;
                color: #000 !important;
                padding: 16px !important;
                margin-bottom: 10px !important;
                border: 2px solid #000 !important;
                border-radius: 0 !important;
                page-break-inside: avoid;
            }
            
            .header-content {
                display: grid !important;
                grid-template-columns: 1fr auto !important;
                gap: 20px !important;
                align-items: center !important;
            }
            
            .company-section {
                display: flex !important;
                gap: 12px !important;
                align-items: flex-start !important;
            }
            
            .company-logo {
                height: 50px !important;
                width: 50px !important;
                padding: 0 !important;
                background: transparent !important;
                border: none !important;
            }
            
            .company-logo img {
                height: 50px !important;
                width: 50px !important;
            }
            
            .company-header-details {
                flex: 1 !important;
            }
            
            .company-name {
                font-size: 18px !important;
                margin: 0 0 6px 0 !important;
                font-weight: 700 !important;
                color: #000 !important;
                text-transform: uppercase !important;
                letter-spacing: 1px !important;
            }
            
            .company-details {
                font-size: 10px !important;
                color: #000 !important;
            }
            
            .company-details div {
                margin-bottom: 2px !important;
            }
            
            .invoice-title-section {
                text-align: right !important;
                flex-shrink: 0 !important;
            }
            
            .invoice-title {
                font-size: 24px !important;
                font-weight: 900 !important;
                margin: 0 0 8px 0 !important;
                letter-spacing: 2px !important;
                color: #000 !important;
                border: 3px solid #000 !important;
                padding: 8px 16px !important;
                text-align: center !important;
                background: white !important;
            }
            
            .invoice-meta-header {
                background: white !important;
                color: #000 !important;
                padding: 10px !important;
                border: 2px solid #000 !important;
                min-width: 180px !important;
            }
            
            .meta-row {
                display: flex !important;
                justify-content: space-between !important;
                margin-bottom: 4px !important;
                font-size: 11px !important;
                color: #000 !important;
                font-weight: 600 !important;
            }
            
            .meta-row:last-child {
                margin-bottom: 0 !important;
            }
            
            .invoice-body {
                padding: 12px !important;
            }
            
            .client-info-section {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 16px !important;
                margin-bottom: 16px !important;
            }
            
            .info-block {
                background: white !important;
                border: 2px solid #000 !important;
                padding: 12px !important;
                border-radius: 0 !important;
            }
            
            .info-block h3 {
                font-size: 12px !important;
                margin: 0 0 8px 0 !important;
                padding-bottom: 4px !important;
                border-bottom: 2px solid #000 !important;
                font-weight: 700 !important;
                color: #000 !important;
                text-transform: uppercase !important;
            }
            
            .info-row {
                display: flex !important;
                justify-content: space-between !important;
                margin-bottom: 6px !important;
                padding: 3px 0 !important;
                border-bottom: 1px solid #000 !important;
            }
            
            .info-row:last-child {
                border-bottom: none !important;
                margin-bottom: 0 !important;
            }
            
            .info-label {
                font-size: 10px !important;
                font-weight: 500 !important;
                color: #000 !important;
            }
            
            .info-value {
                font-size: 10px !important;
                font-weight: 700 !important;
                text-align: right !important;
                color: #000 !important;
            }
            
            .payment-status-badge {
                padding: 2px 8px !important;
                font-size: 9px !important;
                border: 2px solid #000 !important;
                font-weight: 700 !important;
                background: white !important;
                color: #000 !important;
                text-transform: uppercase !important;
            }
            
            .items-section {
                margin-bottom: 12px !important;
            }
            
            .section-title {
                font-size: 14px !important;
                margin: 0 0 8px 0 !important;
                padding-bottom: 4px !important;
                border-bottom: 3px solid #000 !important;
                font-weight: 700 !important;
                color: #000 !important;
                text-transform: uppercase !important;
            }
            
            .items-table {
                width: 100% !important;
                border-collapse: collapse !important;
                font-size: 10px !important;
                margin-bottom: 8px !important;
                border: 2px solid #000 !important;
            }
            
            .items-table th {
                background: white !important;
                padding: 8px 6px !important;
                border: 1px solid #000 !important;
                font-weight: 700 !important;
                font-size: 10px !important;
                color: #000 !important;
                text-transform: uppercase !important;
            }
            
            .items-table td {
                padding: 8px 6px !important;
                border: 1px solid #000 !important;
                font-size: 10px !important;
                vertical-align: top !important;
                color: #000 !important;
                background: white !important;
            }
            
            .totals-section {
                display: flex !important;
                justify-content: flex-end !important;
                margin-top: 8px !important;
            }
            
            .totals-table {
                min-width: 250px !important;
                background: white !important;
                border: 2px solid #000 !important;
                font-size: 10px !important;
            }
            
            .totals-table td {
                padding: 6px 12px !important;
                border-bottom: 1px solid #000 !important;
                color: #000 !important;
                background: white !important;
            }
            
            .totals-table tr:last-child td {
                border-bottom: none !important;
            }
            
            .total-row {
                background: #000 !important;
                color: white !important;
                font-weight: 700 !important;
            }
            
            .balance-due-row {
                background: white !important;
                color: #000 !important;
                font-weight: 700 !important;
                border: 2px solid #000 !important;
            }
            
            .notes-section {
                background: white !important;
                border: 2px solid #000 !important;
                padding: 12px !important;
                margin: 12px 0 !important;
            }
            
            .notes-section h3 {
                font-size: 12px !important;
                margin: 0 0 6px 0 !important;
                color: #000 !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
            }
            
            .notes-content {
                font-size: 10px !important;
                color: #000 !important;
                line-height: 1.4 !important;
            }
            
            .signature-section {
                background: white !important;
                border: 2px solid #000 !important;
                padding: 8px !important;
                margin: 8px 0 !important;
                page-break-inside: avoid;
                height: auto !important;
            }
            
            .signature-heading {
                font-size: 9px !important;
                text-align: center !important;
                margin-bottom: 8px !important;
                font-style: italic !important;
                color: #000 !important;
            }
            
            .signature-lines {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 20px !important;
                margin-bottom: 6px !important;
            }
            
            .signature-col {
                text-align: center !important;
            }
            
            .signature-box {
                height: 25px !important;
                border-bottom: 2px solid #000 !important;
                margin-bottom: 4px !important;
            }
            
            .signature-label {
                font-size: 8px !important;
                color: #000 !important;
                line-height: 1.2 !important;
                font-weight: 600 !important;
            }
            
            .signature-date {
                text-align: center !important;
                font-size: 9px !important;
                color: #000 !important;
                margin-top: 6px !important;
                font-weight: 600 !important;
            }
            
            .seal-logo img {
                height: 20px !important;
                width: 20px !important;
                border-radius: 50% !important;
                margin: 1px 0 !important;
                border: 2px solid #000 !important;
            }
            
            .footer-section {
                display: grid !important;
                grid-template-columns: 1fr auto !important;
                gap: 20px !important;
                align-items: center !important;
                background: white !important;
                border: 2px solid #000 !important;
                padding: 12px !important;
                margin: 0 !important;
                page-break-inside: avoid;
            }
            
            .thank-you h3 {
                font-size: 12px !important;
                margin: 0 0 4px 0 !important;
                color: #000 !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
            }
            
            .thank-you p {
                font-size: 9px !important;
                margin: 2px 0 !important;
                color: #000 !important;
            }
            
            .qr-section {
                text-align: center !important;
            }
            
            .qr-section img {
                width: 60px !important;
                height: 60px !important;
                border: 2px solid #000 !important;
                background: white !important;
                padding: 4px !important;
            }
            
            .qr-label {
                font-size: 8px !important;
                color: #000 !important;
                margin-top: 4px !important;
                font-weight: 600 !important;
            }
            
            .no-print {
                display: none !important;
            }
            
            .currency {
                font-family: monospace !important;
                font-weight: 700 !important;
                color: #000 !important;
            }
            
            .font-medium {
                font-weight: 600 !important;
            }
            
            .text-center {
                text-align: center !important;
            }
            
            .text-right {
                text-align: right !important;
            }
            
            code {
                background: white !important;
                padding: 2px 4px !important;
                font-size: 9px !important;
                color: #000 !important;
                border: 1px solid #000 !important;
                font-weight: 600 !important;
            }
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 20px;
            background-color: white;
            font-size: 14px;
        }
        
        .print-btn {
            background: #000;
            color: white;
            border: 2px solid #000;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 auto 24px auto;
            transition: all 0.2s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .print-btn:hover {
            background: white;
            color: #000;
        }
        
        .invoice-container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            overflow: hidden;
            border: 3px solid #000;
        }
        
        .invoice-header {
            background: white;
            color: #000;
            padding: 24px;
            border: 3px solid #000;
            border-bottom: 3px solid #000;
        }
        
        .header-content {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 24px;
            align-items: center;
        }
        
        .company-section {
            display: flex;
            gap: 16px;
            align-items: flex-start;
        }
        
        .company-logo {
            height: 64px;
            width: 64px;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        
        .company-logo img {
            height: 64px;
            width: 64px;
            object-fit: contain;
        }
        
        .company-header-details {
            flex: 1;
            min-width: 0;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 8px 0;
            line-height: 1.2;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #000;
        }
        
        .company-details {
            font-size: 13px;
            line-height: 1.5;
            color: #000;
        }
        
        .company-details div {
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .invoice-title-section {
            text-align: right;
            flex-shrink: 0;
        }
        
        .invoice-title {
            font-size: 32px;
            font-weight: 900;
            margin: 0 0 12px 0;
            letter-spacing: 3px;
            border: 4px solid #000;
            padding: 12px 20px;
            text-align: center;
            background: white;
            color: #000;
        }
        
        .invoice-meta-header {
            background: white;
            padding: 12px;
            border: 2px solid #000;
            min-width: 200px;
        }
        
        .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 600;
            color: #000;
        }
        
        .meta-row:last-child {
            margin-bottom: 0;
        }
        
        .meta-label {
            font-weight: 600;
        }
        
        .invoice-body {
            padding: 32px;
        }
        
        .client-info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 32px;
        }
        
        .info-block {
            background: #f8fafc;
            padding: 20px;
            border: 2px solid #000;
        }
        
        .info-block h3 {
            font-size: 16px;
            font-weight: 700;
            color: #000;
            margin: 0 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #000;
            text-transform: uppercase;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding: 8px 0;
            border-bottom: 1px solid #000;
        }
        
        .info-row:last-child {
            margin-bottom: 0;
            border-bottom: none;
        }
        
        .info-label {
            font-weight: 500;
            color: #000;
            font-size: 13px;
        }
        
        .info-value {
            font-weight: 700;
            color: #000;
            text-align: right;
        }
        
        .payment-status-badge {
            padding: 4px 12px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            border: 2px solid #000;
            background: white;
            color: #000;
        }
        
        .currency {
            font-family: 'Courier New', monospace;
            font-weight: 700;
        }
        
        .items-section {
            margin-bottom: 32px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #000;
            margin: 0 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 3px solid #000;
            text-transform: uppercase;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            background: white;
            border: 2px solid #000;
        }
        
        .items-table th {
            background: #f8fafc;
            padding: 16px 12px;
            font-weight: 700;
            color: #000;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid #000;
        }
        
        .items-table td {
            padding: 16px 12px;
            border: 1px solid #000;
            vertical-align: top;
            background: white;
        }
        
        .text-center {
            text-align: center;
        }
        
        .text-right {
            text-align: right;
        }
        
        .font-medium {
            font-weight: 600;
        }
        
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-top: 24px;
        }
        
        .totals-table {
            min-width: 300px;
            background: #f8fafc;
            border: 2px solid #000;
        }
        
        .totals-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #000;
            background: white;
        }
        
        .totals-table tr:last-child td {
            border-bottom: none;
        }
        
        .total-row {
            background: #000;
            color: white;
            font-weight: 700;
        }
        
        .balance-due-row {
            background: white;
            color: #000;
            font-weight: 700;
            border: 2px solid #000;
        }
        
        .balance-due-row td {
            border: 2px solid #000;
        }
        
        .notes-section {
            margin-bottom: 24px;
            background: #f8fafc;
            padding: 20px;
            border: 2px solid #000;
        }
        
        .notes-section h3 {
            font-size: 16px;
            font-weight: 700;
            color: #000;
            margin: 0 0 12px 0;
            text-transform: uppercase;
        }
        
        .notes-content {
            color: #000;
            line-height: 1.6;
        }
        
        .signature-section {
            margin: 16px 0;
            background: #f8fafc;
            padding: 16px;
            border: 2px solid #000;
            height: auto;
        }
        
        .signature-heading {
            font-size: 12px;
            color: #000;
            margin-bottom: 12px;
            text-align: center;
            font-style: italic;
        }
        
        .signature-lines {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 12px;
        }
        
        .signature-col {
            text-align: center;
        }
        
        .signature-box {
            height: 40px;
            border-bottom: 2px solid #000;
            margin-bottom: 6px;
            position: relative;
        }
        
        .signature-label {
            font-size: 12px;
            color: #000;
            font-weight: 600;
            line-height: 1.3;
        }
        
        .seal-logo img {
            height: 24px;
            width: 24px;
            border-radius: 50%;
            margin: 2px 0;
            border: 2px solid #000;
        }
        
        .signature-date {
            text-align: center;
            font-size: 12px;
            color: #000;
            margin-top: 8px;
            font-weight: 600;
        }
        
        .footer-section {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 24px;
            align-items: center;
            padding: 24px;
            background: #f8fafc;
            border-top: 3px solid #000;
            margin: 0 -32px -32px -32px;
            border-left: 3px solid #000;
            border-right: 3px solid #000;
            border-bottom: 3px solid #000;
        }
        
        .thank-you h3 {
            font-size: 18px;
            color: #000;
            margin: 0 0 8px 0;
            font-weight: 700;
            text-transform: uppercase;
        }
        
        .thank-you p {
            margin: 4px 0;
            color: #000;
            font-size: 13px;
        }
        
        .qr-section {
            text-align: center;
            flex-shrink: 0;
        }
        
        .qr-section img {
            border: 2px solid #000;
            background: white;
            padding: 8px;
        }
        
        .qr-label {
            font-size: 12px;
            color: #000;
            margin-top: 8px;
            font-weight: 600;
        }
        
        @media (max-width: 768px) {
            body {
                padding: 12px;
            }
            
            .header-content {
                grid-template-columns: 1fr;
                gap: 16px;
            }
            
            .invoice-title-section {
                text-align: left;
            }
            
            .client-info-section {
                grid-template-columns: 1fr;
                gap: 16px;
            }
            
            .signature-lines {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .footer-section {
                grid-template-columns: 1fr;
                text-align: center;
                gap: 16px;
            }
            
            .items-table {
                font-size: 12px;
            }
            
            .items-table th,
            .items-table td {
                padding: 12px 8px;
            }
        }
        
        .amount-in-words-section {
            margin-top: 16px;
            margin-bottom: 16px;
            padding: 12px;
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
        }
        
        .amount-in-words-section p {
            margin: 0;
            font-size: 14px;
            line-height: 1.4;
            color: #000;
        }
        
        .amount-in-words-section strong {
            font-weight: 600;
            color: #000;
        }
        
        @media print {
            .amount-in-words-section {
                background-color: white !important;
                border: 1px solid #000 !important;
                margin-top: 12px !important;
                margin-bottom: 12px !important;
                padding: 8px !important;
            }
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button class="print-btn" onclick="window.print()">
            <span>🖨️</span>
            <span>Print Invoice</span>
        </button>
    </div>
    
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="header-content">
                <div class="company-section">
                    <div class="company-logo">
                        <img src="data:image/png;base64,$COMPANY_LOGO_BASE64" alt="Company Logo" />
                    </div>
                    <div class="company-header-details">
                        <h1 class="company-name">${invoice.companyName}</h1>
                        <div class="company-details">
                            <div>📍 ${invoice.companyAddress}</div>
                            <div>📞 ${invoice.companyPhone}</div>
                            <div>📧 ${invoice.companyEmail}</div>
                            <div>🔖 ${invoice.licenseNumber}</div>
                        </div>
                    </div>
                </div>
                
                <div class="invoice-title-section">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-meta-header">
                        <div class="meta-row">
                            <span class="meta-label">Invoice #:</span>
                            <span>${invoice.invoiceNumber}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Date:</span>
                            <span>${printData.formattedDate}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Type:</span>
                            <span>${invoice.type.name.replace("_", " ")}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="invoice-body">
            <div class="client-info-section">
                <div class="info-block">
                    <h3>Transaction Details</h3>
                    <div class="info-row">
                        <span class="info-label">Transaction ID:</span>
                        <span class="info-value">${invoice.transactionId}</span>
                    </div>
                    ${if (invoice.recipientName != null) """
                    <div class="info-row">
                        <span class="info-label">Recipient:</span>
                        <span class="info-value">${invoice.recipientName}</span>
                    </div>
                    """ else ""}
                    ${if (invoice.reason != null) """
                    <div class="info-row">
                        <span class="info-label">Reason:</span>
                        <span class="info-value">${invoice.reason}</span>
                    </div>
                    """ else ""}
                </div>
                
                <div class="info-block">
                    <h3>Payment Information</h3>
                    <div class="info-row">
                        <span class="info-label">Status:</span>
                        <span class="payment-status-badge">
                            ${printData.paymentStatus}
                        </span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Amount Paid:</span>
                        <span class="info-value currency">${printData.formattedAmountPaid}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Balance Due:</span>
                        <span class="info-value currency">${printData.balanceDue}</span>
                    </div>
                </div>
            </div>
            
            <div class="items-section">
                <h3 class="section-title">Invoice Items</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="text-align: left;">Item Description</th>
                            <th style="text-align: left;">Part Number</th>
                            <th class="text-center">Quantity</th>
                            <th class="text-right">Unit Price</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
""".trimIndent())

            // Add each invoice item
            invoice.items.forEach { item ->
                append("""
                        <tr>
                            <td class="font-medium">${item.partName}</td>
                            <td><code>${item.partNumber}</code></td>
                            <td class="text-center">${item.quantity}</td>
                            <td class="text-right currency">${formatCurrency(item.unitPrice)}</td>
                            <td class="text-right currency font-medium">${formatCurrency(item.lineTotal)}</td>
                        </tr>
            """.trimIndent())
            }

            append("""
                    </tbody>
                </table>
                
                <div class="totals-section">
                    <table class="totals-table">
                        <tr>
                            <td>Subtotal:</td>
                            <td class="text-right currency">${printData.formattedTotal}</td>
                        </tr>
                        <tr class="total-row">
                            <td>Total Amount:</td>
                            <td class="text-right currency">${printData.formattedTotal}</td>
                        </tr>
                        <tr>
                            <td>Amount Paid:</td>
                            <td class="text-right currency">${printData.formattedAmountPaid}</td>
                        </tr>
                        <tr class="balance-due-row">
                            <td>Balance Due:</td>
                            <td class="text-right currency">${printData.balanceDue}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="amount-in-words-section">
                    <p><strong>Amount in Words:</strong> ${printData.totalInWords}</p>
                </div>
            </div>
            
            ${if (invoice.notes != null) """
            <div class="notes-section">
                <h3>Additional Notes</h3>
                <div class="notes-content">${invoice.notes}</div>
            </div>
            """ else ""}
            
            <div class="signature-section">
                <div class="signature-heading">
                    By signing this document, the customer agrees to the services and conditions described in the document.
                </div>
                <div class="signature-lines">
                    <div class="signature-col">
                        <div class="signature-box"></div>
                        <div class="signature-label">Customer Signature</div>
                    </div>
                    <div class="signature-col">
                        <div class="signature-box"></div>
                        <div class="signature-label">
                            ${invoice.companyName}<br/>
                            <span class="seal-logo">
                                <img src="data:image/png;base64,$COMPANY_SEAL_BASE64" alt="Company Seal" />
                            </span>
                            <br/>Company Seal
                        </div>
                    </div>
                </div>
                <div class="signature-date">
                    Date: _____________________
                </div>
            </div>
            
            <div class="footer-section">
                <div class="thank-you">
                    <h3>Thank You for Your Business!</h3>
                    <p>We appreciate your trust in our services</p>
                    <p><strong>Generated:</strong> ${printData.formattedDate}</p>
                </div>
                
                <div class="qr-section">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${java.net.URLEncoder.encode(printData.qrCodeData, "UTF-8")}" alt="Invoice QR Code" />
                    <div class="qr-label">Scan to verify invoice</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
        """.trimIndent())
        }
    }
    /**
     * Formats a currency value in QAR style.
     */
    private fun formatCurrency(amount: Double): String {
        return "QR ${String.format("%.2f", amount)}"
    }

    /**
     * Converts a number to words in English.
     */
    private fun numberToWords(amount: Double): String {
        val wholePart = amount.toInt()
        val decimalPart = ((amount - wholePart) * 100).toInt()
        
        val wholeWords = convertIntegerToWords(wholePart)
        
        return if (decimalPart == 0) {
            "$wholeWords Qatari Riyals Only"
        } else {
            val decimalWords = convertIntegerToWords(decimalPart)
            "$wholeWords Qatari Riyals and $decimalWords Dirhams Only"
        }
    }
    
    private fun convertIntegerToWords(number: Int): String {
        if (number == 0) return "Zero"
        
        val ones = arrayOf("", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine")
        val teens = arrayOf("Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen")
        val tens = arrayOf("", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety")
        val thousands = arrayOf("", "Thousand", "Million", "Billion")
        
        fun convertHundreds(num: Int): String {
            var result = ""
            val hundred = num / 100
            val remainder = num % 100
            
            if (hundred > 0) {
                result += ones[hundred] + " Hundred"
                if (remainder > 0) result += " "
            }
            
            if (remainder >= 10 && remainder < 20) {
                result += teens[remainder - 10]
            } else {
                val ten = remainder / 10
                val one = remainder % 10
                if (ten > 0) {
                    result += tens[ten]
                    if (one > 0) result += " "
                }
                if (one > 0) {
                    result += ones[one]
                }
            }
            
            return result
        }
        
        var num = number
        var groupIndex = 0
        val groups = mutableListOf<String>()
        
        while (num > 0) {
            val group = num % 1000
            if (group > 0) {
                val groupWords = convertHundreds(group)
                val thousandWord = thousands[groupIndex]
                groups.add(0, if (thousandWord.isNotEmpty()) "$groupWords $thousandWord" else groupWords)
            }
            num /= 1000
            groupIndex++
        }
        
        return groups.joinToString(" ")
    }

    override suspend fun getInvoicePrintData(invoice: InvoiceDto): InvoicePrintData {
        val balanceDue = invoice.totalAmount - invoice.amountPaid
        val paymentStatus = when {
            invoice.isPaid -> "PAID"
            invoice.amountPaid > 0 -> "PARTIAL"
            else -> "UNPAID"
        }

        val qrCodeData = buildString {
            append("Invoice: ${invoice.invoiceNumber}\n")
            append("Amount: ${formatCurrency(invoice.totalAmount)}\n")
            append("Status: $paymentStatus\n")
            append("Company: ${invoice.companyName}")
        }

        // Format date using kotlinx.datetime
        val formattedDate = invoice.createdAt?.let { instant ->
            val localDateTime = instant.toLocalDateTime(kotlinx.datetime.TimeZone.UTC)
            "${getMonthName(localDateTime.monthNumber)} ${localDateTime.dayOfMonth}, ${localDateTime.year}"
        } ?: "N/A"

        return InvoicePrintData(
            invoice = invoice,
            qrCodeData = qrCodeData,
            formattedDate = formattedDate,
            formattedTotal = formatCurrency(invoice.totalAmount),
            formattedUnitPrice = formatCurrency(invoice.items.firstOrNull()?.unitPrice ?: 0.0),
            formattedAmountPaid = formatCurrency(invoice.amountPaid),
            balanceDue = formatCurrency(balanceDue),
            paymentStatus = paymentStatus,
            totalInWords = numberToWords(invoice.totalAmount)
        )
    }

    private fun getMonthName(monthNumber: Int): String {
        return when (monthNumber) {
            1 -> "Jan"
            2 -> "Feb"
            3 -> "Mar"
            4 -> "Apr"
            5 -> "May"
            6 -> "Jun"
            7 -> "Jul"
            8 -> "Aug"
            9 -> "Sep"
            10 -> "Oct"
            11 -> "Nov"
            12 -> "Dec"
            else -> "Unknown"
        }
    }

    override suspend fun generateBulkInvoices(request: BulkInvoiceRequest): List<InvoiceDto> {
        val invoices = mutableListOf<InvoiceDto>()

        for (transactionId in request.transactionIds) {
            val existingInvoices = getInvoicesByTransactionId(transactionId)
            invoices.addAll(existingInvoices)
        }

        return invoices
    }

    override suspend fun createInvoicesForTransaction(transactionId: Long): List<InvoiceDto> = dbQuery {
        val existingInvoices = invoiceRepository.findByTransactionId(transactionId)
        if (existingInvoices.isNotEmpty()) {
            return@dbQuery existingInvoices.map { it.toDto() }
        }

        val transaction = TransactionTable.findById(transactionId)
            ?: throw IllegalArgumentException("Transaction not found")

        if (transaction.type != TransactionType.OUT) {
            return@dbQuery emptyList()
        }

        // Use internal helper
        val invoices = createInvoicesForTransactionInternal(transaction)
        invoices.map { it.toDto() }
    }

    private fun createInvoicesForTransactionInternal(transaction: TransactionTable): List<Invoice> {
        return listOf(
            // Customer copy
            Invoice.new {
                invoiceNumber = generateInvoiceNumber()
                this.transaction = transaction
                type = InvoiceType.CUSTOMER_COPY
                recipientName = transaction.recipientName
                reason = transaction.reason
                isPaid = transaction.isPaid
                amountPaid = transaction.amountPaid
                totalAmount = transaction.totalAmount
                currency = transaction.currency
                notes = transaction.notes
            }.also { invoice ->
                // Add items
                transaction.items.forEach { transactionItem ->
                    InvoiceItem.new {
                        this.invoice = invoice
                        part = transactionItem.part
                        partName = transactionItem.part.name
                        partNumber = transactionItem.part.partNumber
                        quantity = transactionItem.quantity
                        unitPrice = transactionItem.unitPrice
                        lineTotal = transactionItem.lineTotal
                    }
                }
            },
            // Company copy
            Invoice.new {
                invoiceNumber = generateInvoiceNumber()
                this.transaction = transaction
                type = InvoiceType.COMPANY_COPY
                recipientName = transaction.recipientName
                reason = transaction.reason
                isPaid = transaction.isPaid
                amountPaid = transaction.amountPaid
                totalAmount = transaction.totalAmount
                currency = transaction.currency
                notes = transaction.notes
            }.also { invoice ->
                transaction.items.forEach { transactionItem ->
                    InvoiceItem.new {
                        this.invoice = invoice
                        part = transactionItem.part
                        partName = transactionItem.part.name
                        partNumber = transactionItem.part.partNumber
                        quantity = transactionItem.quantity
                        unitPrice = transactionItem.unitPrice
                        lineTotal = transactionItem.lineTotal
                    }
                }
            }
        )
    }

    private fun generateInvoiceNumber(): String {
        val timestamp = System.currentTimeMillis()
        val random = (1000..9999).random()
        return "INV-$timestamp-$random"
    }
}

