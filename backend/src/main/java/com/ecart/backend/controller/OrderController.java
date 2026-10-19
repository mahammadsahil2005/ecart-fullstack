
package com.ecart.backend.controller;

import com.ecart.backend.entity.CartItem;
import com.ecart.backend.entity.Order;
import com.ecart.backend.entity.OrderItem;
import com.ecart.backend.entity.PaymentSubmission;
import com.ecart.backend.entity.Product;
import com.ecart.backend.entity.User;

import com.ecart.backend.repository.CartItemRepository;
import com.ecart.backend.repository.OrderItemRepository;
import com.ecart.backend.repository.OrderRepository;
import com.ecart.backend.repository.PaymentSubmissionRepository;
import com.ecart.backend.repository.ProductRepository;
import com.ecart.backend.repository.UserRepository;
import com.ecart.backend.service.CartReservationService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:5173")
public class OrderController {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final PaymentSubmissionRepository paymentSubmissionRepository;
    private final CartReservationService cartReservationService;

    public OrderController(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            ProductRepository productRepository,
            CartItemRepository cartItemRepository,
            UserRepository userRepository,
            PaymentSubmissionRepository paymentSubmissionRepository,
            CartReservationService cartReservationService) {

        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.cartItemRepository = cartItemRepository;
        this.userRepository = userRepository;
        this.paymentSubmissionRepository = paymentSubmissionRepository;
        this.cartReservationService = cartReservationService;
    }

    // Get the authenticated user from the JWT
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

