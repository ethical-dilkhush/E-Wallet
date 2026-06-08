package com.sterling.ewallet.auth.client;

import com.sterling.ewallet.auth.dto.ForgotPasswordRequest;
import com.sterling.ewallet.auth.dto.ResetPasswordRequest;
import com.sterling.ewallet.common.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "user-service", path = "/api/users")
public interface UserServiceClient {

    @PostMapping("/internal/verify-credentials")
    ApiResponse<UserCredentialsResponse> verifyCredentials(@RequestBody UserCredentialsRequest request);

    @GetMapping("/internal/by-username")
    ApiResponse<UserCredentialsResponse> findByUsername(@RequestParam("username") String username);

    @PostMapping("/internal/password-reset/request")
    ApiResponse<Void> requestPasswordReset(@RequestBody ForgotPasswordRequest request);

    @PostMapping("/internal/password-reset/confirm")
    ApiResponse<Void> confirmPasswordReset(@RequestBody ResetPasswordRequest request);
}
