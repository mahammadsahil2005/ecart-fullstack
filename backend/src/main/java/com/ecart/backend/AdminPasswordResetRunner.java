package com.ecart.backend;

import com.ecart.backend.entity.Admin;
import com.ecart.backend.repository.AdminRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Arrays;
import java.util.Optional;

@Configuration
public class AdminPasswordResetRunner {

    @Bean
    CommandLineRunner resetAdminPassword(
            AdminRepository adminRepository) {

        return args -> {

            if (!Arrays.asList(args)
                    .contains("--reset-admin-password")) {
                return;
            }

            String newPassword =
                    System.getenv("ECART_ADMIN_NEW_PASSWORD");

            if (newPassword == null
                    || newPassword.length() < 12) {

                System.out.println(
                    "Set ECART_ADMIN_NEW_PASSWORD to a password " +
                    "of at least 12 characters."
                );

                return;
            }

            Optional<Admin> result =
                    adminRepository.findByEmail("admin@ecart.com");

            if (result.isEmpty()) {

                System.out.println(
                    "Admin account not found."
                );

                return;
            }

            Admin admin = result.get();

            BCryptPasswordEncoder encoder =
                    new BCryptPasswordEncoder();

            admin.setPassword(
                    encoder.encode(newPassword)
            );

            adminRepository.save(admin);

            System.out.println(
                "Admin password updated successfully."
            );
        };
    }
}