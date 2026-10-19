package com.ecart.backend.security;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import org.junit.jupiter.api.Test;

class JwtServiceTest {

    @Test
    void acceptsBase64EncodedSecret() {
        byte[] secret = "0123456789abcdef0123456789abcdef"
                .getBytes(StandardCharsets.UTF_8);

        var signingKey = JwtService.createSigningKey(
                Base64.getEncoder().encodeToString(secret)
        );

        assertArrayEquals(secret, signingKey.getEncoded());
    }

    @Test
    void acceptsLongPlainTextSecretContainingSpaces() {
        String secret = "a sufficiently long development secret with spaces";

        var signingKey = JwtService.createSigningKey(secret);

        assertArrayEquals(
                secret.getBytes(StandardCharsets.UTF_8),
                signingKey.getEncoded()
        );
    }

    @Test
    void rejectsShortSecretWithActionableMessage() {
        assertThrows(
                IllegalStateException.class,
                () -> JwtService.createSigningKey("too short")
        );
    }
}
