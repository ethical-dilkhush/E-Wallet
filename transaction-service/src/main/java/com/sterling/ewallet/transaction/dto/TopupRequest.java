package com.sterling.ewallet.transaction.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class TopupRequest {

    @NotNull
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    private BigDecimal amount;

    @Size(max = 64)
    private String paymentGatewayReference;

    @Size(max = 255)
    private String reason;

    public TopupRequest() {
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getPaymentGatewayReference() {
        return paymentGatewayReference;
    }

    public void setPaymentGatewayReference(String paymentGatewayReference) {
        this.paymentGatewayReference = paymentGatewayReference;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
