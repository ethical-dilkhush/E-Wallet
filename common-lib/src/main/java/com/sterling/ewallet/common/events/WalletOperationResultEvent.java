package com.sterling.ewallet.common.events;

import java.io.Serializable;
import java.time.Instant;

public class WalletOperationResultEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    private String transactionId;
    private boolean success;
    private String message;
    private Instant occurredAt;

    public WalletOperationResultEvent() {
    }

    public WalletOperationResultEvent(String transactionId, boolean success, String message) {
        this.transactionId = transactionId;
        this.success = success;
        this.message = message;
        this.occurredAt = Instant.now();
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }
}
