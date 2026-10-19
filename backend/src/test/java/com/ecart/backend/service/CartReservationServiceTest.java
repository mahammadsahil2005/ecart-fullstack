package com.ecart.backend.service;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ecart.backend.entity.CartItem;
import com.ecart.backend.repository.CartItemRepository;
import com.ecart.backend.repository.ProductRepository;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CartReservationServiceTest {

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private ProductRepository productRepository;

    @Test
    void ensureReservationDeductsStockAndSetsExpiry() {
        CartReservationService service = new CartReservationService(
                cartItemRepository,
                productRepository,
                30
        );
        CartItem item = new CartItem();
        item.setId(1L);
        item.setProductId(42L);
        item.setQuantity(2);
        when(productRepository.decreaseStock(42L, 2)).thenReturn(1);

        assertTrue(service.ensureReservation(item));

        assertNotNull(item.getReservationExpiresAt());
        verify(cartItemRepository).save(item);
    }

    @Test
    void activeReservationIsNotDeductedTwiceAtCheckout() {
        CartReservationService service = new CartReservationService(
                cartItemRepository,
                productRepository,
                30
        );
        CartItem item = new CartItem();
        item.setId(1L);
        item.setProductId(42L);
        item.setQuantity(2);
        item.setReservationExpiresAt(LocalDateTime.now().plusMinutes(10));

        assertTrue(service.ensureReservation(item));

        verify(productRepository, never()).decreaseStock(anyLong(), anyInt());
    }

    @Test
    void expiredReservationRestoresStockAndClearsExpiry() {
        CartReservationService service = new CartReservationService(
                cartItemRepository,
                productRepository,
                30
        );
        CartItem item = new CartItem();
        item.setId(1L);
        item.setProductId(42L);
        item.setQuantity(2);
        item.setReservationExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(cartItemRepository.findExpiredReservationsForUpdate(any()))
                .thenReturn(List.of(item));
        when(productRepository.increaseStock(42L, 2)).thenReturn(1);

        service.releaseExpiredReservations();

        assertNull(item.getReservationExpiresAt());
        verify(cartItemRepository).save(item);
    }
}
