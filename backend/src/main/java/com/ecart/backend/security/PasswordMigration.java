package com.ecart.backend.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.function.Consumer;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public final class PasswordMigration {

    private PasswordMigration() {
    }

    public static boolean matchesAndUpgrade(
            String rawPassword,
            String storedPassword,
            BCryptPasswordEncoder passwordEncoder,
            Consumer<String> saveUpgradedPassword) {

        if (rawPassword == null || storedPassword == null) {
            return false;
        }

        if (isBCryptHash(storedPassword)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }

        if (!MessageDigest.isEqual(
                rawPassword.getBytes(StandardCharsets.UTF_8),
                storedPassword.getBytes(StandardCharsets.UTF_8)
        )) {
            return false;
        }

        saveUpgradedPassword.accept(passwordEncoder.encode(rawPassword));
        return true;
    }

    private static boolean isBCryptHash(String storedPassword) {
        return storedPassword.startsWith("$2a$")
                || storedPassword.startsWith("$2b$")
                || storedPassword.startsWith("$2y$");
    }
}
