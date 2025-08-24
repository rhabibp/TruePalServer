package com.newmotion.models_dtos

import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant

// DTOs for API
@Serializable
data class CategoryDto(
    val id: Long? = null,
    val name: String,
    val description: String? = null,
    val createdAt: Instant? = null
)

@Serializable
data class PartDto(
    val id: Long? = null,
    val name: String,
    val description: String? = null,
    val partNumber: String,
    val categoryId: Long,
    val categoryName: String? = null,
    val unitPrice: Double,
    val currentStock: Int,
    val minimumStock: Int,
    val maxStock: Int? = null,
    val location: String? = null,
    val supplier: String? = null,
    val machineModels: List<String>? = null,
    val createdAt: Instant? = null,
    val updatedAt: Instant? = null
)

@Serializable
data class PartDtoStaff(
    val id: Long? = null,
    val name: String,
    val description: String? = null,
    val partNumber: String,
    val categoryId: Long,
    val categoryName: String? = null,
    val currentStock: Int,
    val minimumStock: Int,
    val maxStock: Int? = null,
    val location: String? = null,
    val supplier: String? = null,
    val machineModels: List<String>? = null,
    val createdAt: Instant? = null,
    val updatedAt: Instant? = null
)

// UPDATED: TransactionDto now includes list of items instead of single part
@Serializable
data class TransactionDto(
    val id: Long? = null,
    val type: TransactionType,
    val recipientName: String? = null,
    val reason: String? = null,
    val isPaid: Boolean = false,
    val amountPaid: Double = 0.0,
    val totalAmount: Double = 0.0,
    val transactionDate: Instant? = null,
    val notes: String? = null,
    val currency: Currency = Currency.QAR,
    val items: List<TransactionItemDto> = emptyList()
)

// NEW: TransactionItemDto for line items
@Serializable
data class TransactionItemDto(
    val id: Long? = null,
    val transactionId: Long? = null,
    val partId: Long,
    val partName: String? = null,
    val partNumber: String? = null,
    val quantity: Int,
    val unitPrice: Double,
    val lineTotal: Double = quantity * unitPrice
)

// UPDATED: TransactionWithInvoicesDto - now single transaction instead of list
@Serializable
data class TransactionWithInvoicesDto(
    val transaction: TransactionDto,
    val invoices: List<InvoiceDto>
)

@Serializable
enum class TransactionType {
    IN, OUT, ADJUSTMENT
}

@Serializable
enum class UserRole {
    ADMIN, STAFF
}

@Serializable
enum class Currency {
    USD, QAR;
    
    val symbol: String get() = when(this) {
        USD -> "$"
        QAR -> "QR "
    }
    
    val exchangeRateFromUSD: Double get() = when(this) {
        USD -> 1.0
        QAR -> 3.64
    }
}

@Serializable
data class UserDto(
    val id: Long? = null,
    val username: String,
    val email: String,
    val fullName: String,
    val role: UserRole,
    val isActive: Boolean = true,
    val createdAt: Instant? = null,
    val lastLoginAt: Instant? = null
)

@Serializable
data class LoginRequest(
    val username: String,
    val password: String
)

@Serializable
data class LoginResponse(
    val token: String,
    val user: UserDto,
    val expiresAt: Instant
)

@Serializable
data class RegisterRequest(
    val username: String,
    val password: String,
    val email: String,
    val fullName: String,
    val role: UserRole = UserRole.STAFF
)

@Serializable
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

@Serializable
data class UpdateUserRequest(
    val email: String? = null,
    val fullName: String? = null,
    val role: UserRole? = null,
    val isActive: Boolean? = null
)

@Serializable
data class InventoryStatsDto(
    val totalCategories: Int,
    val totalParts: Int,
    val totalValue: Double,
    val lowStockParts: List<PartDto>,
    val fastMovingParts: List<FastMovingPartDto>,
    val topCategories: List<CategoryStatsDto>
)

@Serializable
data class FastMovingPartDto(
    val partId: Long,
    val partName: String,
    val totalOutQuantity: Int,
    val transactionCount: Int,
    val averagePerMonth: Double
)

@Serializable
data class CategoryStatsDto(
    val categoryId: Long,
    val categoryName: String,
    val partCount: Int,
    val totalValue: Double,
    val lowStockCount: Int
)

@Serializable
data class SearchPartsRequest(
    val query: String? = null,
    val categoryId: Long? = null,
    val lowStock: Boolean? = null,
    val page: Int = 1,
    val limit: Int = 20
)

@Serializable
data class PartSearchResponse(
    val parts: List<PartDto>,
    val total: Int
)

@Serializable
data class AddPartRequest(
    val name: String,
    val description: String? = null,
    val partNumber: String,
    val categoryId: Long,
    val unitPrice: Double,
    val initialStock: Int,
    val minimumStock: Int,
    val maxStock: Int? = null,
    val location: String? = null,
    val supplier: String? = null,
    val machineModels: List<String>? = null
)

