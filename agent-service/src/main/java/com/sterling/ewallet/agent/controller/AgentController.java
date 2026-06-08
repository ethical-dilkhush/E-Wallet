package com.sterling.ewallet.agent.controller;

import com.sterling.ewallet.agent.dto.ChatRequest;
import com.sterling.ewallet.agent.dto.ChatResponse;
import com.sterling.ewallet.agent.service.AgentService;
import com.sterling.ewallet.common.dto.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agent")
public class AgentController {

    private final AgentService agentService;

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
    }

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody ChatRequest request) {
        String reply = agentService.reply(userId, request.getMessages());
        return ResponseEntity.ok(ApiResponse.ok(new ChatResponse(reply)));
    }
}
