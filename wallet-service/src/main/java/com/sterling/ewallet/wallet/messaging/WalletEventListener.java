package com.sterling.ewallet.wallet.messaging;

import com.sterling.ewallet.common.events.TransactionEvent;
import com.sterling.ewallet.common.events.UserRegisteredEvent;
import com.sterling.ewallet.common.events.WalletOperationResultEvent;
import com.sterling.ewallet.common.messaging.RabbitTopics;
import com.sterling.ewallet.wallet.exception.WalletException;
import com.sterling.ewallet.wallet.service.WalletService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class WalletEventListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(WalletEventListener.class);

    private final WalletService walletService;
    private final RabbitTemplate rabbitTemplate;

    public WalletEventListener(WalletService walletService, RabbitTemplate rabbitTemplate) {
        this.walletService = walletService;
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = RabbitTopics.USER_REGISTERED_QUEUE)
    public void onUserRegistered(UserRegisteredEvent event) {
        LOGGER.info("Received UserRegisteredEvent for userId={}", event.getUserId());
        try {
            walletService.createWallet(event.getUserId());
        } catch (Exception ex) {
            LOGGER.error("Failed to auto-provision wallet for userId={}", event.getUserId(), ex);
        }
    }

    @RabbitListener(queues = RabbitTopics.TRANSACTION_INITIATED_QUEUE)
    public void onTransactionInitiated(TransactionEvent event) {
        LOGGER.info("Received TransactionEvent txnId={} type={} amount={}",
                event.getTransactionId(), event.getType(), event.getAmount());
        WalletOperationResultEvent result;
        try {
            switch (event.getType()) {
                case TOPUP -> walletService.credit(event.getToUserId(), event.getAmount(),
                        event.getTransactionId(), "Top-up: " + nullSafe(event.getReason()));
                case TRANSFER -> {
                    walletService.debit(event.getFromUserId(), event.getAmount(),
                            event.getTransactionId(),
                            "Transfer to userId=" + event.getToUserId() + ": " + nullSafe(event.getReason()));
                    walletService.credit(event.getToUserId(), event.getAmount(),
                            event.getTransactionId(),
                            "Transfer from userId=" + event.getFromUserId() + ": " + nullSafe(event.getReason()));
                }
                case MERCHANT_PAYMENT -> walletService.debit(event.getFromUserId(), event.getAmount(),
                        event.getTransactionId(),
                        "Merchant payment to " + event.getMerchantId() + ": " + nullSafe(event.getReason()));
            }
            result = new WalletOperationResultEvent(event.getTransactionId(), true, "OK");
        } catch (WalletException ex) {
            LOGGER.warn("Wallet operation failed for txn={}: {}", event.getTransactionId(), ex.getMessage());
            result = new WalletOperationResultEvent(event.getTransactionId(), false, ex.getMessage());
        } catch (Exception ex) {
            LOGGER.error("Unexpected error processing txn={}", event.getTransactionId(), ex);
            result = new WalletOperationResultEvent(event.getTransactionId(), false,
                    "Unexpected error: " + ex.getMessage());
        }

        rabbitTemplate.convertAndSend(
                RabbitTopics.EWALLET_EXCHANGE,
                RabbitTopics.WALLET_RESULT_ROUTING_KEY,
                result);
        LOGGER.info("Published WalletOperationResultEvent for txnId={} success={}",
                result.getTransactionId(), result.isSuccess());
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
