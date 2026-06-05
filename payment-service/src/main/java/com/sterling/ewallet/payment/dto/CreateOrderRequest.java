package com.sterling.ewallet.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class CreateOrderRequest {

    @NotNull
    @DecimalMin(value = "1.00", message = "Amount must be at least 1")
    private BigDecimal amount;

    public CreateOrderRequest() {
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}
