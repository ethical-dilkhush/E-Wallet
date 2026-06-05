package com.sterling.ewallet.payment.dto;

import java.math.BigDecimal;

/**
 * Body sent to transaction-service's internal top-up endpoint after a payment
 * has been verified. Field names must match transaction-service's request DTO.
 */
public class InternalTopupRequest {

    private String userId;
    private BigDecimal amount;
    private String paymentReference;
    private String reason;

    public InternalTopupRequest() {
    }

    public InternalTopupRequest(String userId, BigDecimal amount, String paymentReference, String reason) {
        this.userId = userId;
        this.amount = amount;
        this.paymentReference = paymentReference;
        this.reason = reason;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public void setPaymentReference(String paymentReference) {
        this.paymentReference = paymentReference;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
