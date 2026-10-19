
package com.ecart.backend.controller;

import com.ecart.backend.entity.Product;
import com.ecart.backend.repository.ProductRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "http://localhost:5173")
public class ProductController {

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @GetMapping
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProductById(
            @PathVariable Long id) {

        return productRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(Map.of(
                                "message",
                                "Product not found."
                        )));
    }

    @PostMapping
    public ResponseEntity<Product> addProduct(
            @RequestBody Product product) {

        // SecurityConfig restricts this endpoint to admins.
        Product savedProduct = productRepository.save(product);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedProduct);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(
            @PathVariable Long id,
            @RequestBody Product updatedProduct) {

        Product product = productRepository.findById(id)
                .orElse(null);

        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Product not found."));
        }

        product.setName(updatedProduct.getName());
        product.setPrice(updatedProduct.getPrice());
        product.setDescription(updatedProduct.getDescription());
        product.setQuantity(updatedProduct.getQuantity());
        product.setCategory(updatedProduct.getCategory());
        product.setImageUrl(updatedProduct.getImageUrl());

        return ResponseEntity.ok(productRepository.save(product));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(
            @PathVariable Long id) {

        if (!productRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Product not found."));
        }

        productRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}
