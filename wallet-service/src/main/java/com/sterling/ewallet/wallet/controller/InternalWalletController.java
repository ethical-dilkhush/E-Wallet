package com.sterling.ewallet.wallet.controller;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.common.dto.WalletDto;
import com.sterling.ewallet.wallet.dto.WalletOperationRequest;
import com.sterling.ewallet.wallet.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/wallets/internal")
public class InternalWalletController {

    private final WalletService walletService;

    public InternalWalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<WalletDto>> get(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(walletService.getByUserId(userId)));
    }

    @PostMapping("/{userId}")
    public ResponseEntity<ApiResponse<WalletDto>> create(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(walletService.createWallet(userId)));
    }

    @PostMapping("/credit")
    public ResponseEntity<ApiResponse<WalletDto>> credit(@Valid @RequestBody WalletOperationRequest request) {
        WalletDto dto = walletService.credit(request.getUserId(), request.getAmount(),
                request.getTransactionId(), request.getDescription());
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    @PostMapping("/debit")
    public ResponseEntity<ApiResponse<WalletDto>> debit(@Valid @RequestBody WalletOperationRequest request) {
        WalletDto dto = walletService.debit(request.getUserId(), request.getAmount(),
                request.getTransactionId(), request.getDescription());
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }
}
