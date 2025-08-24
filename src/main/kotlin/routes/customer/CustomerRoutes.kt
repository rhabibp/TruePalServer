package com.newmotion.routes

import com.newmotion.models_dtos.ApiResponse
import com.newmotion.models_dtos.Customer
import com.newmotion.services.customer.CustomerService
import io.ktor.http.* 
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.koin.ktor.ext.inject

fun Route.customerRoutes() {
    val customerService by inject<CustomerService>()

    route("/api/customers") {
        get {
            try {
                val searchQuery = call.request.queryParameters["search"]
                val customers = customerService.getAllCustomers(searchQuery)
                call.respond(ApiResponse(success = true, data = customers))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<List<Customer>>(success = false, error = e.message))
            }
        }

        get("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<Customer>(success = false, error = "Invalid customer ID"))

                val customer = customerService.getCustomerById(id)
                if (customer != null) {
                    call.respond(ApiResponse(success = true, data = customer))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<Customer>(success = false, error = "Customer not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<Customer>(success = false, error = e.message))
            }
        }

        post {
            try {
                val customer = call.receive<Customer>()
                val newCustomer = customerService.createCustomer(customer)
                call.response.status(HttpStatusCode.Created)
                call.respond(ApiResponse(success = true, data = newCustomer))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.BadRequest)
                call.respond(ApiResponse<Customer>(success = false, error = e.message))
            }
        }

        put("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@put call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<Customer>(success = false, error = "Invalid customer ID"))

                val customer = call.receive<Customer>()
                val updated = customerService.updateCustomer(id, customer)
                if (updated) {
                    call.respond(ApiResponse(success = true, data = true))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<Boolean>(success = false, error = "Customer not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.BadRequest)
                call.respond(ApiResponse<Boolean>(success = false, error = e.message))
            }
        }

        delete("/{id}") {
            try {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest,
                        ApiResponse<Boolean>(success = false, error = "Invalid customer ID"))

                val deleted = customerService.deleteCustomer(id)
                if (deleted) {
                    call.respond(ApiResponse(success = true, data = true))
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                    call.respond(ApiResponse<Boolean>(success = false, error = "Customer not found"))
                }
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse<Boolean>(success = false, error = e.message))
            }
        }
    }
}