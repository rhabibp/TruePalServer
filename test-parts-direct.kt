package com.newmotion

import com.newmotion.database.DatabaseFactory
import com.newmotion.di.appModule
import com.newmotion.routes.configureRouting
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import org.koin.ktor.plugin.Koin
import kotlin.test.*

class PartsApiTest {
    
    @Test
    fun testPartsApi() = testApplication {
        application {
            // Initialize database
            DatabaseFactory.init(environment.config)
            
            // Configure Koin
            install(Koin) {
                modules(appModule)
            }
            
            // Configure serialization
            install(ContentNegotiation) {
                json(Json {
                    prettyPrint = true
                    isLenient = true
                    ignoreUnknownKeys = true
                    explicitNulls = false
                })
            }
            
            // Configure routing
            configureRouting()
        }
        
        // Test GET /api/parts
        val response = client.get("/api/parts")
        println("Response status: ${response.status}")
        println("Response body: ${response.bodyAsText()}")
        
        assertEquals(HttpStatusCode.OK, response.status)
        val responseBody = response.bodyAsText()
        assertTrue(responseBody.contains("success"))
    }
}