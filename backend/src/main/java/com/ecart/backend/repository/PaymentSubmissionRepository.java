package com.ecart.backend.repository;

import com.ecart.backend.entity.PaymentSubmission;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentSubmissionRepository
        extends JpaRepository<PaymentSubmission, Long> {

    Optional<PaymentSubmission> findByOrderIdAndUserId(
            Long orderId,
            Long userId
    );

    List<PaymentSubmission> findByStatusOrderBySubmittedAtAsc(String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentSubmission p WHERE p.id = :id")
    Optional<PaymentSubmission> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentSubmission p WHERE p.orderId = :orderId")
    Optional<PaymentSubmission> findByOrderIdForUpdate(
            @Param("orderId") Long orderId
    );
}
