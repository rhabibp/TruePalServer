package com.newmotion.routes

import com.newmotion.models_dtos.*
import com.newmotion.services.auth.AuthService
import com.newmotion.repository.UserRepository
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import org.koin.ktor.ext.inject

// Simple response DTOs for setup endpoints
@Serializable
data class SetupResponse(
    val success: Boolean,
    val message: String,
    val data: SetupData? = null
)

@Serializable
data class SetupData(
    val username: String,
    val email: String,
    val fullName: String
)

@Serializable
data class SetupStatusResponse(
    val success: Boolean,
    val setupRequired: Boolean,
    val userCount: Int,
    val message: String
)

fun Route.setupRoutes() {
    val authService by inject<AuthService>()
    val userRepository by inject<UserRepository>()

    route("/api/setup") {
        // Initial setup endpoint to create first admin user
        post("/admin") {
            try {
                // Check if any users exist - only allow if database is empty
                val existingUsers = authService.getAllUsers()
                if (existingUsers.isNotEmpty()) {
                    call.response.status(HttpStatusCode.BadRequest)
                    call.respond(SetupResponse(
                        success = false,
                        message = "Setup already completed. Users already exist in the system."
                    ))
                    return@post
                }

                // Get the admin user details from request
                val setupRequest = call.receive<SetupAdminRequest>()

                // Validate the request
                if (setupRequest.username.isBlank() ||
                    setupRequest.password.length < 6 ||
                    setupRequest.email.isBlank() ||
                    setupRequest.fullName.isBlank()) {
                    call.response.status(HttpStatusCode.BadRequest)
                    call.respond(SetupResponse(
                        success = false,
                        message = "Invalid input. Username, email, and fullName are required. Password must be at least 6 characters."
                    ))
                    return@post
                }

                // Create the admin user
                val adminRequest = RegisterRequest(
                    username = setupRequest.username,
                    password = setupRequest.password,
                    email = setupRequest.email,
                    fullName = setupRequest.fullName,
                    role = UserRole.ADMIN
                )

                val adminUser = authService.register(adminRequest)
                call.application.log.info("Created initial admin user: ${adminUser.username}")

                call.response.status(HttpStatusCode.Created)
                call.respond(SetupResponse(
                    success = true,
                    message = "Initial admin user created successfully",
                    data = SetupData(
                        username = adminUser.username,
                        email = adminUser.email,
                        fullName = adminUser.fullName
                    )
                ))

            } catch (e: IllegalArgumentException) {
                call.response.status(HttpStatusCode.BadRequest)
                call.respond(SetupResponse(
                    success = false,
                    message = "Setup failed: ${e.message}"
                ))
            } catch (e: Exception) {
                call.application.log.error("Setup failed", e)
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(SetupResponse(
                    success = false,
                    message = "Setup failed: ${e.message}"
                ))
            }
        }

        // Check setup status
        get("/status") {
            try {
                val existingUsers = authService.getAllUsers()
                val isSetupRequired = existingUsers.isEmpty()

                call.respond(SetupStatusResponse(
                    success = true,
                    setupRequired = isSetupRequired,
                    userCount = existingUsers.size,
                    message = if (isSetupRequired) "Setup required - no users found" else "Setup completed - users exist"
                ))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(SetupStatusResponse(
                    success = false,
                    setupRequired = false,
                    userCount = 0,
                    message = "Failed to check setup status: ${e.message}"
                ))
            }
        }
    }
}