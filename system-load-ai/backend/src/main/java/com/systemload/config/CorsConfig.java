package com.systemload.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Global CORS Configuration for the application
 * This allows frontend running on different ports to access the API
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(
                    "http://localhost:3000",     // React dev server
                    "http://127.0.0.1:3000",    // Alternative localhost
                    "http://localhost:5173",    // Vite default port
                    "http://127.0.0.1:5173"     // Alternative Vite
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600); // Cache preflight response for 1 hour
    }
} 