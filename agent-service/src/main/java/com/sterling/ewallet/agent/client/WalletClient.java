package com.sterling.ewallet.agent.client;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.common.dto.WalletDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "wallet-service")
public interface WalletClient {

    @GetMapping("/api/wallets/me")
    ApiResponse<WalletDto> myWallet(@RequestHeader("X-User-Id") String userId);
}
