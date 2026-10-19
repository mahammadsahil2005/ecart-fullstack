package com.ecart.backend.controller;

import com.ecart.backend.entity.OrderItem;
import com.ecart.backend.entity.Product;

import com.ecart.backend.repository.OrderItemRepository;
import com.ecart.backend.repository.ProductRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/order-items")
@CrossOrigin(origins = "*")
public class OrderItemController {

    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;

    public OrderItemController(
            OrderItemRepository orderItemRepository,
            ProductRepository productRepository) {

        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
    }

    // Get all items belonging to a specific order
    @GetMapping("/order/{orderId}")
    public ResponseEntity<List<OrderItem>> getOrderItemsByOrderId(
            @PathVariable Long orderId) {

        List<OrderItem> items =
                orderItemRepository.findByOrderId(orderId);

        return ResponseEntity.ok(items);
    }

    // Also support the original URL format
    @GetMapping("/{orderId}")
    public ResponseEntity<List<OrderItem>> getOrderItems(
            @PathVariable Long orderId) {

        List<OrderItem> items =
                orderItemRepository.findByOrderId(orderId);

        return ResponseEntity.ok(items);
    }

    // Add an order item and decrease product stock
    @PostMapping
    public ResponseEntity<?> addOrderItem(
            @RequestBody OrderItem orderItem) {

        // Validate quantity
        if (orderItem.getQuantity() <= 0) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "error",
                            "Quantity must be greater than zero."
                    ));
        }

        // Find product
        Product product = productRepository
                .findById(orderItem.getProductId())
                .orElse(null);

        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "error",
                            "Product not found."
                    ));
        }

        // Check available stock
        if (orderItem.getQuantity() > product.getQuantity()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "error",
                            "Insufficient stock."
                    ));
        }

        // Decrease stock
        product.setQuantity(
                product.getQuantity() - orderItem.getQuantity()
        );

        productRepository.save(product);

        // Save order item
        OrderItem savedItem =
                orderItemRepository.save(orderItem);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(savedItem);
    }
}