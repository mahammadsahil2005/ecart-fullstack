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

                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Public user registration and login
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/users/register",
                    "/api/users/login"
                ).permitAll()

                // Public admin login and one-time first-admin setup
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

                // Cart access requires a valid authenticated user
                .requestMatchers(
                    "/api/cart/**"
                ).authenticated()

                // Payment submissions require user authentication;
                // review actions are restricted to admins.
                .requestMatchers(
                    "/api/payments/admin/**"
                ).hasRole("ADMIN")
                .requestMatchers(
                    "/api/payments/**"
                ).hasRole("USER")

                // Only admins can access admin endpoints
                .requestMatchers(
                    "/api/admin/**"
                ).hasRole("ADMIN")

                // Every other endpoint requires authentication
                .anyRequest().authenticated()
            )

            // Process JWTs before Spring Security's
            // username/password authentication filter
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

        // Allow Vite's default and fallback localhost development ports.
        configuration.setAllowedOriginPatterns(
            List.of(
                "http://localhost:*",
                "http://127.0.0.1:*"
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