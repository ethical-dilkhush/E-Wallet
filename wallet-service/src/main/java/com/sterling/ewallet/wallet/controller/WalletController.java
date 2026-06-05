package com.sterling.ewallet.wallet.controller;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.common.dto.WalletDto;
import com.sterling.ewallet.wallet.entity.WalletLedgerEntity;
import com.sterling.ewallet.wallet.service.WalletService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/wallets")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WalletDto>> create(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Wallet created", walletService.createWallet(userId)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<WalletDto>> me(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.ok(walletService.getByUserId(userId)));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<WalletDto>> byUserId(
            @PathVariable String userId,
            @RequestHeader("X-User-Id") String callerId) {
        if (!userId.equals(callerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("You can only view your own wallet"));
        }
        return ResponseEntity.ok(ApiResponse.ok(walletService.getByUserId(userId)));
    }

    @GetMapping("/me/ledger")
    public ResponseEntity<ApiResponse<List<WalletLedgerEntity>>> ledger(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.ok(walletService.getLedger(userId)));
    }
}
