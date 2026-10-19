package com.ecart.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ecart.backend.entity.Order;
import com.ecart.backend.entity.PaymentSubmission;
import com.ecart.backend.entity.User;
import com.ecart.backend.repository.CartItemRepository;
import com.ecart.backend.repository.OrderItemRepository;
import com.ecart.backend.repository.OrderRepository;
import com.ecart.backend.repository.PaymentSubmissionRepository;
import com.ecart.backend.repository.ProductRepository;
import com.ecart.backend.repository.UserRepository;
import com.ecart.backend.service.CartReservationService;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@ExtendWith(MockitoExtension.class)
class OrderControllerPaymentClaimTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PaymentSubmissionRepository paymentSubmissionRepository;

    @Mock
    private CartReservationService cartReservationService;

    private OrderController controller;
    private User user;
    private Order order;

    @BeforeEach
    void setUp() {
        controller = new OrderController(
                orderRepository,
                orderItemRepository,
                productRepository,
                cartItemRepository,
                userRepository,
                paymentSubmissionRepository,
                cartReservationService
        );

        user = new User();
        user.setId(7L);
        user.setEmail("customer@example.com");

        order = new Order();
        order.setId(11L);
        order.setUserId(7L);
        order.setStatus("PLACED");
    }

    @Test
    void paymentClaimPersistsReferenceForTheAuthenticatedCustomersOrder() {
        when(userRepository.findByEmail("customer@example.com"))
                .thenReturn(Optional.of(user));
        when(orderRepository.findByIdForUpdate(11L))
                .thenReturn(Optional.of(order));
        when(paymentSubmissionRepository.findByOrderIdForUpdate(11L))
                .thenReturn(Optional.empty());
        when(paymentSubmissionRepository.save(any(PaymentSubmission.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(orderRepository.save(order)).thenReturn(order);

        ResponseEntity<?> response = controller.submitPaymentClaim(
                11L,
                Map.of("reference", "UPIREF123456"),
                customerAuthentication()
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        Order savedOrder = assertInstanceOf(Order.class, response.getBody());
        assertEquals("PENDING_VERIFICATION", savedOrder.getPaymentStatus());
        assertEquals("UPIREF123456", savedOrder.getPaymentReference());
        verify(paymentSubmissionRepository).save(any(PaymentSubmission.class));
        verify(orderRepository).save(order);
    }

    private Authentication customerAuthentication() {
        return new UsernamePasswordAuthenticationToken(
                "customer@example.com",
                "",
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }
}
