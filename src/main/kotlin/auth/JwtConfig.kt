package com.newmotion.auth

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.auth0.jwt.exceptions.JWTVerificationException
import com.newmotion.models_dtos.UserRole
import kotlinx.datetime.*
import java.util.*

object JwtConfig {
    private const val secret = "your-secret-key-change-this-in-production"
    private const val issuer = "truepal-server"
    private const val audience = "truepal-client"
    private const val validityInMs = 36_000_00 * 24 * 7 // 7 days

    private val algorithm = Algorithm.HMAC512(secret)

    val verifier = JWT.require(algorithm)
        .withAudience(audience)
        .withIssuer(issuer)
        .build()

    /**
     * Produce a JWT token for this user
     */
    fun makeToken(userId: Long, username: String, role: UserRole): String = JWT.create()
        .withSubject("Authentication")
        .withIssuer(issuer)
        .withAudience(audience)
        .withClaim("userId", userId)
        .withClaim("username", username)
        .withClaim("role", role.name)
        .withExpiresAt(getExpiration())
        .sign(algorithm)

    private fun getExpiration() = Date(System.currentTimeMillis() + validityInMs)

    /**
     * Calculate when the token expires as an Instant
     */
    fun getExpirationInstant(): Instant = Instant.fromEpochMilliseconds(System.currentTimeMillis() + validityInMs)

    /**
     * Verify a JWT token and return the user ID if valid
     */
    fun verifyToken(token: String): Long? {
        return try {
            val decodedToken = verifier.verify(token)
            decodedToken.getClaim("userId").asLong()
        } catch (exception: JWTVerificationException) {
            null
        }
    }

    /**
     * Extract user role from JWT token
     */
    fun getUserRole(token: String): UserRole? {
        return try {
            val decodedToken = verifier.verify(token)
            val roleString = decodedToken.getClaim("role").asString()
            UserRole.valueOf(roleString)
        } catch (exception: Exception) {
            null
        }
    }

    /**
     * Extract username from JWT token
     */
    fun getUsername(token: String): String? {
        return try {
            val decodedToken = verifier.verify(token)
            decodedToken.getClaim("username").asString()
        } catch (exception: JWTVerificationException) {
            null
        }
    }
}