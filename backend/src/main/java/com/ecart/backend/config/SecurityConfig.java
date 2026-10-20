
package com.ecart.backend.config;

import com.ecart.backend.security.JwtAuthenticationFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
            // Enable CORS for the React frontend
            .cors(cors ->
                cors.configurationSource(corsConfigurationSource())
            )

            // Disable CSRF for this stateless API
            .csrf(csrf -> csrf.disable())

            // Do not create HTTP sessions
            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            // Authorization rules
            .authorizeHttpRequests(auth -> auth

                // Allow browser CORS preflight requests
                .requestMatchers(
                    HttpMethod.OPTIONS, "/**"
                ).permitAll()

                // Public user registration and login
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/users/register",
                    "/api/users/login"
                ).permitAll()

                // Public admin login and initial admin setup
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/admin/login",
                    "/api/admin/register"
                ).permitAll()

                .requestMatchers(
                    HttpMethod.GET,
                    "/api/admin/setup-status"
                ).permitAll()

                // Public product browsing
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/products",
                    "/api/products/**"
                ).permitAll()

                // Product changes and image uploads are admin-only
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/products/**",
                    "/api/upload/**"
                ).hasRole("ADMIN")

                .requestMatchers(
                    HttpMethod.PUT,
                    "/api/products/**"
                ).hasRole("ADMIN")

                .requestMatchers(
                    HttpMethod.DELETE,
                    "/api/products/**"
                ).hasRole("ADMIN")

                // Cart access requires authentication
                .requestMatchers(
                    "/api/cart/**"
                ).authenticated()

                // Payment administration is restricted to admins
                .requestMatchers(
                    "/api/payments/admin/**"
                ).hasRole("ADMIN")

                // User payment endpoints require USER role
                .requestMatchers(
                    "/api/payments/**"
                ).hasRole("USER")

                // Other admin endpoints require ADMIN role
                .requestMatchers(
                    "/api/admin/**"
                ).hasRole("ADMIN")

                // All remaining endpoints require authentication
                .anyRequest().authenticated()
            )

            // Process JWTs before username/password authentication
            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        // Allow local development and deployed Vercel frontend
        configuration.setAllowedOrigins(
            List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "https://ecart-fullstack.vercel.app"
            )
        );

        // Allowed HTTP methods
        configuration.setAllowedMethods(
            List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "PATCH",
                "OPTIONS"
            )
        );

        // Allowed request headers
        configuration.setAllowedHeaders(
            List.of(
                "Authorization",
                "Content-Type",
                "X-Admin-Bootstrap-Token"
            )
        );

        // Cache CORS preflight response
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
            "/**",
            configuration
        );

        return source;
    }
}
