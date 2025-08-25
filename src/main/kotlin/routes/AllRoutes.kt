package com.newmotion.routes

import com.newmotion.models_dtos.*
import com.newmotion.services.*
import com.newmotion.views.index
import com.newmotion.routes.auth.authRoutes
import com.newmotion.auth.getCurrentUser
import com.newmotion.auth.hasMinimumRole
import com.newmotion.repository.toStaffDto
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.html.respondHtml
import io.ktor.server.http.content.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.html.HTML
import org.koin.ktor.ext.inject

fun Application.configureRouting() {
    routing {
        // API routes
        setupRoutes()
        authRoutes()
        categoryRoutes()
        partRoutes()
        transactionRoutes()
        invoiceRoutes()
        statsRoutes()
        customerRoutes()
        staticResources("/static", "static")
        healthRoutes()
        // -- This fallback must come AFTER all API and static route handlers --
        route("/api") {
            handle {
                call.respond(io.ktor.http.HttpStatusCode.NotFound, mapOf("error" to "API route not found"))
            }
        }

//        get("/") {
//            call.respondHtml(HttpStatusCode.OK, HTML::index)
//        }
    }
}

fun Route.categoryRoutes() {
    println("DEBUG: Registering categoryRoutes")
    val categoryService by inject<CategoryService>()

    route("/api/categories") {
        get {
            try {
                val categories = categoryService.getAllCategories()
                call.respond(ApiResponse(success = true, data = categories))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<CategoryDto>>(success = false, error = e.message))
            }
        }

        get("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<CategoryDto>(success = false, error = "Invalid category ID"))

                val category = categoryService.getCategoryById(id)
                if (category != null) {
                    call.respond(ApiResponse(success = true, data = category))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<CategoryDto>(success = false, error = "Category not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<CategoryDto>(success = false, error = e.message))
            }
        }

        post {
            try {
                val categoryDto = call.receive<CategoryDto>()
                val createdCategory = categoryService.createCategory(categoryDto)
                call.response.status(HttpStatusCode.Created)
                call.respond(ApiResponse(success = true, data = createdCategory))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.BadRequest)
                call.respond(ApiResponse<CategoryDto>(success = false, error = e.message))
            }
        }

        put("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@put call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<CategoryDto>(success = false, error = "Invalid category ID"))

                val categoryDto = call.receive<CategoryDto>()
                val updatedCategory = categoryService.updateCategory(id, categoryDto)

                if (updatedCategory != null) {
                    call.respond(ApiResponse(success = true, data = updatedCategory))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<CategoryDto>(success = false, error = "Category not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.BadRequest)
                call.respond(ApiResponse<CategoryDto>(success = false, error = e.message))
            }
        }

        delete("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<Boolean>(success = false, error = "Invalid category ID"))

                val deleted = categoryService.deleteCategory(id)
                if (deleted) {
                    call.respond(ApiResponse(success = true, data = true))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<Boolean>(success = false, error = "Category not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<Boolean>(success = false, error = e.message))
            }
        }
    }
}

fun Route.partRoutes() {
    println("DEBUG: Registering partRoutes")
    val partService by inject<PartService>()

    route("/api/parts") {
        authenticate("auth-jwt") {
        get {
            try {
                val query = call.request.queryParameters["q"]
                val categoryId = call.request.queryParameters["categoryId"]?.toLongOrNull()
                val currentUser = call.getCurrentUser()

                val parts = when {
                    !query.isNullOrBlank() -> partService.searchParts(query)
                    categoryId != null -> partService.getPartsByCategory(categoryId)
                    else -> partService.getAllParts()
                }

                // Filter data based on user role
                if (currentUser?.role == UserRole.STAFF) {
                    val staffParts = parts.map { it.toStaffDto() }
                    call.respond(ApiResponse(success = true, data = staffParts))
                } else {
                    call.respond(ApiResponse(success = true, data = parts))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<Any>>(success = false, error = e.message))
            }
        }

        get("/search") {
            try {
                val query = call.request.queryParameters["q"] ?: ""
                val currentUser = call.getCurrentUser()
                
                val parts = if (query.isBlank()) {
                    partService.getAllParts()
                } else {
                    partService.searchParts(query)
                }
                
                // Filter data based on user role
                if (currentUser?.role == UserRole.STAFF) {
                    val staffParts = parts.map { it.toStaffDto() }
                    call.respond(ApiResponse(success = true, data = staffParts))
                } else {
                    call.respond(ApiResponse(success = true, data = parts))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<Any>>(success = false, error = e.message))
            }
        }

        get("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<Any>(success = false, error = "Invalid part ID"))

                val currentUser = call.getCurrentUser()
                val part = partService.getPartById(id)
                
                if (part != null) {
                    // Filter data based on user role
                    if (currentUser?.role == UserRole.STAFF) {
                        call.respond(ApiResponse(success = true, data = part.toStaffDto()))
                    } else {
                        call.respond(ApiResponse(success = true, data = part))
                    }
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<Any>(success = false, error = "Part not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<Any>(success = false, error = e.message))
            }
        }

        get("/low-stock") {
            try {
                val currentUser = call.getCurrentUser()
                val lowStockParts = partService.getLowStockParts()
                
                // Filter data based on user role
                if (currentUser?.role == UserRole.STAFF) {
                    val staffParts = lowStockParts.map { it.toStaffDto() }
                    call.respond(ApiResponse(success = true, data = staffParts))
                } else {
                    call.respond(ApiResponse(success = true, data = lowStockParts))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<Any>>(success = false, error = e.message))
            }
        }

        // NEW: Get parts by category
        get("/category/{categoryId}") {
            try {
                val categoryId = call.parameters["categoryId"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<List<Any>>(success = false, error = "Invalid category ID"))

                val currentUser = call.getCurrentUser()
                val parts = partService.getPartsByCategory(categoryId)
                
                // Filter data based on user role
                if (currentUser?.role == UserRole.STAFF) {
                    val staffParts = parts.map { it.toStaffDto() }
                    call.respond(ApiResponse(success = true, data = staffParts))
                } else {
                    call.respond(ApiResponse(success = true, data = parts))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<Any>>(success = false, error = e.message))
            }
        }

        // NEW: Get stock history for a part
        get("/{id}/history") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<List<TransactionItemDto>>(success = false, error = "Invalid part ID"))

                val history = partService.getStockHistory(id)
                call.respond(ApiResponse(success = true, data = history))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<TransactionItemDto>>(success = false, error = e.message))
            }
        }

        // NEW: Validate part number
        get("/validate/part-number/{partNumber}") {
            try {
                val partNumber = call.parameters["partNumber"]
                val excludeId = call.request.queryParameters["excludeId"]?.toLongOrNull()

                if (partNumber.isNullOrBlank()) {
                    call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<ValidationResult>(success = false, error = "Part number is required"))
                    return@get
                }

                val isAvailable = partService.validatePartNumber(partNumber, excludeId)
                call.respond(ApiResponse(success = true, data = ValidationResult(
                    isValid = isAvailable,
                    message = if (isAvailable) "Part number is available" else "Part number already exists"
                )))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<ValidationResult>(success = false, error = e.message))
            }
        }

        post {
            try {
                // Only admin can create parts
                if (!call.hasMinimumRole(UserRole.ADMIN)) {
                    call.response.status(HttpStatusCode.Forbidden)
                    call.respond(ApiResponse<PartDto>(success = false, error = "Admin access required"))
                    return@post
                }
                
                val addPartRequest = call.receive<AddPartRequest>()
                val createdPart = partService.createPart(addPartRequest)
                call.response.status(HttpStatusCode.Created)
                call.respond(ApiResponse(success = true, data = createdPart))
            } catch (e: IllegalArgumentException) {
                call.response.status(HttpStatusCode.BadRequest)
                call.respond(ApiResponse<PartDto>(success = false, error = e.message))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<PartDto>(success = false, error = e.message))
            }
        }

        // NEW: Bulk stock update
        post("/bulk-stock-update") {
            try {
                val updates = call.receive<List<StockUpdateRequest>>()
                val result = partService.bulkUpdateStock(updates)

                if (result.failureCount > 0) {
                    call.response.status(HttpStatusCode.PartialContent)
                } else {
                    call.response.status(HttpStatusCode.OK)
                }
                call.respond(ApiResponse(success = true, data = result))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<BulkUpdateResult>(success = false, error = e.message))
            }
        }

        put("/{id}") {
            try {
                // Only admin can update parts
                if (!call.hasMinimumRole(UserRole.ADMIN)) {
                    call.response.status(HttpStatusCode.Forbidden)
                    call.respond(ApiResponse<PartDto>(success = false, error = "Admin access required"))
                    return@put
                }
                
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@put call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<PartDto>(success = false, error = "Invalid part ID"))

                val updateRequest = call.receive<UpdatePartRequest>()
                val updatedPart = partService.updatePart(id, updateRequest)

                if (updatedPart != null) {
                    call.respond(ApiResponse(success = true, data = updatedPart))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<PartDto>(success = false, error = "Part not found"))
                }
            } catch (e: IllegalArgumentException) {
                call.response.status(HttpStatusCode.BadRequest)
                call.respond(ApiResponse<PartDto>(success = false, error = e.message))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<PartDto>(success = false, error = e.message))
            }
        }

        // NEW: Update stock level
        put("/{id}/stock") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@put call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<Boolean>(success = false, error = "Invalid part ID"))

                val stockUpdate = call.receive<StockUpdateRequest>()
                if (stockUpdate.partId != id) {
                    call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<Boolean>(success = false, error = "Part ID mismatch"))
                    return@put
                }

                val success = partService.updateStock(id, stockUpdate.newStock)
                if (success) {
                    call.respond(ApiResponse(success = true, data = true))
                } else {
                    call.response.status(HttpStatusCode.BadRequest)
                    call.respond(ApiResponse<Boolean>(success = false, error = "Failed to update stock"))
                }
            } catch (e: IllegalArgumentException) {
                call.response.status(HttpStatusCode.BadRequest)
                call.respond(ApiResponse<Boolean>(success = false, error = e.message))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<Boolean>(success = false, error = e.message))
            }
        }

        // UPDATED: Delete part with detailed result
        delete("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<DeletePartResult>(success = false, error = "Invalid part ID"))

                val result = partService.deletePart(id)

                if (result.success) {
                    call.respond(ApiResponse(success = true, data = result))
                } else {
                    val statusCode = when (result.errorType) {
                        DeleteErrorType.NOT_FOUND -> HttpStatusCode.NotFound
                        DeleteErrorType.CONSTRAINT_VIOLATION -> HttpStatusCode.Conflict
                        DeleteErrorType.HAS_DEPENDENCIES -> HttpStatusCode.Conflict
                        else -> HttpStatusCode.InternalServerError
                    }
                    call.response.status(statusCode)
                    call.respond(ApiResponse<DeletePartResult>(success = false, error = result.message))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<DeletePartResult>(success = false, error = e.message))
            }
        }
        } // End authenticate block
    }
}

