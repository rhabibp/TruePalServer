package com.newmotion.repository

import com.newmotion.models_dtos.Customer

interface CustomerRepository {
    suspend fun getAll(searchQuery: String?): List<Customer>
    suspend fun getById(id: Long): Customer?
    suspend fun create(customer: Customer): Customer
    suspend fun update(id: Long, customer: Customer): Boolean
    suspend fun delete(id: Long): Boolean
}