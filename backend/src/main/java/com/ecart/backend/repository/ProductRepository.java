
package com.ecart.backend.repository;

import com.ecart.backend.entity.Product;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductRepository
        extends JpaRepository<Product, Long> {

    // Atomically decrease stock only if enough is available
    @Modifying
    @Query("""
        UPDATE Product p
        SET p.quantity = p.quantity - :quantity
        WHERE p.id = :productId
        AND p.quantity >= :quantity
    """)
    int decreaseStock(
            @Param("productId") Long productId,
            @Param("quantity") int quantity
    );

    @Modifying
    @Query("""
        UPDATE Product p
        SET p.quantity = p.quantity + :quantity
        WHERE p.id = :productId
    """)
    int increaseStock(
            @Param("productId") Long productId,
            @Param("quantity") int quantity
    );

    // Lock a product row while the checkout transaction is active
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(
            @Param("id") Long id
    );
}
