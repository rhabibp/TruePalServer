package com.newmotion.routes.auth

import com.newmotion.models_dtos.*
import com.newmotion.services.auth.AuthService
import com.newmotion.auth.getCurrentUser
import com.newmotion.auth.hasMinimumRole
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.koin.ktor.ext.inject

fun Route.authRoutes() {
    val authService by inject<AuthService>()

    route("/api/auth") {
        // Public routes (no authentication required)
        post("/login") {
            try {
                val loginRequest = call.receive<LoginRequest>()
                val loginResponse = authService.login(loginRequest)
                
                if (loginResponse != null) {
                    call.respond(ApiResponse.success(loginResponse, "Login successful"))
                } else {
                    call.response.status(HttpStatusCode.Unauthorized)
                    call.respond(ApiResponse.error<LoginResponse>("Invalid username or password"))
                }
            } catch (e: IllegalArgumentException) {
                call.response.status(HttpStatusCode.BadRequest)
                call.respond(ApiResponse.error<LoginResponse>(e.message ?: "Login failed"))
            } catch (e: Exception) {
                call.response.status(HttpStatusCode.InternalServerError)
                call.respond(ApiResponse.error<LoginResponse>("Internal server error"))
            }
        }

        // Protected routes (authentication required)
        authenticate("auth-jwt") {
            get("/profile") {
                try {
                    val currentUser = call.getCurrentUser()
                    if (currentUser != null) {
                        val userDetails = authService.getCurrentUser(currentUser.userId)
                        if (userDetails != null) {
                            call.respond(ApiResponse.success(userDetails))
                        } else {
                            call.response.status(HttpStatusCode.NotFound)
                            call.respond(ApiResponse.error<UserDto>("User not found"))
                        }
                    } else {
                        call.response.status(HttpStatusCode.Unauthorized)
                        call.respond(ApiResponse.error<UserDto>("Authentication required"))
                    }
                } catch (e: Exception) {
                    call.response.status(HttpStatusCode.InternalServerError)
                    call.respond(ApiResponse.error<UserDto>(e.message ?: "Internal server error"))
                }
            }

            post("/change-password") {
                try {
                    val currentUser = call.getCurrentUser()
                    if (currentUser != null) {
                        val changePasswordRequest = call.receive<ChangePasswordRequest>()
                        val success = authService.changePassword(currentUser.userId, changePasswordRequest)
                        
                        if (success) {
                            call.respond(ApiResponse.success(true, "Password changed successfully"))
                        } else {
                            call.response.status(HttpStatusCode.BadRequest)
                            call.respond(ApiResponse.error<Boolean>("Failed to change password"))
                        }
                    } else {
                        call.response.status(HttpStatusCode.Unauthorized)
                        call.respond(ApiResponse.error<Boolean>("Authentication required"))
                    }
                } catch (e: IllegalArgumentException) {
                    call.response.status(HttpStatusCode.BadRequest)
                    call.respond(ApiResponse.error<Boolean>(e.message ?: "Invalid request"))
                } catch (e: Exception) {
                    call.response.status(HttpStatusCode.InternalServerError)
                    call.respond(ApiResponse.error<Boolean>("Internal server error"))
                }
            }

            put("/profile") {
                try {
                    val currentUser = call.getCurrentUser()
                    if (currentUser != null) {
                        val updateRequest = call.receive<UpdateUserRequest>()
                        val updatedUser = authService.updateUser(currentUser.userId, updateRequest)
                        
                        if (updatedUser != null) {
                            call.respond(ApiResponse.success(updatedUser, "Profile updated successfully"))
                        } else {
                            call.response.status(HttpStatusCode.NotFound)
                            call.respond(ApiResponse.error<UserDto>("User not found"))
                        }
                    } else {
                        call.response.status(HttpStatusCode.Unauthorized)
                        call.respond(ApiResponse.error<UserDto>("Authentication required"))
                    }
                } catch (e: IllegalArgumentException) {
                    call.response.status(HttpStatusCode.BadRequest)
                    call.respond(ApiResponse.error<UserDto>(e.message ?: "Invalid request"))
                } catch (e: Exception) {
                    call.response.status(HttpStatusCode.InternalServerError)
                    call.respond(ApiResponse.error<UserDto>("Internal server error"))
                }
            }
        }
    }

    // Admin-only user management routes
    route("/api/admin") {
        authenticate("auth-jwt") {
            // Only admin can access these routes
            intercept(ApplicationCallPipeline.Call) {
                if (!call.hasMinimumRole(UserRole.ADMIN)) {
                    call.response.status(HttpStatusCode.Forbidden)
                    call.respond(ApiResponse.error<Any>("Admin access required"))
                    finish()
                }
            }

            route("/users") {
                get {
                    try {
                        val users = authService.getAllUsers()
                        call.respond(ApiResponse.success(users))
                    } catch (e: Exception) {
                        call.response.status(HttpStatusCode.InternalServerError)
                        call.respond(ApiResponse.error<List<UserDto>>("Internal server error"))
                    }
                }

                post {
                    try {
                        val registerRequest = call.receive<RegisterRequest>()
                        val newUser = authService.register(registerRequest)
                        call.response.status(HttpStatusCode.Created)
                        call.respond(ApiResponse.success(newUser, "User created successfully"))
                    } catch (e: IllegalArgumentException) {
                        call.response.status(HttpStatusCode.BadRequest)
                        call.respond(ApiResponse.error<UserDto>(e.message ?: "Registration failed"))
                    } catch (e: Exception) {
                        call.response.status(HttpStatusCode.InternalServerError)
                        call.respond(ApiResponse.error<UserDto>("Internal server error"))
                    }
                }

                put("/{id}") {
                    try {
                        val userId = call.parameters["id"]?.toLongOrNull()
                        if (userId == null) {
                            call.response.status(HttpStatusCode.BadRequest)
                            call.respond(ApiResponse.error<UserDto>("Invalid user ID"))
                            return@put
                        }

                        val updateRequest = call.receive<UpdateUserRequest>()
                        val updatedUser = authService.updateUser(userId, updateRequest)
                        
                        if (updatedUser != null) {
                            call.respond(ApiResponse.success(updatedUser, "User updated successfully"))
                        } else {
                            call.response.status(HttpStatusCode.NotFound)
                            call.respond(ApiResponse.error<UserDto>("User not found"))
                        }
                    } catch (e: IllegalArgumentException) {
                        call.response.status(HttpStatusCode.BadRequest)
                        call.respond(ApiResponse.error<UserDto>(e.message ?: "Invalid request"))
                    } catch (e: Exception) {
                        call.response.status(HttpStatusCode.InternalServerError)
                        call.respond(ApiResponse.error<UserDto>("Internal server error"))
                    }
                }

                delete("/{id}") {
                    try {
                        val userId = call.parameters["id"]?.toLongOrNull()
                        if (userId == null) {
                            call.response.status(HttpStatusCode.BadRequest)
                            call.respond(ApiResponse.error<Boolean>("Invalid user ID"))
                            return@delete
                        }

                        val currentUser = call.getCurrentUser()
                        if (currentUser?.userId == userId) {
                            call.response.status(HttpStatusCode.BadRequest)
                            call.respond(ApiResponse.error<Boolean>("Cannot delete your own account"))
                            return@delete
                        }

                        val deleted = authService.deleteUser(userId)
                        if (deleted) {
                            call.respond(ApiResponse.success(true, "User deleted successfully"))
                        } else {
                            call.response.status(HttpStatusCode.NotFound)
                            call.respond(ApiResponse.error<Boolean>("User not found"))
                        }
                    } catch (e: Exception) {
                        call.response.status(HttpStatusCode.InternalServerError)
                        call.respond(ApiResponse.error<Boolean>("Internal server error"))
                    }
                }

                put("/{id}/toggle-status") {
                    try {
                        val userId = call.parameters["id"]?.toLongOrNull()
                        println("Toggle status request for userId: $userId")
                        
                        if (userId == null) {
                            println("Invalid user ID provided: ${call.parameters["id"]}")
                            call.response.status(HttpStatusCode.BadRequest)
                            call.respond(ApiResponse.error<UserDto>("Invalid user ID"))
                            return@put
                        }

                        val currentUser = call.getCurrentUser()
                        println("Current user: ${currentUser?.userId}, target user: $userId")
                        
                        if (currentUser?.userId == userId) {
                            println("User attempted to toggle their own account status")
                            call.response.status(HttpStatusCode.BadRequest)
                            call.respond(ApiResponse.error<UserDto>("Cannot toggle your own account status"))
                            return@put
                        }

                        println("Calling toggleUserStatus service...")
                        val updatedUser = authService.toggleUserStatus(userId)
                        println("Service returned: $updatedUser")
                        
                        if (updatedUser != null) {
                            println("Successfully toggled user status. New status: ${updatedUser.isActive}")
                            call.respond(ApiResponse.success(updatedUser, "User status updated successfully"))
                        } else {
                            println("User not found for ID: $userId")
                            call.response.status(HttpStatusCode.NotFound)
                            call.respond(ApiResponse.error<UserDto>("User not found"))
                        }
                    } catch (e: Exception) {
                        println("Error in toggle-status endpoint: ${e.message}")
                        e.printStackTrace()
                        call.response.status(HttpStatusCode.InternalServerError)
                        call.respond(ApiResponse.error<UserDto>("Internal server error: ${e.message}"))
                    }
                }
            }
        }
    }
}
