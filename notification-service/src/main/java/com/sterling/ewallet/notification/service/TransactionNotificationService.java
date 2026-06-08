package com.sterling.ewallet.notification.service;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.common.dto.UserDto;
import com.sterling.ewallet.common.events.TransactionEvent;
import com.sterling.ewallet.notification.client.UserClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class TransactionNotificationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(TransactionNotificationService.class);

    private final UserClient userClient;
    private final EmailService emailService;

    public TransactionNotificationService(UserClient userClient, EmailService emailService) {
        this.userClient = userClient;
        this.emailService = emailService;
    }

    public void notifyCompleted(TransactionEvent event) {
        if (event.getStatus() != TransactionEvent.Status.COMPLETED) {
            LOGGER.debug("Skipping notification for non-completed txn ref={} status={}",
                    event.getTransactionId(), event.getStatus());
            return;
        }

        switch (event.getType()) {
            case TOPUP -> sendCredit(event.getToUserId(), event, "Wallet top-up");
            case TRANSFER -> {
                String toLabel = resolveUserLabel(event.getToUserId(), event.getFromUserId());
                String fromLabel = resolveUserLabel(event.getFromUserId(), event.getToUserId());
                sendDebit(event.getFromUserId(), event, toLabel);
                sendCredit(event.getToUserId(), event, fromLabel);
            }
            case MERCHANT_PAYMENT -> {
                String merchant = event.getMerchantId() != null
                        ? event.getMerchantId()
                        : "Merchant";
                sendDebit(event.getFromUserId(), event, merchant);
            }
            default -> LOGGER.warn("Unknown transaction type {} for ref={}", event.getType(), event.getTransactionId());
        }
    }

    private void sendDebit(String userId, TransactionEvent event, String counterparty) {
        UserDto user = fetchUser(userId);
        if (user == null) {
            return;
        }
        emailService.sendDebitAlert(user.getEmail(), displayName(user), event, counterparty);
    }

    private void sendCredit(String userId, TransactionEvent event, String counterparty) {
        UserDto user = fetchUser(userId);
        if (user == null) {
            return;
        }
        emailService.sendCreditAlert(user.getEmail(), displayName(user), event, counterparty);
    }

    private UserDto fetchUser(String userId) {
        if (userId == null || userId.isBlank()) {
            LOGGER.warn("Missing userId for transaction notification");
            return null;
        }
        try {
            ApiResponse<UserDto> response = userClient.getById(userId, userId);
            if (response == null || !response.isSuccess() || response.getData() == null) {
                LOGGER.warn("Could not load user profile for userId={}", userId);
                return null;
            }
            return response.getData();
        } catch (Exception ex) {
            LOGGER.error("Failed to fetch user profile for userId={}: {}", userId, ex.getMessage());
            return null;
        }
    }

    private String resolveUserLabel(String userId, String callerId) {
        if (userId == null || userId.isBlank()) {
            return "Unknown";
        }
        try {
            ApiResponse<UserDto> response = userClient.getById(userId, callerId != null ? callerId : userId);
            if (response != null && response.isSuccess() && response.getData() != null) {
                return displayName(response.getData());
            }
        } catch (Exception ex) {
            LOGGER.debug("Could not resolve label for userId={}: {}", userId, ex.getMessage());
        }
        return userId;
    }

    private static String displayName(UserDto user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        if (user.getUsername() != null && !user.getUsername().isBlank()) {
            return user.getUsername();
        }
        return user.getId();
    }
}
