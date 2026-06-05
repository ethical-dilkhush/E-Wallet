package com.sterling.ewallet.transaction.service;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.common.dto.UserDto;
import com.sterling.ewallet.common.dto.WalletDto;
import com.sterling.ewallet.common.events.TransactionEvent;
import com.sterling.ewallet.common.messaging.RabbitTopics;
import com.sterling.ewallet.transaction.client.UserClient;
import com.sterling.ewallet.transaction.client.WalletClient;
import com.sterling.ewallet.transaction.dto.MerchantPaymentRequest;
import com.sterling.ewallet.transaction.dto.TopupRequest;
import com.sterling.ewallet.transaction.dto.TransferRequest;
import com.sterling.ewallet.transaction.entity.TransactionEntity;
import com.sterling.ewallet.transaction.exception.TransactionException;
import com.sterling.ewallet.transaction.repository.TransactionRepository;
import feign.FeignException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class TransactionService {

    private static final Logger LOGGER = LoggerFactory.getLogger(TransactionService.class);

    private final TransactionRepository transactionRepository;
    private final UserClient userClient;
    private final WalletClient walletClient;
    private final RabbitTemplate rabbitTemplate;

    public TransactionService(TransactionRepository transactionRepository,
                              UserClient userClient,
                              WalletClient walletClient,
                              RabbitTemplate rabbitTemplate) {
        this.transactionRepository = transactionRepository;
        this.userClient = userClient;
        this.walletClient = walletClient;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Transactional
    public TransactionEntity initiateTransfer(String fromUserId, TransferRequest request) {
        if (Objects.equals(fromUserId, request.getToUserId())) {
            throw new TransactionException("Cannot transfer to the same account");
        }
        verifyUser(request.getToUserId());
        ensureSufficientBalance(fromUserId, request.getAmount());

        TransactionEntity txn = new TransactionEntity();
        txn.setReference(generateReference("TRF"));
        txn.setType(TransactionEntity.Type.TRANSFER);
        txn.setStatus(TransactionEntity.Status.PENDING);
        txn.setFromUserId(fromUserId);
        txn.setToUserId(request.getToUserId());
        txn.setAmount(request.getAmount());
        txn.setReason(request.getReason());
        TransactionEntity saved = transactionRepository.save(txn);

        publishInitiated(saved);
        return saved;
    }

    @Transactional
    public TransactionEntity initiateMerchantPayment(String fromUserId, MerchantPaymentRequest request) {
        ensureSufficientBalance(fromUserId, request.getAmount());

        TransactionEntity txn = new TransactionEntity();
        txn.setReference(generateReference("MPP"));
        txn.setType(TransactionEntity.Type.MERCHANT_PAYMENT);
        txn.setStatus(TransactionEntity.Status.PENDING);
        txn.setFromUserId(fromUserId);
        txn.setMerchantId(request.getMerchantId());
        txn.setAmount(request.getAmount());
        txn.setReason(request.getReason());
        TransactionEntity saved = transactionRepository.save(txn);

        publishInitiated(saved);
        return saved;
    }

    @Transactional
    public TransactionEntity initiateTopup(String userId, TopupRequest request) {
        TransactionEntity txn = new TransactionEntity();
        txn.setReference(generateReference("TOP"));
        txn.setType(TransactionEntity.Type.TOPUP);
        txn.setStatus(TransactionEntity.Status.PENDING);
        txn.setToUserId(userId);
        txn.setAmount(request.getAmount());
        txn.setReason(request.getReason() == null ? "Top-up via " + request.getPaymentGatewayReference()
                : request.getReason());
        TransactionEntity saved = transactionRepository.save(txn);

        publishInitiated(saved);
        return saved;
    }

    @Transactional
    public void completeTransaction(String reference, boolean success, String message) {
        TransactionEntity txn = transactionRepository.findByReference(reference)
                .orElseThrow(() -> new TransactionException("Transaction not found: " + reference));
        if (txn.getStatus() != TransactionEntity.Status.PENDING) {
            LOGGER.warn("Transaction {} already finalised with status={}", reference, txn.getStatus());
            return;
        }
        txn.setStatus(success ? TransactionEntity.Status.COMPLETED : TransactionEntity.Status.FAILED);
        if (!success) {
            txn.setFailureMessage(message);
        }
        txn.setCompletedAt(Instant.now());
        transactionRepository.save(txn);
        publishCompleted(txn);
    }

    @Transactional(readOnly = true)
    public TransactionEntity getByReference(String reference) {
        return transactionRepository.findByReference(reference)
                .orElseThrow(() -> new TransactionException("Transaction not found: " + reference));
    }

    @Transactional(readOnly = true)
    public List<TransactionEntity> getForUser(String userId) {
        return transactionRepository.findByFromUserIdOrToUserIdOrderByCreatedAtDesc(userId, userId);
    }

    private void verifyUser(String userId) {
        try {
            ApiResponse<UserDto> response = userClient.getUser(userId);
            if (response == null || !response.isSuccess() || response.getData() == null) {
                throw new TransactionException("Target user not found: " + userId);
            }
            if (!response.getData().isActive()) {
                throw new TransactionException("Target user is inactive: " + userId);
            }
        } catch (FeignException ex) {
            LOGGER.warn("Failed to verify user {} via Feign: {}", userId, ex.getMessage());
            throw new TransactionException("Unable to verify target user: " + ex.getMessage());
        }
    }

    private void ensureSufficientBalance(String userId, BigDecimal amount) {
        try {
            ApiResponse<WalletDto> response = walletClient.getWallet(userId);
            if (response == null || !response.isSuccess() || response.getData() == null) {
                throw new TransactionException("Source wallet not found for user: " + userId);
            }
            WalletDto wallet = response.getData();
            if (wallet.getBalance().compareTo(amount) < 0) {
                throw new TransactionException(
                        "Insufficient balance. Available: " + wallet.getBalance() + ", required: " + amount);
            }
        } catch (FeignException ex) {
            LOGGER.warn("Wallet lookup failed for user {}: {}", userId, ex.getMessage());
            throw new TransactionException("Unable to validate wallet balance: " + ex.getMessage());
        }
    }

    private void publishInitiated(TransactionEntity txn) {
        TransactionEvent event = toEvent(txn);
        rabbitTemplate.convertAndSend(
                RabbitTopics.EWALLET_EXCHANGE,
                RabbitTopics.TRANSACTION_INITIATED_ROUTING_KEY,
                event);
        LOGGER.info("Published TransactionInitiatedEvent reference={} type={}", txn.getReference(), txn.getType());
    }

    private void publishCompleted(TransactionEntity txn) {
        TransactionEvent event = toEvent(txn);
        rabbitTemplate.convertAndSend(
                RabbitTopics.EWALLET_EXCHANGE,
                RabbitTopics.TRANSACTION_COMPLETED_ROUTING_KEY,
                event);
        LOGGER.info("Published TransactionCompletedEvent reference={} status={}",
                txn.getReference(), txn.getStatus());
    }

    private TransactionEvent toEvent(TransactionEntity txn) {
        TransactionEvent event = new TransactionEvent();
        event.setTransactionId(txn.getReference());
        event.setType(TransactionEvent.Type.valueOf(txn.getType().name()));
        event.setStatus(TransactionEvent.Status.valueOf(txn.getStatus().name()));
        event.setFromUserId(txn.getFromUserId());
        event.setToUserId(txn.getToUserId());
        event.setMerchantId(txn.getMerchantId());
        event.setAmount(txn.getAmount());
        event.setReason(txn.getReason());
        event.setOccurredAt(Instant.now());
        return event;
    }

    private String generateReference(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }
}
