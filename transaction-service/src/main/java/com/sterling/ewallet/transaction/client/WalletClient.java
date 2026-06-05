package com.sterling.ewallet.transaction.client;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.common.dto.WalletDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "wallet-service", path = "/api/wallets/internal")
public interface WalletClient {

    @GetMapping("/{userId}")
    ApiResponse<WalletDto> getWallet(@PathVariable("userId") String userId);
}
