package com.sterling.ewallet.payment.dto;

import java.math.BigDecimal;

public class CreateOrderResponse {

    private String orderId;
    private String keyId;
    private BigDecimal amount;
    private String currency;

    public CreateOrderResponse() {
    }

    public CreateOrderResponse(String orderId, String keyId, BigDecimal amount, String currency) {
        this.orderId = orderId;
        this.keyId = keyId;
        this.amount = amount;
        this.currency = currency;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getKeyId() {
        return keyId;
    }

    public void setKeyId(String keyId) {
        this.keyId = keyId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }
}
