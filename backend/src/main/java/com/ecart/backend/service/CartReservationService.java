package com.ecart.backend.service;

import com.ecart.backend.entity.CartItem;
import com.ecart.backend.repository.CartItemRepository;
import com.ecart.backend.repository.ProductRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CartReservationService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final long reservationMinutes;

    public CartReservationService(
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            @Value("${cart.reservation.expiration-minutes:30}")
                    long reservationMinutes) {

        if (reservationMinutes <= 0) {
            throw new IllegalArgumentException(
                    "Cart reservation expiration must be positive."
            );
        }
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.reservationMinutes = reservationMinutes;
    }

    @Transactional
    public boolean ensureReservation(CartItem cartItem) {
        if (isReservationActive(cartItem)) {
            return true;
        }

        if (cartItem.getQuantity() == null
                || cartItem.getQuantity() <= 0
                || productRepository.decreaseStock(
                        cartItem.getProductId(),
                        cartItem.getQuantity()) == 0) {
            return false;
        }

        renewReservation(cartItem);
        cartItemRepository.save(cartItem);
        return true;
    }

    public boolean isReservationActive(CartItem cartItem) {
        return cartItem.getReservationExpiresAt() != null
                && cartItem.getReservationExpiresAt()
                        .isAfter(LocalDateTime.now());
    }

    public void renewReservation(CartItem cartItem) {
        cartItem.setReservationExpiresAt(
                LocalDateTime.now().plusMinutes(reservationMinutes)
        );
    }

    @Transactional
    public void releaseExpiredReservationsForUser(Long userId) {
        LocalDateTime now = LocalDateTime.now();

        for (CartItem item
                : cartItemRepository.findByUserIdForUpdate(userId)) {
            if (isExpired(item, now)) {
                release(item);
            }
        }
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void releaseExpiredReservations() {
        LocalDateTime now = LocalDateTime.now();

        for (CartItem item
                : cartItemRepository.findExpiredReservationsForUpdate(now)) {
            release(item);
        }
    }

    @Transactional
    public void release(CartItem item) {
        if (item.getReservationExpiresAt() == null) {
            return;
        }

        if (item.getQuantity() == null
                || item.getQuantity() <= 0
                || productRepository.increaseStock(
                        item.getProductId(),
                        item.getQuantity()) == 0) {
            throw new IllegalStateException(
                    "Could not release reserved stock for cart item "
                            + item.getId()
            );
        }

        item.setReservationExpiresAt(null);
        cartItemRepository.save(item);
    }

    private boolean isExpired(CartItem item, LocalDateTime now) {
        return item.getReservationExpiresAt() != null
                && !item.getReservationExpiresAt().isAfter(now);
    }
}
