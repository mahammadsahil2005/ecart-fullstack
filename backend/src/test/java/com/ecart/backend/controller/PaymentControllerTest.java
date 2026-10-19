package com.ecart.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ecart.backend.entity.Order;
import com.ecart.backend.entity.PaymentSubmission;
import com.ecart.backend.entity.User;
import com.ecart.backend.repository.OrderRepository;
import com.ecart.backend.repository.PaymentSubmissionRepository;
import com.ecart.backend.repository.UserRepository;

import java.util.List;
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
class PaymentControllerTest {

    @Mock
    private PaymentSubmissionRepository paymentRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

    private PaymentController controller;
    private User user;
    private Order order;

    @BeforeEach
    void setUp() {
        controller = new PaymentController(
                paymentRepository,
                orderRepository,
                userRepository
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
    void submittingReferencePersistsPendingStatusOnPaymentAndOrder() {
        when(userRepository.findByEmail("customer@example.com"))
                .thenReturn(Optional.of(user));
        when(orderRepository.findByIdForUpdate(11L))
                .thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderIdForUpdate(11L))
                .thenReturn(Optional.empty());
        when(paymentRepository.save(any(PaymentSubmission.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<?> response = controller.submitPaymentReference(
                11L,
                request("UPIREF123456"),
                userAuthentication()
        );

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        PaymentSubmission saved = assertInstanceOf(
                PaymentSubmission.class,
                response.getBody()
        );
        assertEquals("PENDING_VERIFICATION", saved.getStatus());
        assertEquals("UPIREF123456", saved.getReference());
        assertEquals("PENDING_VERIFICATION", order.getPaymentStatus());
        assertEquals("UPIREF123456", order.getPaymentReference());
        verify(orderRepository).save(order);
    }

    @Test
    void submittingPaymentForAnotherUsersOrderIsForbidden() {
        when(userRepository.findByEmail("customer@example.com"))
                .thenReturn(Optional.of(user));
        order.setUserId(99L);
        when(orderRepository.findByIdForUpdate(11L))
                .thenReturn(Optional.of(order));

        ResponseEntity<?> response = controller.submitPaymentReference(
                11L,
                request("UPIREF123456"),
                userAuthentication()
        );

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(paymentRepository, never()).save(any(PaymentSubmission.class));
    }

    @Test
    void invalidReferenceIsRejectedBeforeLoadingOrder() {
        when(userRepository.findByEmail("customer@example.com"))
                .thenReturn(Optional.of(user));

        ResponseEntity<?> response = controller.submitPaymentReference(
                11L,
                request("short"),
                userAuthentication()
        );

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(orderRepository, never()).findByIdForUpdate(11L);
    }

    @Test
    void adminApprovalUpdatesPaymentSubmissionAndOrder() {
        PaymentSubmission submission = new PaymentSubmission();
        submission.setId(3L);
        submission.setOrderId(11L);
        submission.setUserId(7L);
        submission.setReference("UPIREF123456");
        submission.setStatus("PENDING_VERIFICATION");

        when(paymentRepository.findById(3L))
                .thenReturn(Optional.of(submission));
        when(orderRepository.findByIdForUpdate(11L))
                .thenReturn(Optional.of(order));
        when(paymentRepository.findByIdForUpdate(3L))
                .thenReturn(Optional.of(submission));
        when(paymentRepository.save(submission)).thenReturn(submission);

        ResponseEntity<?> response = controller.reviewPayment(
                3L,
                decision("APPROVED"),
                adminAuthentication()
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("APPROVED", submission.getStatus());
        assertEquals("APPROVED", order.getPaymentStatus());
        assertNotNull(submission.getReviewedAt());
        assertEquals("admin@example.com", submission.getReviewedBy());
        verify(orderRepository).save(order);
    }

    private PaymentController.PaymentReferenceRequest request(String reference) {
        PaymentController.PaymentReferenceRequest request =
                new PaymentController.PaymentReferenceRequest();
        request.setReference(reference);
        return request;
    }

    private PaymentController.PaymentDecisionRequest decision(String value) {
        PaymentController.PaymentDecisionRequest request =
                new PaymentController.PaymentDecisionRequest();
        request.setDecision(value);
        return request;
    }

    private Authentication userAuthentication() {
        return new UsernamePasswordAuthenticationToken(
                "customer@example.com",
                "",
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }

    private Authentication adminAuthentication() {
        return new UsernamePasswordAuthenticationToken(
                "admin@example.com",
                "",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
    }
}
