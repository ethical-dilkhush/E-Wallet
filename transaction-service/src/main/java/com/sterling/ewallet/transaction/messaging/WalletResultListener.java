package com.sterling.ewallet.transaction.messaging;

import com.sterling.ewallet.common.events.WalletOperationResultEvent;
import com.sterling.ewallet.common.messaging.RabbitTopics;
import com.sterling.ewallet.transaction.service.TransactionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class WalletResultListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(WalletResultListener.class);

    private final TransactionService transactionService;

    public WalletResultListener(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @RabbitListener(queues = RabbitTopics.WALLET_RESULT_QUEUE)
    public void onWalletResult(WalletOperationResultEvent event) {
        LOGGER.info("Received WalletOperationResultEvent txnId={} success={} msg={}",
                event.getTransactionId(), event.isSuccess(), event.getMessage());
        try {
            transactionService.completeTransaction(event.getTransactionId(), event.isSuccess(), event.getMessage());
        } catch (Exception ex) {
            LOGGER.error("Failed to finalise transaction {}: {}", event.getTransactionId(), ex.getMessage(), ex);
        }
    }
}
