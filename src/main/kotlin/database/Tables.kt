package com.newmotion.database

import com.newmotion.models_dtos.TransactionType
import com.newmotion.models_dtos.UserRole
import com.newmotion.models_dtos.InvoiceType
import com.newmotion.models_dtos.Currency
import org.jetbrains.exposed.dao.LongEntity
import org.jetbrains.exposed.dao.LongEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.LongIdTable
import org.jetbrains.exposed.sql.kotlin.datetime.datetime

import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import java.math.BigDecimal

// Existing tables (unchanged)
object Categories : LongIdTable("categories") {
    val name = varchar("name", 100).uniqueIndex()
    val description = text("description").nullable()
    val createdAt = datetime("created_at").default(Clock.System.now().toLocalDateTime(TimeZone.UTC))
}

object Parts : LongIdTable("parts") {
    val name = varchar("name", 200)
    val description = text("description").nullable()
    val partNumber = varchar("part_number", 100).uniqueIndex()
    val categoryId = reference("category_id", Categories)
    val unitPrice = decimal("unit_price", 10, 2)
    val currentStock = integer("current_stock").default(0)
    val minimumStock = integer("minimum_stock").default(0)
    val maxStock = integer("max_stock").nullable()
    val location = varchar("location", 100).nullable()
    val supplier = varchar("supplier", 200).nullable()
    val machineModels = text("machine_models").nullable()
    val createdAt = datetime("created_at").default(Clock.System.now().toLocalDateTime(TimeZone.UTC))
    val updatedAt = datetime("updated_at").default(Clock.System.now().toLocalDateTime(TimeZone.UTC))
}

object Users : LongIdTable("users") {
    val username = varchar("username", 50).uniqueIndex()
    val email = varchar("email", 100).uniqueIndex()
    val passwordHash = varchar("password_hash", 255)
    val fullName = varchar("full_name", 200)
    val role = enumerationByName("role", 20, UserRole::class).default(UserRole.STAFF)
    val isActive = bool("is_active").default(true)
    val createdAt = datetime("created_at").default(Clock.System.now().toLocalDateTime(TimeZone.UTC))
    val lastLoginAt = datetime("last_login_at").nullable()
}

// UPDATED: Transactions table - now header-only (no part-specific fields)
object Transactions : LongIdTable("transactions") {
    val type = enumerationByName("type", 20, TransactionType::class)
    val recipientName = varchar("recipient_name", 200).nullable()
    val reason = text("reason").nullable()
    val isPaid = bool("is_paid").default(false)
    val amountPaid = decimal("amount_paid", 10, 2).default(BigDecimal.ZERO)
    val totalAmount = decimal("total_amount", 10, 2).default(BigDecimal.ZERO)
    val currency = enumerationByName("currency", 10, Currency::class).default(Currency.QAR)
    val transactionDate = datetime("transaction_date").default(Clock.System.now().toLocalDateTime(TimeZone.UTC))
    val notes = text("notes").nullable()
    val createdAt = datetime("created_at").default(Clock.System.now().toLocalDateTime(TimeZone.UTC))
    val updatedAt = datetime("updated_at").default(Clock.System.now().toLocalDateTime(TimeZone.UTC))
}

// NEW: Transaction Items table - stores line items for each transaction
object TransactionItems : LongIdTable("transaction_items") {
    val transactionId = reference("transaction_id", Transactions)
    val partId = reference("part_id", Parts)
    val quantity = integer("quantity")
    val unitPrice = decimal("unit_price", 10, 2)
    val lineTotal = decimal("line_total", 10, 2)
    val createdAt = datetime("created_at").default(Clock.System.now().toLocalDateTime(TimeZone.UTC))
}

