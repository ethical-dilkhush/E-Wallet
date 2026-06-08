package com.sterling.ewallet.user.controller;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.user.dto.PasswordResetConfirmRequest;
import com.sterling.ewallet.user.dto.PasswordResetInitiateRequest;
import com.sterling.ewallet.user.dto.UserCredentialsRequest;
import com.sterling.ewallet.user.dto.UserCredentialsResponse;
import com.sterling.ewallet.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/internal")
public class InternalUserController {

    private final UserService userService;

    public InternalUserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/verify-credentials")
    public ResponseEntity<ApiResponse<UserCredentialsResponse>> verifyCredentials(
            @Valid @RequestBody UserCredentialsRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userService.verifyCredentials(request)));
    }

    @GetMapping("/by-username")
    public ResponseEntity<ApiResponse<UserCredentialsResponse>> findByUsername(
            @RequestParam("username") String username) {
        return ResponseEntity.ok(ApiResponse.ok(userService.findByUsername(username)));
    }

    @PostMapping("/password-reset/request")
    public ResponseEntity<ApiResponse<Void>> requestPasswordReset(
            @Valid @RequestBody PasswordResetInitiateRequest request) {
        userService.requestPasswordReset(request.getEmail());
        return ResponseEntity.ok(ApiResponse.ok("Reset processed", null));
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmPasswordReset(
            @Valid @RequestBody PasswordResetConfirmRequest request) {
        userService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok("Password reset successfully", null));
    }
}