fun Route.transactionRoutes() {
    println("DEBUG: Registering transactionRoutes")
    val transactionService by inject<TransactionService>()

    route("/api/transactions") {
        get {
            try {
                val transactions = transactionService.getAllTransactions()
                call.respond(ApiResponse(success = true, data = transactions))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<TransactionDto>>(success = false, error = e.message))
            }
        }

        get("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<TransactionDto>(success = false, error = "Invalid transaction ID"))

                val transaction = transactionService.getTransactionById(id)
                if (transaction != null) {
                    call.respond(ApiResponse(success = true, data = transaction))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<TransactionDto>(success = false, error = "Transaction not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<TransactionDto>(success = false, error = e.message))
            }
        }

        get("/part/{partId}") {
            try {
                val partId = call.parameters["partId"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<List<TransactionDto>>(success = false, error = "Invalid part ID"))

                val transactions = transactionService.getTransactionsByPartId(partId)
                call.respond(ApiResponse(success = true, data = transactions))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<TransactionDto>>(success = false, error = e.message))
            }
        }

        get("/fast-moving") {
            try {
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 10
                val fastMovingParts = transactionService.getFastMovingParts(limit)
                call.respond(ApiResponse(success = true, data = fastMovingParts))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<FastMovingPartDto>>(success = false, error = e.message))
            }
        }

        post {
            try {
                val createRequest = call.receive<CreateTransactionRequest>()

                // UPDATED: Handle single transaction result
                val result = transactionService.createTransaction(createRequest)

                call.response.status(HttpStatusCode.Created)
                call.respond(ApiResponse(success = true, data = result))

            } catch (e: IllegalArgumentException) {
                call.response.status(HttpStatusCode.BadRequest)
                call.respond(ApiResponse<TransactionWithInvoicesDto>(success = false, error = e.message))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<TransactionWithInvoicesDto>(success = false, error = e.message))
            }
        }

        put("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@put call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<TransactionDto>(success = false, error = "Invalid transaction ID"))

                val paymentRequest = call.receive<PaymentUpdateRequest>()
                val updatedTransaction = transactionService.updatePayment(id, paymentRequest)

                if (updatedTransaction != null) {
                    call.respond(ApiResponse(success = true, data = updatedTransaction))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<TransactionDto>(success = false, error = "Transaction not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.BadRequest)
                call.respond(ApiResponse<TransactionDto>(success = false, error = e.message))
            }
        }

        delete("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<Boolean>(success = false, error = "Invalid transaction ID"))

                val deleted = transactionService.deleteTransaction(id)
                if (deleted) {
                    call.respond(ApiResponse(success = true, data = true))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<Boolean>(success = false, error = "Transaction not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<Boolean>(success = false, error = e.message))
            }
        }
    }
}

