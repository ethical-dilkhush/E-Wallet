package com.sterling.ewallet.common.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

public class WalletDto implements Serializable {

    private static final long serialVersionUID = 1L;

    private String id;
    private String userId;
    private BigDecimal balance;
    private String currency;
    private Instant createdAt;
    private Instant updatedAt;

    public WalletDto() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
