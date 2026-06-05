package com.sterling.ewallet.payment.client;

import com.sterling.ewallet.payment.config.FeignClientConfig;
import com.sterling.ewallet.payment.dto.InternalTopupRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "transaction-service", configuration = FeignClientConfig.class)
public interface TransactionInternalClient {

    @PostMapping("/api/transactions/internal/topup")
    void topup(@RequestBody InternalTopupRequest request);
}
