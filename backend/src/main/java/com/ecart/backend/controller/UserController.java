package com.ecart.backend.controller;

import com.ecart.backend.entity.User;
import com.ecart.backend.repository.UserRepository;
import com.ecart.backend.security.JwtService;
import com.ecart.backend.security.PasswordMigration;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    // Constructor
    public UserController(
            UserRepository userRepository,
            JwtService jwtService) {

        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    // REGISTER USER
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(
            @RequestBody User user) {

        // Validate input
        if (user.getEmail() == null
                || user.getEmail().isBlank()
                || user.getPassword() == null
                || user.getPassword().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Email and password are required"
                    ));
        }

        // Check whether email already exists
        if (userRepository
                .findByEmail(user.getEmail())
                .isPresent()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Email is already registered"
                    ));
        }

        // Hash password before saving
        user.setPassword(
                passwordEncoder.encode(user.getPassword())
        );

        // Save user
        User savedUser = userRepository.save(user);

        // Return safe user information
        return ResponseEntity.ok(
                Map.of(
                        "id", savedUser.getId(),
                        "name", savedUser.getName() == null
                                ? "" : savedUser.getName(),
                        "email", savedUser.getEmail()
                )
        );
    }

    // LOGIN USER
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(
            @RequestBody User loginUser) {

        // Validate input
        if (loginUser.getEmail() == null
                || loginUser.getEmail().isBlank()
                || loginUser.getPassword() == null
                || loginUser.getPassword().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Email and password are required"
                    ));
        }

        // Find user by email
        User user = userRepository
                .findByEmail(loginUser.getEmail())
                .orElse(null);

        // Verify credentials
        if (user == null
                || !PasswordMigration.matchesAndUpgrade(
                        loginUser.getPassword(),
                        user.getPassword(),
                        passwordEncoder,
                        upgradedPassword -> {
                            user.setPassword(upgradedPassword);
                            userRepository.save(user);
                        })) {

            return ResponseEntity.status(401)
                    .body(Map.of(
                            "message",
                            "Invalid email or password"
                    ));
        }

        // Generate JWT token
        String token = jwtService.generateToken(
                user.getEmail(),
                "USER"
        );

        // Return user information and JWT token
        return ResponseEntity.ok(
                Map.of(
                        "id", user.getId(),
                        "name", user.getName() == null
                                ? "" : user.getName(),
                        "email", user.getEmail(),
                        "token", token
                )
        );
    }
}