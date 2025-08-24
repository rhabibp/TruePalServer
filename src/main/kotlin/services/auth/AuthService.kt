package com.newmotion.services.auth

import com.newmotion.models_dtos.*
import com.newmotion.repository.UserRepository
import com.newmotion.auth.JwtConfig
import kotlinx.datetime.Clock
import kotlinx.datetime.toInstant
import kotlinx.datetime.TimeZone
import org.mindrot.jbcrypt.BCrypt

interface AuthService {
    suspend fun login(loginRequest: LoginRequest): LoginResponse?
    suspend fun register(registerRequest: RegisterRequest): UserDto
    suspend fun getCurrentUser(userId: Long): UserDto?
    suspend fun changePassword(userId: Long, changePasswordRequest: ChangePasswordRequest): Boolean
    suspend fun updateUser(userId: Long, updateUserRequest: UpdateUserRequest): UserDto?
    suspend fun getAllUsers(): List<UserDto>
    suspend fun deleteUser(userId: Long): Boolean
    suspend fun toggleUserStatus(userId: Long): UserDto?
}

class AuthServiceImpl(
    private val userRepository: UserRepository
) : AuthService {

    override suspend fun login(loginRequest: LoginRequest): LoginResponse? {
        val user = userRepository.findByUsername(loginRequest.username) ?: return null
        
        if (!user.isActive) {
            throw IllegalArgumentException("User account is deactivated")
        }

        if (!BCrypt.checkpw(loginRequest.password, user.passwordHash)) {
            return null
        }

        // Update last login time
        userRepository.updateLastLogin(user.id.value, Clock.System.now())

        val token = JwtConfig.makeToken(user.id.value, user.username, user.role)
        val expiresAt = JwtConfig.getExpirationInstant()

        return LoginResponse(
            token = token,
            user = UserDto(
                id = user.id.value,
                username = user.username,
                email = user.email,
                fullName = user.fullName,
                role = user.role,
                isActive = user.isActive,
                createdAt = user.createdAt.toInstant(kotlinx.datetime.TimeZone.UTC),
                lastLoginAt = Clock.System.now()
            ),
            expiresAt = expiresAt
        )
    }

    override suspend fun register(registerRequest: RegisterRequest): UserDto {
        // Check if username already exists
        if (userRepository.findByUsername(registerRequest.username) != null) {
            throw IllegalArgumentException("Username already exists")
        }

        // Check if email already exists
        if (userRepository.findByEmail(registerRequest.email) != null) {
            throw IllegalArgumentException("Email already exists")
        }

        val hashedPassword = BCrypt.hashpw(registerRequest.password, BCrypt.gensalt())
        
        val userDto = UserDto(
            username = registerRequest.username,
            email = registerRequest.email,
            fullName = registerRequest.fullName,
            role = registerRequest.role,
            isActive = true,
            createdAt = Clock.System.now()
        )

        return userRepository.createUser(userDto, hashedPassword)
    }

    override suspend fun getCurrentUser(userId: Long): UserDto? {
        return userRepository.findById(userId)
    }

    override suspend fun changePassword(userId: Long, changePasswordRequest: ChangePasswordRequest): Boolean {
        val user = userRepository.findUserById(userId) ?: return false

        if (!BCrypt.checkpw(changePasswordRequest.currentPassword, user.passwordHash)) {
            throw IllegalArgumentException("Current password is incorrect")
        }

        val newHashedPassword = BCrypt.hashpw(changePasswordRequest.newPassword, BCrypt.gensalt())
        return userRepository.updatePassword(userId, newHashedPassword)
    }

    override suspend fun updateUser(userId: Long, updateUserRequest: UpdateUserRequest): UserDto? {
        val existingUser = userRepository.findById(userId) ?: return null

        // Check if email is being changed and already exists
        if (updateUserRequest.email != null && updateUserRequest.email != existingUser.email) {
            if (userRepository.findByEmail(updateUserRequest.email) != null) {
                throw IllegalArgumentException("Email already exists")
            }
        }

        return userRepository.updateUser(userId, updateUserRequest)
    }

    override suspend fun getAllUsers(): List<UserDto> {
        return userRepository.getAllUsers()
    }

    override suspend fun deleteUser(userId: Long): Boolean {
        return userRepository.deleteUser(userId)
    }

    override suspend fun toggleUserStatus(userId: Long): UserDto? {
        val user = userRepository.findById(userId) ?: return null
        val updateRequest = UpdateUserRequest(isActive = !user.isActive)
        return userRepository.updateUser(userId, updateRequest)
    }
}