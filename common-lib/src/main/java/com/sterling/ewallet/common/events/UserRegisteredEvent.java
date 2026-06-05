package com.sterling.ewallet.common.events;

import java.io.Serializable;
import java.time.Instant;

public class UserRegisteredEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    private String userId;
    private String username;
    private String email;
    private Instant occurredAt;

    public UserRegisteredEvent() {
    }

    public UserRegisteredEvent(String userId, String username, String email) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.occurredAt = Instant.now();
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }
}
