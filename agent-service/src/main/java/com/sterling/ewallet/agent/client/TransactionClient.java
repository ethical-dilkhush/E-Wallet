package com.sterling.ewallet.agent.client;

import com.sterling.ewallet.agent.dto.TransactionView;
import com.sterling.ewallet.common.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;

@FeignClient(name = "transaction-service")
public interface TransactionClient {

    @GetMapping("/api/transactions/me")
    ApiResponse<List<TransactionView>> myTransactions(@RequestHeader("X-User-Id") String userId);
}
