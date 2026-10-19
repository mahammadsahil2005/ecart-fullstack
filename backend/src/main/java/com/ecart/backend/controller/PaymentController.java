package com.ecart.backend.controller;

import com.ecart.backend.entity.Order;
import com.ecart.backend.entity.PaymentSubmission;
import com.ecart.backend.entity.User;
import com.ecart.backend.repository.OrderRepository;
import com.ecart.backend.repository.PaymentSubmissionRepository;
import com.ecart.backend.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "http://localhost:5173")
public class PaymentController {

    private final PaymentSubmissionRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    public PaymentController(
            PaymentSubmissionRepository paymentRepository,
            OrderRepository orderRepository,
            UserRepository userRepository) {

        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<?> getPaymentStatus(
            @PathVariable Long orderId,
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);

        if (user == null) {
            return unauthorized();
        }

        Order order = orderRepository.findById(orderId).orElse(null);

        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Order not found."));
        }

        if (!user.getId().equals(order.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You cannot view this payment."));
        }

        return ResponseEntity.ok(
                paymentRepository.findByOrderIdAndUserId(orderId, user.getId())
                        .orElse(null)
        );
    }

    @PostMapping("/orders/{orderId}")
    @Transactional
    public ResponseEntity<?> submitPaymentReference(
            @PathVariable Long orderId,
            @RequestBody PaymentReferenceRequest request,
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);

        if (user == null) {
            return unauthorized();
        }

        if (request == null
                || request.getReference() == null
                || !request.getReference().trim()
                        .matches("[A-Za-z0-9-]{6,100}")) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Enter a valid 6-100 character transaction reference."
                    ));
        }

        Order order = orderRepository.findByIdForUpdate(orderId).orElse(null);

        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Order not found."));
        }

        if (!user.getId().equals(order.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You cannot submit payment for this order."));
        }

        if ("CANCELLED".equals(order.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Payment cannot be submitted for a cancelled order."));
        }

        PaymentSubmission submission = paymentRepository
                .findByOrderIdForUpdate(orderId)
                .orElseGet(PaymentSubmission::new);

        if ("PENDING_VERIFICATION".equals(submission.getStatus())
                || "APPROVED".equals(submission.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "A payment submission already exists for this order."
                    ));
        }

        submission.setOrderId(orderId);
        submission.setUserId(user.getId());
        submission.setReference(request.getReference().trim());
        submission.setStatus("PENDING_VERIFICATION");
        submission.setSubmittedAt(LocalDateTime.now());
        submission.setReviewedAt(null);
        submission.setReviewedBy(null);

        order.setPaymentStatus("PENDING_VERIFICATION");
        order.setPaymentReference(submission.getReference());
        orderRepository.save(order);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentRepository.save(submission));
    }

    @GetMapping("/admin/pending")
    public ResponseEntity<?> getPendingPayments(
            Authentication authentication) {

        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Admin access required."));
        }

        List<PaymentSubmission> submissions =
                paymentRepository.findByStatusOrderBySubmittedAtAsc(
                        "PENDING_VERIFICATION");

        return ResponseEntity.ok(submissions);
    }

    @PutMapping("/admin/{paymentId}")
    @Transactional
    public ResponseEntity<?> reviewPayment(
            @PathVariable Long paymentId,
            @RequestBody PaymentDecisionRequest request,
            Authentication authentication) {

        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Admin access required."));
        }

        if (request == null
                || request.getDecision() == null
                || !List.of("APPROVED", "REJECTED")
                        .contains(request.getDecision().trim().toUpperCase())) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Decision must be APPROVED or REJECTED."
                    ));
        }

        PaymentSubmission existingSubmission = paymentRepository
                .findById(paymentId)
                .orElse(null);

        if (existingSubmission == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Payment submission not found."));
        }

        Order order = orderRepository
                .findByIdForUpdate(existingSubmission.getOrderId())
                .orElse(null);

        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Order not found."));
        }

        PaymentSubmission submission = paymentRepository
                .findByIdForUpdate(paymentId)
                .orElse(null);

        if (submission == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Payment submission not found."));
        }

        if (!"PENDING_VERIFICATION".equals(submission.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "This payment submission has already been reviewed."
                    ));
        }

        submission.setStatus(request.getDecision().trim().toUpperCase());
        submission.setReviewedAt(LocalDateTime.now());
        submission.setReviewedBy(authentication.getName());
        order.setPaymentStatus(submission.getStatus());

        orderRepository.save(order);
        return ResponseEntity.ok(paymentRepository.save(submission));
    }

    private User getAuthenticatedUser(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null) {
            return null;
        }

        return userRepository.findByEmail(authentication.getName())
                .orElse(null);
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                        .anyMatch(authority ->
                                "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Please log in."));
    }

    public static class PaymentReferenceRequest {
        private String reference;

        public String getReference() {
            return reference;
        }

        public void setReference(String reference) {
            this.reference = reference;
        }
    }

    public static class PaymentDecisionRequest {
        private String decision;

        public String getDecision() {
            return decision;
        }

        public void setDecision(String decision) {
            this.decision = decision;
        }
    }
}