// UPDATED: Invoices table - now header-only (no part-specific fields)
object Invoices : LongIdTable("invoices") {
    val invoiceNumber = varchar("invoice_number", 50).uniqueIndex()
    val transactionId = reference("transaction_id", Transactions)
    val type = enumerationByName("type", 20, InvoiceType::class)
    val recipientName = varchar("recipient_name", 200).nullable()
    val reason = text("reason").nullable()
    val isPaid = bool("is_paid").default(false)
    val amountPaid = decimal("amount_paid", 10, 2).default(BigDecimal.ZERO)
    val totalAmount = decimal("total_amount", 10, 2).default(BigDecimal.ZERO)
    val currency = enumerationByName("currency", 10, Currency::class).default(Currency.QAR)
    val notes = text("notes").nullable()
    val companyName = varchar("company_name", 200).default("True Pal Trading & Services")
    val companyAddress = varchar("company_address", 500).default("PO Box 82705, Doha, Qatar")
    val companyPhone = varchar("company_phone", 50).default("+974 30199257")
    val companyEmail = varchar("company_email", 100).default("syedumer22@yahoo.co.uk")
    val createdAt = datetime("created_at").default(Clock.System.now().toLocalDateTime(TimeZone.UTC))
    val licenseNumber = varchar("license_number", 100).default("CR No: 194730") // License number for compliance/record
}

// NEW: Invoice Items table - stores line items for each invoice
object InvoiceItems : LongIdTable("invoice_items") {
    val invoiceId = reference("invoice_id", Invoices)
    val partId = reference("part_id", Parts)
    val partName = varchar("part_name", 200)
    val partNumber = varchar("part_number", 100)
    val quantity = integer("quantity")
    val unitPrice = decimal("unit_price", 10, 2)
    val lineTotal = decimal("line_total", 10, 2)
}

// Entity classes
class Category(id: EntityID<Long>) : LongEntity(id) {
    companion object : LongEntityClass<Category>(Categories)

    // Properties below are mutable to support updating by services/repositories
    var name by Categories.name
    var description by Categories.description
    var createdAt by Categories.createdAt

    val parts by Part referrersOn Parts.categoryId
}

class Part(id: EntityID<Long>) : LongEntity(id) {
    companion object : LongEntityClass<Part>(Parts)

    // Properties below are mutable to support updating by services/repositories
    var name by Parts.name
    var description by Parts.description
    var partNumber by Parts.partNumber
    var categoryId by Parts.categoryId
    var unitPrice by Parts.unitPrice
    var currentStock by Parts.currentStock
    var minimumStock by Parts.minimumStock
    var maxStock by Parts.maxStock
    var location by Parts.location
    var supplier by Parts.supplier
    var machineModels by Parts.machineModels
    var createdAt by Parts.createdAt
    var updatedAt by Parts.updatedAt

    val category by Category referencedOn Parts.categoryId
    // UPDATED: Now references transaction items instead of transactions directly
    val transactionItems by TransactionItem referrersOn TransactionItems.partId
}

class User(id: EntityID<Long>) : LongEntity(id) {
    companion object : LongEntityClass<User>(Users)

    // Properties below are mutable to support updating by services/repositories
    var username by Users.username
    var email by Users.email
    var passwordHash by Users.passwordHash
    var fullName by Users.fullName
    var role by Users.role
    var isActive by Users.isActive
    var createdAt by Users.createdAt
    var lastLoginAt by Users.lastLoginAt
}

// UPDATED: Transaction entity - now header-only
class TransactionTable(id: EntityID<Long>) : LongEntity(id) {
    companion object : LongEntityClass<TransactionTable>(Transactions)

    // Properties below are mutable to support updating by services/repositories
    var type by Transactions.type
    var recipientName by Transactions.recipientName
    var reason by Transactions.reason
    var isPaid by Transactions.isPaid
    var amountPaid by Transactions.amountPaid
    var totalAmount by Transactions.totalAmount
    var currency by Transactions.currency
    var transactionDate by Transactions.transactionDate
    var notes by Transactions.notes
    var createdAt by Transactions.createdAt
    var updatedAt by Transactions.updatedAt

    // NEW: Relationship to transaction items
    val items by TransactionItem referrersOn TransactionItems.transactionId
    // NEW: Relationship to invoices
    val invoices by Invoice referrersOn Invoices.transactionId
}

// NEW: TransactionItem entity
class TransactionItem(id: EntityID<Long>) : LongEntity(id) {
    companion object : LongEntityClass<TransactionItem>(TransactionItems)

