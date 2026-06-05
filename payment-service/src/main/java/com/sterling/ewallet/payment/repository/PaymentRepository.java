package com.sterling.ewallet.payment.repository;

import com.sterling.ewallet.payment.entity.PaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<PaymentEntity, String> {

    Optional<PaymentEntity> findByRazorpayOrderId(String razorpayOrderId);
}
