package com.sterling.ewallet.transaction.service;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.common.dto.UserDto;
import com.sterling.ewallet.common.dto.WalletDto;
import com.sterling.ewallet.transaction.client.UserClient;
import com.sterling.ewallet.transaction.client.WalletClient;
import com.sterling.ewallet.transaction.dto.TransferRequest;
import com.sterling.ewallet.transaction.entity.TransactionEntity;
import com.sterling.ewallet.transaction.exception.TransactionException;
import com.sterling.ewallet.transaction.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private UserClient userClient;

    @Mock
    private WalletClient walletClient;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private TransactionService transactionService;

    private static final String FROM_USER_ID = "USR-01TESTUSER0000000000001";
    private static final String TO_USER_ID = "USR-01TESTUSER0000000000002";

    private UserDto activeUser;
    private WalletDto wallet;

    @BeforeEach
    void setUp() {
        activeUser = new UserDto();
        activeUser.setId(TO_USER_ID);
        activeUser.setActive(true);

        wallet = new WalletDto();
        wallet.setUserId(FROM_USER_ID);
        wallet.setBalance(new BigDecimal("500.00"));
    }

    @Test
    void initiateTransfer_persistsPending_andPublishesEvent() {
        when(userClient.getUser(TO_USER_ID)).thenReturn(ApiResponse.ok(activeUser));
        when(walletClient.getWallet(FROM_USER_ID)).thenReturn(ApiResponse.ok(wallet));
        when(transactionRepository.save(any(TransactionEntity.class))).thenAnswer(inv -> {
            TransactionEntity e = inv.getArgument(0);
            e.setId(100L);
            return e;
        });

        TransferRequest req = new TransferRequest();
        req.setToUserId(TO_USER_ID);
        req.setAmount(new BigDecimal("100"));
        req.setReason("Dinner");

        TransactionEntity txn = transactionService.initiateTransfer(FROM_USER_ID, req);

        assertThat(txn.getStatus()).isEqualTo(TransactionEntity.Status.PENDING);
        assertThat(txn.getType()).isEqualTo(TransactionEntity.Type.TRANSFER);
        assertThat(txn.getReference()).startsWith("TRF-");
        verify(rabbitTemplate).convertAndSend(anyString(), anyString(), (Object) any());
    }

    @Test
    void initiateTransfer_throws_whenInsufficientBalance() {
        when(userClient.getUser(TO_USER_ID)).thenReturn(ApiResponse.ok(activeUser));
        WalletDto poor = new WalletDto();
        poor.setUserId(FROM_USER_ID);
        poor.setBalance(new BigDecimal("5.00"));
        when(walletClient.getWallet(FROM_USER_ID)).thenReturn(ApiResponse.ok(poor));

        TransferRequest req = new TransferRequest();
        req.setToUserId(TO_USER_ID);
        req.setAmount(new BigDecimal("100"));

        assertThatThrownBy(() -> transactionService.initiateTransfer(FROM_USER_ID, req))
                .isInstanceOf(TransactionException.class)
                .hasMessageContaining("Insufficient");
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void initiateTransfer_throws_whenSameAccount() {
        TransferRequest req = new TransferRequest();
        req.setToUserId(FROM_USER_ID);
        req.setAmount(new BigDecimal("10"));
        assertThatThrownBy(() -> transactionService.initiateTransfer(FROM_USER_ID, req))
                .isInstanceOf(TransactionException.class)
                .hasMessageContaining("same account");
    }

    @Test
    void completeTransaction_marksCompleted_andPublishesEvent() {
        TransactionEntity txn = new TransactionEntity();
        txn.setReference("REF1");
        txn.setStatus(TransactionEntity.Status.PENDING);
        txn.setType(TransactionEntity.Type.TRANSFER);
        txn.setAmount(new BigDecimal("10"));
        when(transactionRepository.findByReference("REF1")).thenReturn(Optional.of(txn));

        transactionService.completeTransaction("REF1", true, "OK");

        assertThat(txn.getStatus()).isEqualTo(TransactionEntity.Status.COMPLETED);
        verify(rabbitTemplate).convertAndSend(anyString(), eq("transaction.completed"), (Object) any());
    }
}
