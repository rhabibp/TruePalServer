package com.newmotion.models_dtos

import kotlinx.serialization.Serializable


@Serializable
data class Customer(
    val id: Long?, // Changed to Long to match the database ID type
    val name: String,
    val machines: List<Machine>,
    val contactName: String,
    val contactPhone: String,
    val address: String,
    val contactEmail: String?,
    val inCharge: String,
    val businessType: String?
)