    // Check whether the authenticated user is an admin
    private boolean isAdmin(Authentication authentication) {

        return authentication != null
                && authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        "ROLE_ADMIN".equals(
                                authority.getAuthority()
                        )
                );
    }

    // Lock a product row during checkout or cancellation
    private Product lockProduct(Long productId) {

        return productRepository
                .findByIdForUpdate(productId)
                .orElse(null);
    }

    // GET: View orders belonging to the logged-in user
    @GetMapping
    public ResponseEntity<?> getOrders(
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in."));
        }

        return ResponseEntity.ok(
                orderRepository.findByUserId(user.getId())
        );
    }

    // GET: Admin views all orders
    @GetMapping("/admin/all")
    public ResponseEntity<?> getAllOrders(
            Authentication authentication) {

        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "Admin access required."
                    ));
        }

        return ResponseEntity.ok(orderRepository.findAll());
    }

    // POST: Place an order using the authenticated user's cart
    @PostMapping
    @Transactional
    public ResponseEntity<?> placeOrder(
            @RequestBody Order request,
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in."));
        }

        cartReservationService.releaseExpiredReservationsForUser(
                user.getId());

        List<CartItem> cartItems =
                cartItemRepository.findByUserIdForUpdate(user.getId());

        if (cartItems.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Your cart is empty."));
        }

        // Validate delivery details
        if (isBlank(request.getFullName())
                || isBlank(request.getPhone())
                || isBlank(request.getStreet())
                || isBlank(request.getCity())
                || isBlank(request.getState())
                || isBlank(request.getPincode())) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Please provide all delivery details."
                    ));
        }

        // Combine duplicate product rows and sort product IDs.
        Map<Long, Integer> requestedQuantities = new TreeMap<>();

        for (CartItem item : cartItems) {

            if (item.getProductId() == null
                    || item.getQuantity() == null
                    || item.getQuantity() <= 0) {

                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Invalid product or quantity in cart."
                        ));
            }

            if (!cartReservationService.ensureReservation(item)) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Insufficient stock for product "
                                        + item.getProductId()
                        ));
            }

            int previousQuantity = requestedQuantities.getOrDefault(
                    item.getProductId(), 0);

            try {
                requestedQuantities.put(
                        item.getProductId(),
                        Math.addExact(previousQuantity, item.getQuantity())
                );
            } catch (ArithmeticException exception) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Requested quantity is too large."
                        ));
            }
        }

        // Lock and validate each product once.
        Map<Long, Product> lockedProducts = new TreeMap<>();
        double totalAmount = 0.0;

        for (Map.Entry<Long, Integer> entry
                : requestedQuantities.entrySet()) {

            Long productId = entry.getKey();
            int quantity = entry.getValue();

            Product product = lockProduct(productId);

            if (product == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of(
                                "message",
                                "A product in your cart no longer exists."
                        ));
            }

            if (product.getPrice() < 0) {

                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Invalid price for " + product.getName()
                        ));
            }

            lockedProducts.put(productId, product);

            totalAmount += product.getPrice() * quantity;
        }

        // Create the order using server-controlled values.
        Order order = new Order();

        order.setUserId(user.getId());
        order.setTotalAmount(totalAmount);
        order.setStatus("PLACED");
        order.setOrderDate(LocalDateTime.now());

        order.setFullName(request.getFullName().trim());
        order.setPhone(request.getPhone().trim());
        order.setStreet(request.getStreet().trim());
        order.setCity(request.getCity().trim());
        order.setState(request.getState().trim());
        order.setPincode(request.getPincode().trim());

        Order savedOrder = orderRepository.save(order);

        // Create order items and deduct stock exactly once.
        for (Map.Entry<Long, Integer> entry
                : requestedQuantities.entrySet()) {

            Long productId = entry.getKey();
            int quantity = entry.getValue();

            Product product = lockedProducts.get(productId);

            OrderItem orderItem = new OrderItem();

            orderItem.setOrderId(savedOrder.getId());
            orderItem.setProductId(product.getId());
            orderItem.setQuantity(quantity);
            orderItem.setPrice(product.getPrice());

            orderItemRepository.save(orderItem);

        }

        // Clear the cart only after order items are processed.
        cartItemRepository.deleteAll(cartItems);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(savedOrder);
    }

    // POST: Customer submits a payment claim for their own order
    @PostMapping("/{orderId}/payment-claim")
    @Transactional
    public ResponseEntity<?> submitPaymentClaim(
            @PathVariable Long orderId,
            @RequestBody Map<String, String> request,
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in."));
        }

        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElse(null);

        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Order not found."));
        }

        if (!user.getId().equals(order.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You cannot submit a claim for another user's order."
                    ));
        }

        if ("CANCELLED".equals(order.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "This order is cancelled."));
        }

        if ("PAID".equals(order.getPaymentStatus())
                || "APPROVED".equals(order.getPaymentStatus())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "This order is already marked paid."));
        }

        String reference = request == null ? null : request.get("reference");

        if (reference == null
                || !reference.trim().matches("[A-Za-z0-9-]{6,100}")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Enter a valid payment reference."));
        }

        PaymentSubmission submission = paymentSubmissionRepository
                .findByOrderIdForUpdate(orderId)
                .orElseGet(PaymentSubmission::new);

        if ("PENDING_VERIFICATION".equals(submission.getStatus())
                || "APPROVED".equals(submission.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "A payment submission already exists for this order."
                    ));
        }

        submission.setOrderId(orderId);
        submission.setUserId(user.getId());
        submission.setReference(reference.trim());
        submission.setStatus("PENDING_VERIFICATION");
        submission.setSubmittedAt(LocalDateTime.now());
        submission.setReviewedAt(null);
        submission.setReviewedBy(null);

        order.setPaymentReference(reference.trim());
        order.setPaymentStatus("PENDING_VERIFICATION");

        paymentSubmissionRepository.save(submission);
        return ResponseEntity.ok(orderRepository.save(order));
    }

    // PUT: Update an order's status (admin only)
    @PutMapping("/{orderId}/status")
    @Transactional
    public ResponseEntity<?> updateStatus(
            @PathVariable Long orderId,
            @RequestBody StatusRequest request,
            Authentication authentication) {

        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "Admin access required."
                    ));
        }

        Order order = orderRepository
                .findById(orderId)
                .orElse(null);

        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Order not found."));
        }

        if (request == null
                || request.getStatus() == null
                || request.getStatus().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Order status is required."
                    ));
        }

        String currentStatus = order.getStatus();
        String newStatus = request.getStatus().trim().toUpperCase();

        boolean validTransition =
                ("PLACED".equals(currentStatus)
                        && "CONFIRMED".equals(newStatus))
                || ("CONFIRMED".equals(currentStatus)
                        && "SHIPPED".equals(newStatus))
                || ("SHIPPED".equals(currentStatus)
                        && "DELIVERED".equals(newStatus));

        if (!validTransition) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Invalid order status transition."
                    ));
        }

        order.setStatus(newStatus);

        return ResponseEntity.ok(orderRepository.save(order));
    }

    // PUT: Cancel an eligible order belonging to the logged-in customer
    @PutMapping("/{orderId}/cancel")
    @Transactional
    public ResponseEntity<?> cancelOrder(
            @PathVariable Long orderId,
            Authentication authentication) {

        User user = getAuthenticatedUser(authentication);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in."));
        }

        // Lock the order row so two cancellation requests
        // cannot both restore stock.
        Order order = orderRepository
                .findByIdForUpdate(orderId)
                .orElse(null);

        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Order not found."));
        }

        if (!user.getId().equals(order.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You cannot cancel another user's order."
                    ));
        }

        String status = order.getStatus();

        if (!"PLACED".equals(status)
                && !"CONFIRMED".equals(status)) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Only placed or confirmed orders can be cancelled."
                    ));
        }

        List<OrderItem> orderItems =
                orderItemRepository.findByOrderId(orderId);

        // Aggregate quantities in case duplicate order items exist.
        Map<Long, Integer> quantitiesToRestore = new TreeMap<>();

        for (OrderItem item : orderItems) {

            if (item.getProductId() == null
                    || item.getQuantity() <= 0) {

                throw new IllegalStateException(
                        "Invalid order item for order " + orderId
                );
            }

            int previousQuantity = quantitiesToRestore.getOrDefault(
                    item.getProductId(), 0);

            quantitiesToRestore.put(
                    item.getProductId(),
                    Math.addExact(previousQuantity, item.getQuantity())
            );
        }

        // Lock products in ascending ID order and validate first.
        Map<Long, Product> lockedProducts = new TreeMap<>();

        for (Map.Entry<Long, Integer> entry
                : quantitiesToRestore.entrySet()) {

            Product product = lockProduct(entry.getKey());

            if (product == null) {
                throw new IllegalStateException(
                        "Product not found: " + entry.getKey()
                );
            }

            lockedProducts.put(entry.getKey(), product);
        }

        // Restore stock exactly once per distinct product.
        for (Map.Entry<Long, Integer> entry
                : quantitiesToRestore.entrySet()) {

            Product product = lockedProducts.get(entry.getKey());

            int restoredQuantity = Math.addExact(
                    product.getQuantity(),
                    entry.getValue()
            );

            product.setQuantity(restoredQuantity);
            productRepository.save(product);
        }

        order.setStatus("CANCELLED");

        return ResponseEntity.ok(orderRepository.save(order));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public static class StatusRequest {

        private String status;

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }
}
