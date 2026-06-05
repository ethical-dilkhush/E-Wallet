package com.sterling.ewallet.wallet.service;

import com.sterling.ewallet.common.dto.WalletDto;
import com.sterling.ewallet.wallet.entity.WalletEntity;
import com.sterling.ewallet.wallet.entity.WalletLedgerEntity;
import com.sterling.ewallet.wallet.exception.InsufficientBalanceException;
import com.sterling.ewallet.wallet.exception.WalletException;
import com.sterling.ewallet.wallet.repository.WalletLedgerRepository;
import com.sterling.ewallet.wallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private WalletLedgerRepository ledgerRepository;

    @InjectMocks
    private WalletService walletService;

    private static final String USER_ID = "USR-01TESTUSER0000000000001";
    private static final String WALLET_ID = "WLT-01TESTWALLET00000000010";

    private WalletEntity wallet;

    @BeforeEach
    void setUp() {
        wallet = new WalletEntity();
        wallet.setId(WALLET_ID);
        wallet.setUserId(USER_ID);
        wallet.setBalance(new BigDecimal("100.00"));
        wallet.setActive(true);
        wallet.setCurrency("INR");
    }

    @Test
    void createWallet_isIdempotent() {
        when(walletRepository.existsByUserId(USER_ID)).thenReturn(true);
        when(walletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(wallet));

        WalletDto dto = walletService.createWallet(USER_ID);

        assertThat(dto.getUserId()).isEqualTo(USER_ID);
        verify(walletRepository, never()).save(any());
    }

    @Test
    void credit_addsAmount_andWritesLedger() {
        when(walletRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WalletDto dto = walletService.credit(USER_ID, new BigDecimal("50.00"), "TXN1", "top-up");

        assertThat(dto.getBalance()).isEqualByComparingTo("150.00");
        verify(ledgerRepository).save(any(WalletLedgerEntity.class));
    }

    @Test
    void debit_subtractsAmount_whenSufficient() {
        when(walletRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WalletDto dto = walletService.debit(USER_ID, new BigDecimal("30.00"), "TXN2", "transfer");

        assertThat(dto.getBalance()).isEqualByComparingTo("70.00");
    }

    @Test
    void debit_throws_whenInsufficientBalance() {
        when(walletRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(wallet));

        assertThatThrownBy(() -> walletService.debit(USER_ID, new BigDecimal("500.00"), "TXN3", "x"))
                .isInstanceOf(InsufficientBalanceException.class);

        verify(walletRepository, never()).save(any());
    }

    @Test
    void credit_throws_whenWalletInactive() {
        wallet.setActive(false);
        when(walletRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(wallet));

        assertThatThrownBy(() -> walletService.credit(USER_ID, new BigDecimal("10"), "TXN", "x"))
                .isInstanceOf(WalletException.class)
                .hasMessageContaining("inactive");
    }
}
