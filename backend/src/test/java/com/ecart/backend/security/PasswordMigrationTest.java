package com.ecart.backend.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class PasswordMigrationTest {

    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    @Test
    void upgradesMatchingLegacyPlainTextPassword() {
        AtomicReference<String> savedPassword = new AtomicReference<>();

        boolean matched = PasswordMigration.matchesAndUpgrade(
                "legacy-password",
                "legacy-password",
                passwordEncoder,
                savedPassword::set
        );

        assertTrue(matched);
        assertTrue(passwordEncoder.matches(
                "legacy-password",
                savedPassword.get()
        ));
    }

    @Test
    void rejectsNonMatchingLegacyPasswordWithoutUpgrade() {
        AtomicReference<String> savedPassword = new AtomicReference<>();

        boolean matched = PasswordMigration.matchesAndUpgrade(
                "wrong-password",
                "legacy-password",
                passwordEncoder,
                savedPassword::set
        );

        assertFalse(matched);
        assertTrue(savedPassword.get() == null);
    }

    @Test
    void continuesToValidateExistingBCryptPasswords() {
        String storedHash = passwordEncoder.encode("existing-password");
        AtomicReference<String> savedPassword = new AtomicReference<>();

        boolean matched = PasswordMigration.matchesAndUpgrade(
                "existing-password",
                storedHash,
                passwordEncoder,
                savedPassword::set
        );

        assertTrue(matched);
        assertTrue(savedPassword.get() == null);
    }
}
