package com.sterling.ewallet.payment.controller;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.payment.dto.CreateOrderRequest;
import com.sterling.ewallet.payment.dto.CreateOrderResponse;
import com.sterling.ewallet.payment.dto.VerifyPaymentRequest;
import com.sterling.ewallet.payment.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/orders")
    public ResponseEntity<ApiResponse<CreateOrderResponse>> createOrder(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody CreateOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.createOrder(userId, request.getAmount())));
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Void>> verify(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody VerifyPaymentRequest request) {
        paymentService.verifyAndCredit(userId, request);
        return ResponseEntity.ok(ApiResponse.<Void>ok("Payment verified; wallet top-up initiated", null));
    }
}