@Serializable
data class UpdatePartRequest(
    val name: String? = null,
    val description: String? = null,
    val partNumber: String? = null,  // Added this missing field
    val categoryId: Long? = null,     // Added this missing field
    val unitPrice: Double? = null,
    val minimumStock: Int? = null,
    val maxStock: Int? = null,
    val location: String? = null,
    val supplier: String? = null,
    val machineModels: List<String>? = null
)

@Serializable
data class CreateTransactionRequest(
    val parts: List<TransactionPartDto>,
    val type: TransactionType,
    val recipientName: String? = null,
    val reason: String? = null,
    val isPaid: Boolean = false,
    val amountPaid: Double = 0.0,
    val notes: String? = null,
    val currency: Currency = Currency.QAR
)

@Serializable
data class TransactionPartDto(
    val partId: Long,
    val quantity: Int,
    val unitPrice: Double? = null
)

@Serializable
data class PaymentUpdateRequest(
    val amountPaid: Double,
    val isPaid: Boolean = false
)

@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null,
    val error: String? = null
) {
   
    companion object {
        fun <T> success(data: T, message: String? = null) = ApiResponse(
            success = true,
            data = data,
            message = message
        )

        fun <T> error(error: String) = ApiResponse<T>(
            success = false,
            error = error
        )
    }
}

@Serializable
data class PaginatedResponse<T>(
    val data: List<T>,
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int
)

@Serializable
enum class InvoiceType {
    CUSTOMER_COPY,
    COMPANY_COPY
}

// UPDATED: InvoiceDto now includes list of items instead of single part
@Serializable
data class InvoiceDto(
    val id: Long? = null,
    val invoiceNumber: String,
    val transactionId: Long,
    val type: InvoiceType,
    val recipientName: String? = null,
    val reason: String? = null,
    val isPaid: Boolean = false,
    val amountPaid: Double = 0.0,
    val totalAmount: Double = 0.0,
    val notes: String? = null,
    val createdAt: Instant? = null,
    val currency: Currency = Currency.QAR,
    val companyName: String = "True Pal Trading & Services",
    val companyAddress: String = "PO Box 82705, Doha, Qatar",
    val companyPhone: String = "+974 30199257",
    val companyEmail: String = "syedumer22@yahoo.co.uk",
    val licenseNumber: String = "CR No: 194730",
    val items: List<InvoiceItemDto> = emptyList()
)

// NEW: InvoiceItemDto for line items
@Serializable
data class InvoiceItemDto(
    val id: Long? = null,
    val invoiceId: Long? = null,
    val partId: Long,
    val partName: String,
    val partNumber: String,
    val quantity: Int,
    val unitPrice: Double,
    val lineTotal: Double = quantity * unitPrice
)

@Serializable
data class InvoicePrintData(
    val invoice: InvoiceDto,
    val qrCodeData: String,
    val formattedDate: String,
    val formattedTotal: String,
    val formattedUnitPrice: String,
    val formattedAmountPaid: String,
    val balanceDue: String,
    val paymentStatus: String,
    val totalInWords: String,
    val companyLogo: String? = null, // Base64 encoded logo
    val licenseNumber: String = "CR No: 194730"
)

@Serializable
data class BulkInvoiceRequest(
    val transactionIds: List<Long>,
    val format: InvoiceFormat = InvoiceFormat.PDF
)

@Serializable
enum class InvoiceFormat {
    PDF, HTML, JSON
}

@Serializable
data class UpdateTransactionRequest(
    val recipientName: String?,
    val reason: String?,
    val notes: String?,
    val isPaid: Boolean,
    val amountPaid: Double
)

// Added missing DTOs for the service layer
@Serializable
data class StockUpdateRequest(
    val partId: Long,
    val newStock: Int
)

@Serializable
data class StockUpdateResult(
    val partId: Long,
    val success: Boolean,
    val errorMessage: String?
)

@Serializable
data class BulkUpdateResult(
    val totalRequests: Int,
    val successCount: Int,
    val failureCount: Int,
    val results: List<StockUpdateResult>
)

@Serializable
data class DeletePartResult(
    val success: Boolean,
    val message: String,
    val errorType: DeleteErrorType?,
    val dependenciesRemoved: Int = 0,
    val dependenciesFound: Int = 0
)

@Serializable
enum class DeleteErrorType {
    NOT_FOUND,
    CONSTRAINT_VIOLATION,
    SYSTEM_ERROR,
    HAS_DEPENDENCIES
}

@Serializable
data class ValidationResult(
    val isValid: Boolean,
    val message: String
)

@Serializable
data class SetupAdminRequest(
    val username: String,
    val password: String,
    val email: String,
    val fullName: String
)