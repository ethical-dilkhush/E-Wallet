package com.sterling.ewallet.notification.controller;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.common.events.TransactionEvent;
import com.sterling.ewallet.notification.service.EmailService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;

@RestController
@RequestMapping("/api/notifications")
public class NotificationTestController {

    private final EmailService emailService;

    public NotificationTestController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/test")
    public ApiResponse<String> sendTestEmail(@RequestBody TestEmailRequest request) {
        TransactionEvent sample = new TransactionEvent();
        sample.setTransactionId("TEST-" + System.currentTimeMillis());
        sample.setType(TransactionEvent.Type.TRANSFER);
        sample.setStatus(TransactionEvent.Status.COMPLETED);
        sample.setAmount(new BigDecimal("100.00"));
        sample.setReason("Test notification");
        sample.setOccurredAt(Instant.now());

        if ("credit".equalsIgnoreCase(request.direction())) {
            emailService.sendCreditAlert(request.email(), request.name(), sample, "Test User");
        } else {
            emailService.sendDebitAlert(request.email(), request.name(), sample, "Test User");
        }
        return ApiResponse.ok("Test email queued (check logs if SMTP is misconfigured)");
    }

    public record TestEmailRequest(
            @NotBlank @Email String email,
            @NotBlank String name,
            String direction
    ) {
    }
}
