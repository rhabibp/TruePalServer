package com.newmotion.services.customer

import com.newmotion.models_dtos.Customer
import com.newmotion.repository.CustomerRepository

class CustomerServiceImpl(private val customerRepository: CustomerRepository) : CustomerService {
    override suspend fun getAllCustomers(searchQuery: String?): List<Customer> {
        return customerRepository.getAll(searchQuery)
    }

    override suspend fun getCustomerById(id: Long): Customer? {
        return customerRepository.getById(id)
    }

    override suspend fun createCustomer(customer: Customer): Customer {
        return customerRepository.create(customer)
    }

    override suspend fun updateCustomer(id: Long, customer: Customer): Boolean {
        return customerRepository.update(id, customer)
    }

    override suspend fun deleteCustomer(id: Long): Boolean {
        return customerRepository.delete(id)
    }
}