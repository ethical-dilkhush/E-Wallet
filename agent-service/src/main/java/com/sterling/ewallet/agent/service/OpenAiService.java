package com.sterling.ewallet.agent.service;

import com.sterling.ewallet.agent.dto.ChatMessage;
import com.sterling.ewallet.agent.exception.AgentException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Thin wrapper around the OpenAI Chat Completions REST API. The API key is read
 * from configuration (backed by agent-service/.env) and never leaves this service.
 */
@Service
public class OpenAiService {

    private static final Logger LOGGER = LoggerFactory.getLogger(OpenAiService.class);

    private final String apiKey;
    private final String model;
    private final RestClient restClient;

    public OpenAiService(@Value("${openai.api-key:}") String apiKey,
                         @Value("${openai.model:gpt-4o}") String model,
                         @Value("${openai.base-url:https://api.openai.com/v1}") String baseUrl) {
        this.apiKey = apiKey;
        this.model = model;
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    /**
     * Sends the system prompt plus the session conversation to GPT-4o and returns
     * the assistant's reply text.
     */
    @SuppressWarnings("unchecked")
    public String chat(String systemPrompt, List<ChatMessage> conversation) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new AgentException("OpenAI API key is not configured. Set OPENAI_API_KEY in agent-service/.env");
        }

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        for (ChatMessage m : conversation) {
            // Only forward user/assistant turns; the system message is set by us, not the client.
            String role = m.getRole() == null ? "" : m.getRole().toLowerCase();
            if (role.equals("user") || role.equals("assistant")) {
                messages.add(Map.of("role", role, "content", m.getContent() == null ? "" : m.getContent()));
            }
        }

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", messages,
                "temperature", 0.2);

        try {
            Map<String, Object> response = restClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                throw new AgentException("Empty response from OpenAI");
            }
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) {
                throw new AgentException("OpenAI returned no choices");
            }
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            Object content = message == null ? null : message.get("content");
            if (content == null) {
                throw new AgentException("OpenAI returned an empty message");
            }
            return content.toString().trim();
        } catch (AgentException ex) {
            throw ex;
        } catch (Exception ex) {
            LOGGER.error("OpenAI request failed: {}", ex.getMessage());
            throw new AgentException("Failed to reach the AI service: " + ex.getMessage(), ex);
        }
    }
}