fun Route.invoiceRoutes() {
    println("DEBUG: Registering invoiceRoutes")
    val invoiceService by inject<InvoiceService>()

    route("/api/invoices") {
        get {
            try {
                val invoices = invoiceService.getAllInvoices()
                call.respond(ApiResponse(success = true, data = invoices))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<InvoiceDto>>(success = false, error = e.message))
            }
        }

        get("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<InvoiceDto>(success = false, error = "Invalid invoice ID"))

                val invoice = invoiceService.getInvoiceById(id)
                if (invoice != null) {
                    call.respond(ApiResponse(success = true, data = invoice))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<InvoiceDto>(success = false, error = "Invoice not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<InvoiceDto>(success = false, error = e.message))
            }
        }

        get("/transaction/{transactionId}") {
            println("DEBUG: IN GET /api/invoices/transaction/{transactionId} route, param= " + call.parameters["transactionId"])
            try {
                val transactionId = call.parameters["transactionId"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<List<InvoiceDto>>(success = false, error = "Invalid transaction ID"))
                println("DEBUG: Parsed transactionId= $transactionId")
                val invoices = invoiceService.getInvoicesByTransactionId(transactionId)
                if (invoices.isNotEmpty()) {
                    println("DEBUG: Returning invoices for transactionId $transactionId, count=${invoices.size}")
                    call.respond(ApiResponse(success = true, data = invoices))
                } else {
                    println("DEBUG: No invoices found for transactionId $transactionId")
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(
                        ApiResponse<List<InvoiceDto>>(success = false, error = "No invoices found for transaction")
                    )
                }
            } catch (e: Exception) {
                println("DEBUG: Exception in /transaction/{transactionId} handler: " + e)
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<InvoiceDto>>(success = false, error = e.message ?: "Server error")
                )
            }
        }

        get("/number/{invoiceNumber}") {
            try {
                val invoiceNumber = call.parameters["invoiceNumber"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<InvoiceDto>(success = false, error = "Invoice number is required"))

                val invoice = invoiceService.getInvoiceByNumber(invoiceNumber)
                if (invoice != null) {
                    call.respond(ApiResponse(success = true, data = invoice))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<InvoiceDto>(success = false, error = "Invoice not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<InvoiceDto>(success = false, error = e.message))
            }
        }

        delete("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<Boolean>(success = false, error = "Invalid invoice ID"))

                val deleted = invoiceService.deleteInvoice(id)
                if (deleted) {
                    call.respond(ApiResponse(success = true, data = true))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<Boolean>(success = false, error = "Invoice not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<Boolean>(success = false, error = e.message))
            }
        }

        get("/{id}/pdf") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<String>(success = false, error = "Invalid invoice ID"))

                val invoice = invoiceService.getInvoiceById(id)
                    ?: return@get call.respond(HttpStatusCode.NotFound,
                        ApiResponse<String>(success = false, error = "Invoice not found"))

                val pdfBytes = invoiceService.generateInvoicePDF(invoice)

                val filename = "invoice-${invoice.invoiceNumber}.pdf"
                call.response.header(
                    HttpHeaders.ContentDisposition,
                    ContentDisposition.Attachment.withParameter(ContentDisposition.Parameters.FileName, filename).toString()
                )
                call.respondBytes(pdfBytes, ContentType.Application.Pdf)
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<String>(success = false, error = e.message))
            }
        }

        get("/{id}/html") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<String>(success = false, error = "Invalid invoice ID"))

                val invoice = invoiceService.getInvoiceById(id)
                    ?: return@get call.respond(HttpStatusCode.NotFound,
                        ApiResponse<String>(success = false, error = "Invoice not found"))

                val htmlContent = invoiceService.generateInvoiceHTML(invoice)
                call.respondText(htmlContent, ContentType.Text.Html)
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<String>(success = false, error = e.message))
            }
        }

        get("/{id}/print-data") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<InvoicePrintData>(success = false, error = "Invalid invoice ID"))

                val invoice = invoiceService.getInvoiceById(id)
                    ?: return@get call.respond(HttpStatusCode.NotFound,
                        ApiResponse<InvoicePrintData>(success = false, error = "Invoice not found"))

                val printData = invoiceService.getInvoicePrintData(invoice)
                call.respond(ApiResponse(success = true, data = printData))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<InvoicePrintData>(success = false, error = e.message))
            }
        }

        post("/generate-bulk") {
            try {
                val request = call.receive<BulkInvoiceRequest>()
                val invoices = invoiceService.generateBulkInvoices(request)
                call.response.status(HttpStatusCode.Created)
                call.respond(ApiResponse(success = true, data = invoices))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.BadRequest)
                call.respond(ApiResponse<List<InvoiceDto>>(success = false, error = e.message))
            }
        }
    }
}

