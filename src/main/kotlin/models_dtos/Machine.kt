package com.newmotion.models_dtos

import kotlinx.serialization.Serializable

@Serializable
data class Machine(
    val model: String,
    val quantity: Int,
    val serialNumber: String?
)