plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.ktor)
    alias(libs.plugins.kotlin.plugin.serialization)
    application
}

group = "com.inventory"
version = "0.0.1"

application {
    mainClass = "io.ktor.server.netty.EngineMain"
}

repositories {
    mavenCentral()
}
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

dependencies {
    // Ktor Server
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.netty)
    implementation(libs.ktor.server.config.yaml)
    implementation(libs.ktor.server.content.negotiation)
    implementation(libs.ktor.server.cors)
    implementation(libs.ktor.server.call.logging)
    implementation(libs.ktor.server.status.pages)

    // Serialization
    implementation(libs.ktor.serialization.kotlinx.json)
    implementation(libs.kotlinx.serialization.json)

    // Database
    implementation(libs.exposed.core)
    implementation(libs.exposed.dao)
    implementation(libs.exposed.jdbc)
    implementation(libs.exposed.kotlin.datetime)
    implementation(libs.postgresql)

    // Connection Pool
    implementation(libs.hikaricp)

    // Dependency Injection
    implementation(libs.koin.ktor)
    implementation(libs.koin.logger.slf4j)
    implementation("io.ktor:ktor-server-html-builder:3.2.3")
    // Logging
    implementation(libs.logback.classic)

    // DateTime
    implementation(libs.kotlinx.datetime)

    // Authentication & Security
    implementation("io.ktor:ktor-server-auth:2.3.7")
    implementation("io.ktor:ktor-server-auth-jwt:2.3.7")
    implementation("io.ktor:ktor-server-sessions:2.3.7")
    implementation("org.mindrot:jbcrypt:0.4")

    // Testing
    testImplementation(libs.ktor.server.test.host)
    testImplementation(libs.kotlin.test.junit)
    testImplementation(libs.koin.test)
    testImplementation("com.h2database:h2:2.2.224")
    implementation("org.xhtmlrenderer:flying-saucer-pdf-openpdf:9.1.22")
    implementation("org.flywaydb:flyway-core:9.22.3")
}
