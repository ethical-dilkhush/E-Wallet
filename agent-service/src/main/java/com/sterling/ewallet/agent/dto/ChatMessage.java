package com.sterling.ewallet.agent.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * A single chat turn. {@code role} is one of "user" or "assistant"
 * (the system message is added server-side, never accepted from the client).
 */
public class ChatMessage {

    @NotBlank
    private String role;

    @NotBlank
    private String content;

    public ChatMessage() {
    }

    public ChatMessage(String role, String content) {
        this.role = role;
        this.content = content;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
