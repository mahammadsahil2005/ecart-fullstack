package com.ecart.backend.controller;

import com.ecart.backend.entity.Order;
import com.ecart.backend.entity.User;
import com.ecart.backend.repository.UserRepository;
import com.ecart.backend.service.CheckoutService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/checkout")
@CrossOrigin(origins = "http://localhost:5173")
public class CheckoutController {

    private final CheckoutService checkoutService;
    private final UserRepository userRepository;

    public CheckoutController(
            CheckoutService checkoutService,
            UserRepository userRepository) {

        this.checkoutService = checkoutService;
        this.userRepository = userRepository;
    }

    @PostMapping("/{userId}")
    public ResponseEntity<?> checkout(
            @PathVariable Long userId,
            @RequestBody CheckoutRequest request,
            Authentication authentication) {

        try {

            // 1. Verify that the user is authenticated
            if (authentication == null
                    || !authentication.isAuthenticated()) {

                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "error",
                                "Please log in before checking out."
                        ));
            }

            // 2. Find the logged-in user using their JWT identity
            User user = userRepository
                    .findByEmail(authentication.getName())
                    .orElse(null);

            if (user == null) {

                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "error",
                                "User account not found."
                        ));
            }

            // 3. Prevent one user from checking out
            // using another user's ID
            if (!user.getId().equals(userId)) {

                return ResponseEntity
                        .status(HttpStatus.FORBIDDEN)
                        .body(Map.of(
                                "error",
                                "You cannot place orders for another user."
                        ));
            }

            // 4. Validate request body
            if (request == null) {

                return ResponseEntity
                        .badRequest()
                        .body(Map.of(
                                "error",
                                "Delivery address is required."
                        ));
            }

            // 5. Process checkout
            Order order = checkoutService.checkout(
                    user.getId(),
                    request.getFullName(),
                    request.getPhone(),
                    request.getStreet(),
                    request.getCity(),
                    request.getState(),
                    request.getPincode()
            );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(order);

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "error",
                            e.getMessage()
                    ));

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "error",
                            "Checkout failed. Please try again."
                    ));
        }
    }

    public static class CheckoutRequest {

        private String fullName;
        private String phone;
        private String street;
        private String city;
        private String state;
        private String pincode;

        public CheckoutRequest() {
        }

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String fullName) {
            this.fullName = fullName;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getStreet() {
            return street;
        }

        public void setStreet(String street) {
            this.street = street;
        }

        public String getCity() {
            return city;
        }

        public void setCity(String city) {
            this.city = city;
        }

        public String getState() {
            return state;
        }

        public void setState(String state) {
            this.state = state;
        }

        public String getPincode() {
            return pincode;
        }

        public void setPincode(String pincode) {
            this.pincode = pincode;
        }
    }
}