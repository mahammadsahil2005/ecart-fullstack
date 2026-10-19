package com.ecart.backend.controller;

import com.ecart.backend.entity.Admin;
import com.ecart.backend.repository.AdminRepository;
import com.ecart.backend.security.JwtService;
import com.ecart.backend.security.PasswordMigration;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:5173")
public class AdminController {

    private final AdminRepository adminRepository;
    private final JwtService jwtService;

    @Value("${admin.bootstrap-token:}")
    private String bootstrapToken;

    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    public AdminController(
            AdminRepository adminRepository,
            JwtService jwtService) {

        this.adminRepository = adminRepository;
        this.jwtService = jwtService;
    }

    @GetMapping("/setup-status")
    public Map<String, Boolean> getSetupStatus() {
        return Map.of(
                "initialSetupAvailable", adminRepository.count() == 0,
                "bootstrapConfigured", !bootstrapToken.isBlank()
        );
    }

    // Admin registration
    @PostMapping("/register")
    public synchronized ResponseEntity<?> registerAdmin(
            @RequestBody Admin admin,
            @RequestHeader(
                    name = "X-Admin-Bootstrap-Token",
                    required = false
            ) String suppliedBootstrapToken) {

        if (bootstrapToken.isBlank()
                || suppliedBootstrapToken == null
                || !MessageDigest.isEqual(
                        bootstrapToken.getBytes(StandardCharsets.UTF_8),
                        suppliedBootstrapToken.getBytes(StandardCharsets.UTF_8)
                )) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "A valid admin setup token is required."
                    ));
        }

        if (adminRepository.count() > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Initial admin setup is already complete."
                    ));
        }

        if (admin.getEmail() == null
                || admin.getEmail().isBlank()
                || admin.getPassword() == null
                || admin.getPassword().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Email and password are required"
                    ));
        }

        if (admin.getPassword().length() < 12) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Password must contain at least 12 characters."
                    ));
        }

        admin.setEmail(admin.getEmail().trim());

        if (adminRepository.findByEmailIgnoreCase(admin.getEmail())
                .isPresent()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Email is already registered"
                    ));
        }

        // Hash the password before saving
        admin.setPassword(
                passwordEncoder.encode(admin.getPassword())
        );

        Admin savedAdmin = adminRepository.save(admin);

        // Never return the password or password hash
        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of(
                        "id", savedAdmin.getId(),
                        "name", savedAdmin.getName() == null
                                ? ""
                                : savedAdmin.getName(),
                        "email", savedAdmin.getEmail()
                )
        );
    }

    // Admin login
    @PostMapping("/login")
    public ResponseEntity<?> loginAdmin(
            @RequestBody Admin loginAdmin) {

        if (loginAdmin.getEmail() == null
                || loginAdmin.getEmail().isBlank()
                || loginAdmin.getPassword() == null
                || loginAdmin.getPassword().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Email and password are required"
                    ));
        }

        // Find admin by email
        Admin admin = adminRepository
                .findByEmailIgnoreCase(loginAdmin.getEmail().trim())
                .orElse(null);

        // Verify the password
        if (admin == null
                || !PasswordMigration.matchesAndUpgrade(
                        loginAdmin.getPassword(),
                        admin.getPassword(),
                        passwordEncoder,
                        upgradedPassword -> {
                            admin.setPassword(upgradedPassword);
                            adminRepository.save(admin);
                        })) {

            return ResponseEntity.status(401)
                    .body(Map.of(
                            "message",
                            "Invalid admin email or password"
                    ));
        }

        // Generate JWT token
        String token = jwtService.generateToken(
                admin.getEmail(),
                "ADMIN"
        );

        // Return admin details and JWT
        return ResponseEntity.ok(
                Map.of(
                        "id", admin.getId(),
                        "name", admin.getName() == null
                                ? ""
                                : admin.getName(),
                        "email", admin.getEmail(),
                        "token", token
                )
        );
    }

}