fun Route.statsRoutes() {
    println("DEBUG: Registering statsRoutes")
    val statsService by inject<StatsService>()

    route("/api/stats") {
        get("/inventory") {
            try {
                val stats = statsService.getInventoryStats()
                call.respond(ApiResponse(success = true, data = stats))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<InventoryStatsDto>(success = false, error = e.message))
            }
        }

        get("/categories") {
            try {
                val categoryStats = statsService.getCategoryStats()
                call.respond(ApiResponse(success = true, data = categoryStats))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<CategoryStatsDto>>(success = false, error = e.message))
            }
        }
    }
}

// Add health check routes
fun Route.healthRoutes() {
    get("/health") {
        try {
            call.respond(
                HttpStatusCode.OK, mapOf(
                    "status" to "healthy",
                    "timestamp" to System.currentTimeMillis().toString().toString(),
                    "service" to "inventory-management"
                )
            )
        } catch (e: Exception) {
            call.respond(
                HttpStatusCode.ServiceUnavailable, mapOf(
                    "status" to "unhealthy",
                    "error" to e.message,
                    "timestamp" to System.currentTimeMillis().toString().toString()
                )
            )
        }
    }

    get("/health/database") {
        try {
            // You can add database connectivity check here
            call.respond(
                HttpStatusCode.OK, mapOf(
                    "database" to "connected",
                    "timestamp" to System.currentTimeMillis().toString()
                )
            )
        } catch (e: Exception) {
            call.respond(
                HttpStatusCode.ServiceUnavailable, mapOf(
                    "database" to "disconnected",
                    "error" to e.message,
                    "timestamp" to System.currentTimeMillis().toString()
                )
            )
        }
    }
}
