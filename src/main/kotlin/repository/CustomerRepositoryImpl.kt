package com.newmotion.repository

import com.newmotion.database.Customer as CustomerEntity
import com.newmotion.database.Customers
import com.newmotion.database.Machine as MachineEntity
import com.newmotion.database.Machines
import com.newmotion.database.dbQuery
import com.newmotion.models_dtos.Customer
import com.newmotion.models_dtos.Machine
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.like
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.or
import org.jetbrains.exposed.sql.transactions.transaction

class CustomerRepositoryImpl : CustomerRepository {

    private fun toCustomerDto(row: CustomerEntity): Customer = Customer(
        id = row.id.value,
        name = row.name,
        machines = row.machines.map { toMachineDto(it) },
        contactName = row.contactName,
        contactPhone = row.contactPhone,
        address = row.address,
        contactEmail = row.contactEmail,
        inCharge = row.inCharge,
        businessType = row.businessType
    )

    private fun toMachineDto(row: MachineEntity): Machine = Machine(
        model = row.model,
        quantity = row.quantity,
        serialNumber = row.serialNumber
    )

    override suspend fun getAll(searchQuery: String?): List<Customer> = dbQuery {
        val query = if (searchQuery.isNullOrBlank()) {
            CustomerEntity.all()
        } else {
            CustomerEntity.find {
                (Customers.name like "%$searchQuery%") or
                        (Customers.contactName like "%$searchQuery%")
            }
        }
        query.map(::toCustomerDto)
    }

    override suspend fun getById(id: Long): Customer? = dbQuery {
        CustomerEntity.findById(id)?.let(::toCustomerDto)
    }

    override suspend fun create(customer: Customer): Customer = dbQuery {
        val newCustomer = CustomerEntity.new {
            name = customer.name
            contactName = customer.contactName
            contactPhone = customer.contactPhone
            address = customer.address
            contactEmail = customer.contactEmail
            inCharge = customer.inCharge
            businessType = customer.businessType
        }
        customer.machines.forEach {
            MachineEntity.new {
                this.customer = newCustomer
                this.model = it.model
                this.quantity = it.quantity
                this.serialNumber = it.serialNumber
            }
        }
        toCustomerDto(newCustomer)
    }

    override suspend fun update(id: Long, customer: Customer): Boolean = dbQuery {
        val existingCustomer = CustomerEntity.findById(id)
        if (existingCustomer != null) {
            existingCustomer.name = customer.name
            existingCustomer.contactName = customer.contactName
            existingCustomer.contactPhone = customer.contactPhone
            existingCustomer.address = customer.address
            existingCustomer.contactEmail = customer.contactEmail
            existingCustomer.inCharge = customer.inCharge
            existingCustomer.businessType = customer.businessType

            transaction {
                Machines.deleteWhere { Machines.customerId eq id }
            }

            customer.machines.forEach {
                MachineEntity.new {
                    this.customer = existingCustomer
                    this.model = it.model
                    this.quantity = it.quantity
                    this.serialNumber = it.serialNumber
                }
            }
            true
        } else {
            false
        }
    }

    override suspend fun delete(id: Long): Boolean = dbQuery {
        val customer = CustomerEntity.findById(id)
        if (customer != null) {
            transaction {
                Machines.deleteWhere { Machines.customerId eq id }
            }
            customer.delete()
            true
        } else {
            false
        }
    }
}