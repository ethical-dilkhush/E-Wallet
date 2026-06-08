package com.sterling.ewallet.notification.listener;

import com.sterling.ewallet.common.events.TransactionEvent;
import com.sterling.ewallet.common.messaging.RabbitTopics;
import com.sterling.ewallet.notification.service.TransactionNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class TransactionEventListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(TransactionEventListener.class);

    private final TransactionNotificationService notificationService;

    public TransactionEventListener(TransactionNotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @RabbitListener(queues = RabbitTopics.TRANSACTION_COMPLETED_QUEUE)
    public void onTransactionCompleted(TransactionEvent event) {
        LOGGER.info("Received completed transaction event ref={} type={} status={} amount={}",
                event.getTransactionId(), event.getType(), event.getStatus(), event.getAmount());
        try {
            notificationService.notifyCompleted(event);
        } catch (Exception ex) {
            LOGGER.error("Failed to process notification for ref={}", event.getTransactionId(), ex);
        }
    }
}
