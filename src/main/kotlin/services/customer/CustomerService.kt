package com.newmotion.services.customer

import com.newmotion.models_dtos.Customer

interface CustomerService {
    suspend fun getAllCustomers(searchQuery: String? = null): List<Customer>
    suspend fun getCustomerById(id: Long): Customer?
    suspend fun createCustomer(customer: Customer): Customer
    suspend fun updateCustomer(id: Long, customer: Customer): Boolean
    suspend fun deleteCustomer(id: Long): Boolean
}