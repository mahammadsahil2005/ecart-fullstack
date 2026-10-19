package com.ecart.backend.service;

import com.ecart.backend.entity.CartItem;
import com.ecart.backend.entity.Order;
import com.ecart.backend.entity.OrderItem;
import com.ecart.backend.entity.Product;

import com.ecart.backend.repository.CartItemRepository;
import com.ecart.backend.repository.OrderItemRepository;
import com.ecart.backend.repository.OrderRepository;
import com.ecart.backend.repository.ProductRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CheckoutService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartReservationService cartReservationService;

    public CheckoutService(
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            CartReservationService cartReservationService) {

        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.cartReservationService = cartReservationService;
    }

    @Transactional
    public Order checkout(
            Long userId,
            String fullName,
            String phone,
            String street,
            String city,
            String state,
            String pincode) {

        // 1. Validate delivery address
        if (isBlank(fullName)
                || isBlank(phone)
                || isBlank(street)
                || isBlank(city)
                || isBlank(state)
                || isBlank(pincode)) {

            throw new IllegalArgumentException(
                    "Please provide all delivery address details."
            );
        }

        if (!phone.matches("[0-9]{10}")) {
            throw new IllegalArgumentException(
                    "Phone number must contain exactly 10 digits."
            );
        }

        if (!pincode.matches("[0-9]{6}")) {
            throw new IllegalArgumentException(
                    "PIN code must contain exactly 6 digits."
            );
        }

        // 2. Get this user's cart
        cartReservationService.releaseExpiredReservationsForUser(userId);

        List<CartItem> cartItems =
                cartItemRepository.findByUserIdForUpdate(userId);

        if (cartItems.isEmpty()) {
            throw new IllegalArgumentException(
                    "Your cart is empty."
            );
        }

        double totalAmount = 0;

        // 3. Validate cart items and calculate total
        for (CartItem cartItem : cartItems) {

            if (cartItem.getQuantity() == null
                    || cartItem.getQuantity() <= 0) {

                throw new IllegalArgumentException(
                        "Invalid quantity in cart."
                );
            }

            if (!cartReservationService.ensureReservation(cartItem)) {
                throw new IllegalArgumentException(
                        "Insufficient stock for product "
                                + cartItem.getProductId()
                );
            }

            Product product = productRepository
                    .findById(cartItem.getProductId())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Product not found: "
                                            + cartItem.getProductId()
                            )
                    );

            totalAmount +=
                    product.getPrice() * cartItem.getQuantity();
        }

        // 4. Create the order
        Order order = new Order();

        order.setUserId(userId);
        order.setTotalAmount(totalAmount);
        order.setStatus("PLACED");
        order.setOrderDate(LocalDateTime.now());

        // 5. Save delivery address
        order.setFullName(fullName.trim());
        order.setPhone(phone.trim());
        order.setStreet(street.trim());
        order.setCity(city.trim());
        order.setState(state.trim());
        order.setPincode(pincode.trim());

        Order savedOrder = orderRepository.save(order);

        // 6. Create order items and reduce stock safely
        for (CartItem cartItem : cartItems) {

            Product product = productRepository
                    .findById(cartItem.getProductId())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Product not found: "
                                            + cartItem.getProductId()
                            )
                    );

            // Create order item
            OrderItem orderItem = new OrderItem();

            orderItem.setOrderId(savedOrder.getId());
            orderItem.setProductId(product.getId());
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setPrice(product.getPrice());

            orderItemRepository.save(orderItem);
        }

        // 7. Clear cart after successful order creation
        cartItemRepository.deleteAll(cartItems);

        // 8. Return the saved order
        return savedOrder;
    }

    // Helper method for checking empty fields
    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}