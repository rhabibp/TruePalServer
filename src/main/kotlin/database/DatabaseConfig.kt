package com.newmotion.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.server.config.*
import org.flywaydb.core.Flyway
import org.flywaydb.core.api.exception.FlywayValidateException
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.transaction
import javax.sql.DataSource

object DatabaseFactory {
    private lateinit var database: Database
    private lateinit var dataSource: HikariDataSource

    fun init(config: ApplicationConfig) {
        val dbConfig = config.config("database")

        val hikariConfig = HikariConfig().apply {
            jdbcUrl = dbConfig.property("url").getString()
            driverClassName = dbConfig.property("driver").getString()
            username = dbConfig.property("user").getString()
            password = dbConfig.property("password").getString()
            maximumPoolSize = dbConfig.property("maxPoolSize").getString().toInt()
            minimumIdle = dbConfig.property("minIdleConnections").getString().toInt()

            // Connection pool settings
            connectionTimeout = 30000
            idleTimeout = 600000
            maxLifetime = 1800000
            isAutoCommit = false
            transactionIsolation = "TRANSACTION_READ_COMMITTED"

            // Performance tuning
            addDataSourceProperty("cachePrepStmts", "true")
            addDataSourceProperty("prepStmtCacheSize", "250")
            addDataSourceProperty("prepStmtCacheSqlLimit", "2048")
            addDataSourceProperty("useServerPrepStmts", "true")
            addDataSourceProperty("useLocalSessionState", "true")
            addDataSourceProperty("rewriteBatchedStatements", "true")
        }

        dataSource = HikariDataSource(hikariConfig)

        // Run migrations FIRST before connecting Exposed
        runFlyway(dataSource)

        // THEN connect Exposed
        database = Database.connect(dataSource)

        // Verify tables exist (but don't create them - Flyway handles this)
        transaction(database) {
            try {
                // Just verify the tables exist by checking if we can query them
                SchemaUtils.checkMappingConsistence(
                    Categories, Parts, Transactions, TransactionItems,
                    Invoices, InvoiceItems, Users, Customers, Machines
                )
                println("Database schema verification successful!")
            } catch (e: Exception) {
                println("Schema verification failed: ${e.message}")
                throw e
            }
        }

        println("Database connected successfully!")
    }

    private fun runFlyway(dataSource: DataSource) {
        println("Starting Flyway migration...")

        val flyway = Flyway.configure()
            .dataSource(dataSource)
            .baselineOnMigrate(true)  // Handle existing databases
            .baselineVersion("1")     // Existing schema is V1
            .validateOnMigrate(true)  // Validate migrations
            .outOfOrder(false)        // Run migrations in order
            .locations("classpath:db/migration") // Migration files location
            .table("flyway_schema_history") // Explicit schema history table
            .cleanOnValidationError(false) // Don't clean on validation errors
            .mixed(true) // Allow mixing transactional and non-transactional migrations
            .group(true) // Group migrations in single transaction when possible
            .load()

        try {
            // Check if schema history table exists and baseline if needed
            val info = flyway.info()
            val current = info.current()

            if (current == null) {
                println("No migration history found. Performing baseline...")
                flyway.baseline()
            }

            // Get current migration info
            println("Current migration state:")
            info.all().forEach { migrationInfo ->
                println("  ${migrationInfo.version} - ${migrationInfo.description} [${migrationInfo.state}]")
            }

            // Check for pending migrations
            val pending = info.pending()
            if (pending.isEmpty()) {
                println("No pending migrations found.")
            } else {
                println("Found ${pending.size} pending migration(s)")
                pending.forEach { migration ->
                    println("  Pending: ${migration.version} - ${migration.description}")
                }
            }

            // Run migrations
            val result = flyway.migrate()
            if (result.migrationsExecuted > 0) {
                println("Successfully applied ${result.migrationsExecuted} migration(s)")
                result.migrations.forEach { migration ->
                    println("  Applied: ${migration.version} - ${migration.description}")
                }
            } else {
                println("No migrations were executed (database is up to date)")
            }

            // Show final state
            println("Final migration state:")
            flyway.info().all().forEach { migrationInfo ->
                println("  ${migrationInfo.version} - ${migrationInfo.description} [${migrationInfo.state}]")
            }

        } catch (e: FlywayValidateException) {
            println("Flyway validation failed: ${e.message}")
            println("Attempting to repair and retry...")

            try {
                // Repair the schema history
                flyway.repair()
                println("Flyway repair completed successfully")

                // Try migration again
                val result = flyway.migrate()
                if (result.migrationsExecuted > 0) {
                    println("Successfully applied ${result.migrationsExecuted} migration(s) after repair")
                } else {
                    println("No migrations executed after repair - database is up to date")
                }

                // Show final state after repair
                println("Final migration state after repair:")
                flyway.info().all().forEach { migrationInfo ->
                    println("  ${migrationInfo.version} - ${migrationInfo.description} [${migrationInfo.state}]")
                }

            } catch (repairException: Exception) {
                println("Flyway repair failed: ${repairException.message}")
                println("Manual intervention may be required. Consider:")
                println("1. Running 'flyway repair' manually")
                println("2. Checking migration file checksums")
                println("3. Rolling back to a known good state")
                throw repairException
            }

        } catch (e: Exception) {
            println("Flyway migration failed: ${e.message}")
            e.printStackTrace()

            // Try to get more details about the failure
            try {
                val info = flyway.info()
                val failed = info.all().filter { it.state.isFailed }
                if (failed.isNotEmpty()) {
                    println("Failed migrations:")
                    failed.forEach { migration ->
                        println("  Failed: ${migration.version} - ${migration.description} [${migration.state}]")
                    }
                }
            } catch (infoException: Exception) {
                println("Could not retrieve migration info after failure: ${infoException.message}")
            }

            throw e
        }
    }

    fun getDatabase(): Database {
        return if (::database.isInitialized) {
            database
        } else {
            throw IllegalStateException("Database not initialized. Call init() first.")
        }
    }

    fun close() {
        if (::dataSource.isInitialized) {
            dataSource.close()
            println("Database connection closed")
        }
    }
}

// Suspend transaction function for coroutines
suspend fun <T> dbQuery(block: suspend () -> T): T {
    return newSuspendedTransaction(db = DatabaseFactory.getDatabase()) {
        block()
    }
}

// Non-suspend transaction function for initialization
fun <T> dbQueryBlocking(block: () -> T): T {
    return transaction(DatabaseFactory.getDatabase()) {
        block()
    }
}

// Utility function to safely check if database is connected
fun isDatabaseConnected(): Boolean {
    return try {
        DatabaseFactory.getDatabase()
        true
    } catch (e: Exception) {
        false
    }
}