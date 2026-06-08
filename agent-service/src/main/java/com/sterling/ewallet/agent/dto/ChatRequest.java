package com.sterling.ewallet.agent.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class ChatRequest {

    @NotEmpty(message = "messages must not be empty")
    @Valid
    private List<ChatMessage> messages;

    public ChatRequest() {
    }

    public List<ChatMessage> getMessages() {
        return messages;
    }

    public void setMessages(List<ChatMessage> messages) {
        this.messages = messages;
    }
}
