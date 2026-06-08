package com.sterling.ewallet.common.events;

import java.io.Serializable;
import java.time.Instant;

public class PasswordResetRequestedEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    private String email;
    private String name;
    private String token;
    private Instant expiresAt;
    private Instant occurredAt;

    public PasswordResetRequestedEvent() {
    }

    public PasswordResetRequestedEvent(String email, String name, String token, Instant expiresAt) {
        this.email = email;
        this.name = name;
        this.token = token;
        this.expiresAt = expiresAt;
        this.occurredAt = Instant.now();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }
}
