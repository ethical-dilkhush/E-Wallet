package com.sterling.ewallet.wallet.service;

import com.sterling.ewallet.common.dto.WalletDto;
import com.sterling.ewallet.common.id.Ids;
import com.sterling.ewallet.wallet.entity.WalletEntity;
import com.sterling.ewallet.wallet.entity.WalletLedgerEntity;
import com.sterling.ewallet.wallet.exception.InsufficientBalanceException;
import com.sterling.ewallet.wallet.exception.WalletException;
import com.sterling.ewallet.wallet.repository.WalletLedgerRepository;
import com.sterling.ewallet.wallet.repository.WalletRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
public class WalletService {

    private static final Logger LOGGER = LoggerFactory.getLogger(WalletService.class);

    private final WalletRepository walletRepository;
    private final WalletLedgerRepository ledgerRepository;

    public WalletService(WalletRepository walletRepository, WalletLedgerRepository ledgerRepository) {
        this.walletRepository = walletRepository;
        this.ledgerRepository = ledgerRepository;
    }

    @Transactional
    public WalletDto createWallet(String userId) {
        if (walletRepository.existsByUserId(userId)) {
            LOGGER.info("Wallet already exists for userId={}, skipping creation", userId);
            return toDto(walletRepository.findByUserId(userId).orElseThrow());
        }
        WalletEntity wallet = new WalletEntity();
        wallet.setId(Ids.walletId());
        wallet.setUserId(userId);
        wallet.setBalance(BigDecimal.ZERO);
        wallet.setCurrency("INR");
        wallet.setActive(true);
        WalletEntity saved = walletRepository.save(wallet);
        LOGGER.info("Provisioned wallet id={} for userId={}", saved.getId(), userId);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public WalletDto getByUserId(String userId) {
        return toDto(walletRepository.findByUserId(userId)
                .orElseThrow(() -> new WalletException("Wallet not found for userId: " + userId)));
    }

    @Transactional(readOnly = true)
    public List<WalletDto> findAll() {
        return walletRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public WalletDto credit(String userId, BigDecimal amount, String transactionId, String description) {
        if (amount.signum() <= 0) {
            throw new WalletException("Credit amount must be positive");
        }
        WalletEntity wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new WalletException("Wallet not found for userId: " + userId));
        if (!wallet.isActive()) {
            throw new WalletException("Wallet is inactive for userId: " + userId);
        }
        wallet.setBalance(wallet.getBalance().add(amount));
        wallet.setUpdatedAt(Instant.now());
        WalletEntity saved = walletRepository.save(wallet);
        writeLedger(saved, transactionId, WalletLedgerEntity.Direction.CREDIT, amount, description);
        LOGGER.info("Credited {} to wallet of userId={} (txn={}). New balance: {}",
                amount, userId, transactionId, saved.getBalance());
        return toDto(saved);
    }

    @Transactional
    public WalletDto debit(String userId, BigDecimal amount, String transactionId, String description) {
        if (amount.signum() <= 0) {
            throw new WalletException("Debit amount must be positive");
        }
        WalletEntity wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new WalletException("Wallet not found for userId: " + userId));
        if (!wallet.isActive()) {
            throw new WalletException("Wallet is inactive for userId: " + userId);
        }
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(
                    "Insufficient balance. Available: " + wallet.getBalance() + ", required: " + amount);
        }
        wallet.setBalance(wallet.getBalance().subtract(amount));
        wallet.setUpdatedAt(Instant.now());
        WalletEntity saved = walletRepository.save(wallet);
        writeLedger(saved, transactionId, WalletLedgerEntity.Direction.DEBIT, amount, description);
        LOGGER.info("Debited {} from wallet of userId={} (txn={}). New balance: {}",
                amount, userId, transactionId, saved.getBalance());
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<WalletLedgerEntity> getLedger(String userId) {
        WalletEntity wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new WalletException("Wallet not found for userId: " + userId));
        return ledgerRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId());
    }

    private void writeLedger(WalletEntity wallet, String transactionId,
                              WalletLedgerEntity.Direction direction, BigDecimal amount, String description) {
        WalletLedgerEntity entry = new WalletLedgerEntity();
        entry.setWalletId(wallet.getId());
        entry.setTransactionId(transactionId);
        entry.setDirection(direction);
        entry.setAmount(amount);
        entry.setBalanceAfter(wallet.getBalance());
        entry.setDescription(description);
        ledgerRepository.save(entry);
    }

    private WalletDto toDto(WalletEntity entity) {
        WalletDto dto = new WalletDto();
        dto.setId(entity.getId());
        dto.setUserId(entity.getUserId());
        dto.setBalance(entity.getBalance());
        dto.setCurrency(entity.getCurrency());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
