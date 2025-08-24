package com.newmotion.di



import com.newmotion.database.*
import com.newmotion.repository.*
import com.newmotion.services.*
import com.newmotion.services.customer.CustomerService
import com.newmotion.services.customer.CustomerServiceImpl
import com.newmotion.services.auth.AuthService
import com.newmotion.services.auth.AuthServiceImpl
import io.ktor.server.config.*
import org.koin.dsl.module



val appModule = module {

    // Repositories - no database dependency injection needed since we use DatabaseFactory
    single<CategoryRepository> { CategoryRepositoryImpl() }
    single<PartRepository> { PartRepositoryImpl() }
    single<TransactionRepository> { TransactionRepositoryImpl() }
    single<StatsRepository> { StatsRepositoryImpl() }
    single<InvoiceRepository> { InvoiceRepositoryImpl() }
    single<CustomerRepository> { CustomerRepositoryImpl() }
    single<UserRepository> { UserRepositoryImpl() }

    // Services
    single<CategoryService> { CategoryServiceImpl(get()) }
    single<PartService> { PartServiceImpl(get()) }
    single<TransactionService> { TransactionServiceImpl(get(), get(), get()) }
    single<StatsService> { StatsServiceImpl(get()) }
    single<InvoiceService> { InvoiceServiceImpl(get()) }
    single<CustomerService> { CustomerServiceImpl(get()) }
    single<AuthService> { AuthServiceImpl(get()) }
}