    // Properties below are mutable to support updating by services/repositories
    var transactionId by TransactionItems.transactionId
    var partId by TransactionItems.partId
    var quantity by TransactionItems.quantity
    var unitPrice by TransactionItems.unitPrice
    var lineTotal by TransactionItems.lineTotal
    var createdAt by TransactionItems.createdAt

    // Relationship to parent transaction (mutable for initial assignment)
    var transaction by TransactionTable referencedOn TransactionItems.transactionId

    // Relationship to part (mutable for initial assignment)
    var part by Part referencedOn TransactionItems.partId
}

// UPDATED: Invoice entity - now header-only
class Invoice(id: EntityID<Long>) : LongEntity(id) {
    companion object : LongEntityClass<Invoice>(Invoices)

    // Properties below are mutable to support updating by services/repositories
    var invoiceNumber by Invoices.invoiceNumber
    var transactionId by Invoices.transactionId
    var type by Invoices.type
    var recipientName by Invoices.recipientName
    var reason by Invoices.reason
    var isPaid by Invoices.isPaid
    var amountPaid by Invoices.amountPaid
    var totalAmount by Invoices.totalAmount
    var currency by Invoices.currency
    var notes by Invoices.notes
    var companyName by Invoices.companyName
    var companyAddress by Invoices.companyAddress
    var companyPhone by Invoices.companyPhone
    var companyEmail by Invoices.companyEmail
    var createdAt by Invoices.createdAt
    var licenseNumber by Invoices.licenseNumber // License number mapped from table

    // Relationship to parent transaction (mutable for initial assignment)
    var transaction by TransactionTable referencedOn Invoices.transactionId
    // NEW: Relationship to invoice items
    val items by InvoiceItem referrersOn InvoiceItems.invoiceId
}

// NEW: InvoiceItem entity
class InvoiceItem(id: EntityID<Long>) : LongEntity(id) {
    companion object : LongEntityClass<InvoiceItem>(InvoiceItems)

    // Properties below are mutable to support updating by services/repositories
    var invoiceId by InvoiceItems.invoiceId
    var partId by InvoiceItems.partId
    var partName by InvoiceItems.partName
    var partNumber by InvoiceItems.partNumber
    var quantity by InvoiceItems.quantity
    var unitPrice by InvoiceItems.unitPrice
    var lineTotal by InvoiceItems.lineTotal

    // Relationship to parent invoice (must be settable)
    var invoice by Invoice referencedOn InvoiceItems.invoiceId

    // Relationship to part (must be settable)
    var part by Part referencedOn InvoiceItems.partId
}

object Customers : LongIdTable("customers") {
    val name = varchar("name", 200)
    val contactName = varchar("contact_name", 200)
    val contactPhone = varchar("contact_phone", 50)
    val address = text("address")
    val contactEmail = varchar("contact_email", 100).nullable()
    val inCharge = varchar("in_charge", 200)
    val businessType = varchar("business_type", 100).nullable() // Click Charge, AMC, or Other
    val createdAt = datetime("created_at").default(Clock.System.now().toLocalDateTime(TimeZone.UTC))
    val updatedAt = datetime("updated_at").default(Clock.System.now().toLocalDateTime(TimeZone.UTC))
}

class Customer(id: EntityID<Long>) : LongEntity(id) {
    companion object : LongEntityClass<Customer>(Customers)

    var name by Customers.name
    var contactName by Customers.contactName
    var contactPhone by Customers.contactPhone
    var address by Customers.address
    var contactEmail by Customers.contactEmail
    var inCharge by Customers.inCharge
    var businessType by Customers.businessType
    var createdAt by Customers.createdAt
    var updatedAt by Customers.updatedAt

    val machines by Machine referrersOn Machines.customerId
}

object Machines : LongIdTable("machines") {
    val customerId = reference("customer_id", Customers)
    val model = varchar("model", 200)
    val quantity = integer("quantity")
    val serialNumber = varchar("serial_number", 255).nullable()
}

class Machine(id: EntityID<Long>) : LongEntity(id) {
    companion object : LongEntityClass<Machine>(Machines)

    var customer by Customer referencedOn Machines.customerId
    var model by Machines.model
    var quantity by Machines.quantity
    var serialNumber by Machines.serialNumber
}
