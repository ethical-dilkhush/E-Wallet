package com.sterling.ewallet.transaction.repository;

import com.sterling.ewallet.transaction.entity.TransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<TransactionEntity, Long> {

    Optional<TransactionEntity> findByReference(String reference);

    List<TransactionEntity> findByFromUserIdOrToUserIdOrderByCreatedAtDesc(String fromUserId, String toUserId);
}
