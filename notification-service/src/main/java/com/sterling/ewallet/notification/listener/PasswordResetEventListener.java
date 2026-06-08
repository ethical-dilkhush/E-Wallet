package com.sterling.ewallet.notification.listener;

import com.sterling.ewallet.common.events.PasswordResetRequestedEvent;
import com.sterling.ewallet.common.messaging.RabbitTopics;
import com.sterling.ewallet.notification.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class PasswordResetEventListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(PasswordResetEventListener.class);

    private final EmailService emailService;

    public PasswordResetEventListener(EmailService emailService) {
        this.emailService = emailService;
    }

    @RabbitListener(queues = RabbitTopics.PASSWORD_RESET_QUEUE)
    public void onPasswordResetRequested(PasswordResetRequestedEvent event) {
        LOGGER.info("Received password reset request for email={}", event.getEmail());
        try {
            emailService.sendPasswordResetEmail(event.getEmail(), event.getName(),
                    event.getToken(), event.getExpiresAt());
        } catch (Exception ex) {
            LOGGER.error("Failed to send password reset email to {}", event.getEmail(), ex);
        }
    }
}
