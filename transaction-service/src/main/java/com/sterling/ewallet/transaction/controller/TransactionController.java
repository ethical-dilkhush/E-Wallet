package com.sterling.ewallet.transaction.controller;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.transaction.dto.MerchantPaymentRequest;
import com.sterling.ewallet.transaction.dto.TransferRequest;
import com.sterling.ewallet.transaction.entity.TransactionEntity;
import com.sterling.ewallet.transaction.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping("/transfer")
    public ResponseEntity<ApiResponse<TransactionEntity>> transfer(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody TransferRequest request) {
        TransactionEntity txn = transactionService.initiateTransfer(userId, request);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.ok("Transfer initiated; awaiting wallet confirmation", txn));
    }

    @PostMapping("/merchant-payment")
    public ResponseEntity<ApiResponse<TransactionEntity>> merchantPayment(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody MerchantPaymentRequest request) {
        TransactionEntity txn = transactionService.initiateMerchantPayment(userId, request);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.ok("Merchant payment initiated; awaiting wallet confirmation", txn));
    }

    @GetMapping("/{reference}")
    public ResponseEntity<ApiResponse<TransactionEntity>> getByReference(
            @PathVariable String reference,
            @RequestHeader("X-User-Id") String callerId) {
        TransactionEntity txn = transactionService.getByReference(reference);
        if (!callerId.equals(txn.getFromUserId()) && !callerId.equals(txn.getToUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("You are not a party to this transaction"));
        }
        return ResponseEntity.ok(ApiResponse.ok(txn));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<TransactionEntity>>> myTransactions(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.ok(transactionService.getForUser(userId)));
    }
}
