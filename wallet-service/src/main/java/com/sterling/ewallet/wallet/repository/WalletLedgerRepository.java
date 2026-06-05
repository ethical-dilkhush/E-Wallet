package com.sterling.ewallet.wallet.repository;

import com.sterling.ewallet.wallet.entity.WalletLedgerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WalletLedgerRepository extends JpaRepository<WalletLedgerEntity, Long> {

    List<WalletLedgerEntity> findByWalletIdOrderByCreatedAtDesc(String walletId);

    List<WalletLedgerEntity> findByTransactionId(String transactionId);
}
