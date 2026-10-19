package com.ecart.backend.controller;

import com.ecart.backend.entity.CartItem;
import com.ecart.backend.entity.Product;
import com.ecart.backend.entity.User;

import com.ecart.backend.repository.CartItemRepository;
import com.ecart.backend.repository.ProductRepository;
import com.ecart.backend.repository.UserRepository;
import com.ecart.backend.service.CartReservationService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
@CrossOrigin(origins = "http://localhost:5173")
public class CartController {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CartReservationService cartReservationService;

    public CartController(
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            CartReservationService cartReservationService) {

        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.cartReservationService = cartReservationService;
    }

    // Find the currently authenticated user
    private User getAuthenticatedUser(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null) {

            return null;
        }

        return userRepository
                .findByEmail(authentication.getName())
                .orElse(null);
    }

    // Get only the authenticated user's cart
    @GetMapping
    public ResponseEntity<?> getCart(
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not authenticated."));
        }

        cartReservationService.releaseExpiredReservationsForUser(user.getId());

        List<CartItem> items =
                cartItemRepository.findByUserId(user.getId());

        return ResponseEntity.ok(items);
    }

    // Add a product to the authenticated user's cart
    @PostMapping
    @Transactional
    public ResponseEntity<?> addToCart(
            @RequestBody CartItem requestItem,
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not authenticated."));
        }

        cartReservationService.releaseExpiredReservationsForUser(user.getId());

        if (requestItem.getProductId() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Product ID is required."));
        }

        if (requestItem.getQuantity() == null
                || requestItem.getQuantity() <= 0) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "error",
                            "Quantity must be greater than zero."
                    ));
        }

        Product product = productRepository
                .findById(requestItem.getProductId())
                .orElse(null);

        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Product not found."));
        }

        int availableStock = product.getQuantity();

        if (availableStock <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Product is out of stock."));
        }

        CartItem existingItem = cartItemRepository
                .findByUserIdAndProductIdForUpdate(
                        user.getId(),
                        product.getId())
                .orElse(null);

        int requestedQuantity;

        try {
            requestedQuantity = Math.addExact(
                    existingItem == null ? 0 : existingItem.getQuantity(),
                    requestItem.getQuantity()
            );
        } catch (ArithmeticException exception) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Requested quantity is too large."));
        }

        int quantityToReserve = existingItem != null
                && cartReservationService.isReservationActive(existingItem)
                ? requestItem.getQuantity()
                : requestedQuantity;

        if (availableStock < quantityToReserve
                || productRepository.decreaseStock(
                        product.getId(),
                        quantityToReserve) == 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "error",
                            "Only " + availableStock
                                    + " items are available."
                    ));
        }

        if (existingItem != null) {
            existingItem.setQuantity(requestedQuantity);
            cartReservationService.renewReservation(existingItem);

            return ResponseEntity.ok(
                    cartItemRepository.save(existingItem));
        }

        // Never trust userId or id from the request body.
        CartItem newItem = new CartItem();
        newItem.setUserId(user.getId());
        newItem.setProductId(product.getId());
        newItem.setQuantity(requestItem.getQuantity());
        cartReservationService.renewReservation(newItem);

        CartItem savedItem = cartItemRepository.save(newItem);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(savedItem);
    }

    // Update quantity only if this cart item belongs to the user
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateQuantity(
            @PathVariable Long id,
            @RequestBody CartItem updatedItem,
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not authenticated."));
        }

        cartReservationService.releaseExpiredReservationsForUser(user.getId());

        CartItem cartItem = cartItemRepository
                .findByIdForUpdate(id)
                .orElse(null);

        if (cartItem == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Cart item not found."));
        }

        if (!user.getId().equals(cartItem.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "error",
                            "You cannot modify another user's cart item."
                    ));
        }

        if (updatedItem.getQuantity() == null
                || updatedItem.getQuantity() <= 0) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "error",
                            "Quantity must be greater than zero."
                    ));
        }

        Product product = productRepository
                .findById(cartItem.getProductId())
                .orElse(null);

        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Product not found."));
        }

        boolean reservationActive =
                cartReservationService.isReservationActive(cartItem);
        int quantityToReserve = reservationActive
                ? updatedItem.getQuantity() - cartItem.getQuantity()
                : updatedItem.getQuantity();

        if (quantityToReserve > 0
                && productRepository.decreaseStock(
                        product.getId(),
                        quantityToReserve) == 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error",
                    "Requested quantity exceeds available stock."
            ));
        }

        if (quantityToReserve < 0
                && productRepository.increaseStock(
                        product.getId(),
                        -quantityToReserve) == 0) {
            throw new IllegalStateException(
                    "Could not release stock for cart item " + id
            );
        }

        cartItem.setQuantity(updatedItem.getQuantity());
        cartReservationService.renewReservation(cartItem);

        return ResponseEntity.ok(
                cartItemRepository.save(cartItem));
    }

    // Delete only if this cart item belongs to the user
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> removeFromCart(
            @PathVariable Long id,
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not authenticated."));
        }

        cartReservationService.releaseExpiredReservationsForUser(user.getId());

        CartItem cartItem = cartItemRepository
                .findByIdForUpdate(id)
                .orElse(null);

        if (cartItem == null) {
            return ResponseEntity.notFound().build();
        }

        if (!user.getId().equals(cartItem.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "error",
                            "You cannot delete another user's cart item."
                    ));
        }

        if (cartReservationService.isReservationActive(cartItem)) {
            cartReservationService.release(cartItem);
        }

        cartItemRepository.delete(cartItem);

        return ResponseEntity.noContent().build();
    }
}