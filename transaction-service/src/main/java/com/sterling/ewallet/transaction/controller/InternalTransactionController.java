package com.sterling.ewallet.transaction.controller;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.transaction.dto.InternalTopupRequest;
import com.sterling.ewallet.transaction.dto.TopupRequest;
import com.sterling.ewallet.transaction.entity.TransactionEntity;
import com.sterling.ewallet.transaction.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Service-to-service endpoints under {@code /internal/}. Protected by
 * {@link com.sterling.ewallet.transaction.config.InternalAuthFilter} which requires
 * the shared internal secret, so these are never reachable by external clients.
 */
@RestController
@RequestMapping("/api/transactions/internal")
public class InternalTransactionController {

    private final TransactionService transactionService;

    public InternalTransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping("/topup")
    public ResponseEntity<ApiResponse<TransactionEntity>> topup(@Valid @RequestBody InternalTopupRequest request) {
        TopupRequest topup = new TopupRequest();
        topup.setAmount(request.getAmount());
        topup.setPaymentGatewayReference(request.getPaymentReference());
        topup.setReason(request.getReason());
        TransactionEntity txn = transactionService.initiateTopup(request.getUserId(), topup);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.ok("Top-up initiated; awaiting wallet credit", txn));
    }
}
