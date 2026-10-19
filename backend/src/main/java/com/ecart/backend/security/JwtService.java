
package com.ecart.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.io.DecodingException;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    private SecretKey getSigningKey() {
        return createSigningKey(secretKey);
    }

    static SecretKey createSigningKey(String configuredSecret) {
        if (configuredSecret == null ||
                configuredSecret.isBlank()) {
            throw new IllegalStateException(
                    "JWT secret must be configured."
            );
        }

        String normalizedSecret = configuredSecret.trim();
        byte[] keyBytes;

        try {
            keyBytes = Decoders.BASE64.decode(normalizedSecret);
        } catch (DecodingException exception) {
            keyBytes = normalizedSecret.getBytes(
                    StandardCharsets.UTF_8
            );
        }

        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "JWT secret must contain at least 32 bytes."
            );
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }

    // Generate JWT token with role
    public String generateToken(String email, String role) {
        if (jwtExpiration <= 0) {
            throw new IllegalStateException(
                    "JWT expiration must be greater than zero."
            );
        }

        if (!"USER".equals(role) &&
                !"ADMIN".equals(role)) {
            throw new IllegalArgumentException(
                    "Invalid JWT role."
            );
        }

        Date now = new Date();

        Date expirationDate = new Date(
                now.getTime() + jwtExpiration
        );

        return Jwts.builder()
                .subject(email)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expirationDate)
                .signWith(getSigningKey())
                .compact();
    }

    // Extract email
    public String extractEmail(String token) {
        return extractClaim(
                token,
                Claims::getSubject
        );
    }

    // Extract role
    public String extractRole(String token) {
        return extractClaim(
                token,
                claims -> claims.get("role", String.class)
        );
    }

    // Extract any claim
    public <T> T extractClaim(
            String token,
            Function<Claims, T> claimsResolver) {

        Claims claims = extractAllClaims(token);

        return claimsResolver.apply(claims);
    }

    // Verify token signature and expiration
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // Validate token and email
    public boolean isTokenValid(
            String token,
            String email) {

        String tokenEmail = extractEmail(token);

        return tokenEmail != null
                && tokenEmail.equals(email)
                && !isTokenExpired(token);
    }

    // Check expiration
    private boolean isTokenExpired(String token) {
        Date expiration = extractClaim(
                token,
                Claims::getExpiration
        );

        return expiration == null ||
                !expiration.after(new Date());
    }
}
