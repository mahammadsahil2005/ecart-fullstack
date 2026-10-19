
package com.ecart.backend.repository;

import com.ecart.backend.entity.CartItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository
        extends JpaRepository<CartItem, Long> {

    List<CartItem> findByUserId(Long userId);

    Optional<CartItem> findByUserIdAndProductId(
            Long userId,
            Long productId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT item
        FROM CartItem item
        WHERE item.userId = :userId
        ORDER BY item.productId, item.id
    """)
    List<CartItem> findByUserIdForUpdate(
            @Param("userId") Long userId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT item
        FROM CartItem item
        WHERE item.userId = :userId
        AND item.productId = :productId
    """)
    Optional<CartItem> findByUserIdAndProductIdForUpdate(
            @Param("userId") Long userId,
            @Param("productId") Long productId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT item
        FROM CartItem item
        WHERE item.id = :id
    """)
    Optional<CartItem> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT item
        FROM CartItem item
        WHERE item.reservationExpiresAt IS NOT NULL
        AND item.reservationExpiresAt <= :now
        ORDER BY item.productId, item.id
    """)
    List<CartItem> findExpiredReservationsForUpdate(
            @Param("now") java.time.LocalDateTime now
    );
}
