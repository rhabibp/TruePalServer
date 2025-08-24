package com.newmotion

import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlin.test.*

class PartsApiTest {

    @Test
    fun testPartsApi() = testApplication {
        // Test GET /api/parts
        val response = client.get("/api/parts")
        println("[DEBUG_LOG] Response status: ${response.status}")
        println("[DEBUG_LOG] Response body: ${response.bodyAsText()}")

        assertEquals(HttpStatusCode.OK, response.status)
        val responseBody = response.bodyAsText()
        assertTrue(responseBody.contains("success"))

        // Check if we have actual parts data
        if (responseBody.contains("\"data\":[")) {
            println("[DEBUG_LOG] Parts data found in response")
        } else {
            println("[DEBUG_LOG] No parts data found - response might be empty array")
        }
    }
}
