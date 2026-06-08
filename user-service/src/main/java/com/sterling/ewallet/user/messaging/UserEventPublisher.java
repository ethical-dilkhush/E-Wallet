package com.sterling.ewallet.user.messaging;

import com.sterling.ewallet.common.events.PasswordResetRequestedEvent;
import com.sterling.ewallet.common.events.UserRegisteredEvent;
import com.sterling.ewallet.common.messaging.RabbitTopics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class UserEventPublisher {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    public UserEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishUserRegistered(UserRegisteredEvent event) {
        LOGGER.info("Publishing UserRegisteredEvent for userId={}", event.getUserId());
        rabbitTemplate.convertAndSend(
                RabbitTopics.EWALLET_EXCHANGE,
                RabbitTopics.USER_REGISTERED_ROUTING_KEY,
                event);
    }

    public void publishPasswordResetRequested(PasswordResetRequestedEvent event) {
        LOGGER.info("Publishing PasswordResetRequestedEvent for email={}", event.getEmail());
        rabbitTemplate.convertAndSend(
                RabbitTopics.EWALLET_EXCHANGE,
                RabbitTopics.PASSWORD_RESET_ROUTING_KEY,
                event);
    }
}
