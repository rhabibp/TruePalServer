package com.newmotion.auth

import com.auth0.jwt.exceptions.JWTVerificationException
import com.newmotion.models_dtos.UserRole
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.response.*

data class UserPrincipal(
    val userId: Long,
    val username: String,
    val role: UserRole
) : Principal

fun Application.configureAuthentication() {
    install(Authentication) {
        jwt("auth-jwt") {
            verifier(JwtConfig.verifier)
            validate { credential ->
                try {
                    val userId = credential.payload.getClaim("userId").asLong()
                    val username = credential.payload.getClaim("username").asString()
                    val roleString = credential.payload.getClaim("role").asString()
                    val role = UserRole.valueOf(roleString)

                    if (userId != null && username != null) {
                        UserPrincipal(userId, username, role)
                    } else {
                        null
                    }
                } catch (e: Exception) {
                    null
                }
            }
            challenge { defaultScheme, realm ->
                call.respond(HttpStatusCode.Unauthorized, "Token is not valid or has expired")
            }
        }
    }
}

/**
 * Extension to get the current user from the authenticated call
 */
fun ApplicationCall.getCurrentUser(): UserPrincipal? {
    return this.principal<UserPrincipal>()
}

/**
 * Extension to check if current user has admin role
 */
fun ApplicationCall.isAdmin(): Boolean {
    return getCurrentUser()?.role == UserRole.ADMIN
}

/**
 * Extension to check if current user has at least staff role (ADMIN or STAFF)
 */
fun ApplicationCall.hasMinimumRole(role: UserRole): Boolean {
    val currentUser = getCurrentUser() ?: return false
    return when (role) {
        UserRole.STAFF -> currentUser.role in listOf(UserRole.ADMIN, UserRole.STAFF)
        UserRole.ADMIN -> currentUser.role == UserRole.ADMIN
    }
}