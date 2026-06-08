package com.sterling.ewallet.auth.controller;

import com.sterling.ewallet.auth.dto.ForgotPasswordRequest;
import com.sterling.ewallet.auth.dto.LoginRequest;
import com.sterling.ewallet.auth.dto.ResetPasswordRequest;
import com.sterling.ewallet.auth.dto.TokenResponse;
import com.sterling.ewallet.auth.service.AuthService;
import com.sterling.ewallet.common.dto.ApiResponse;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(@Valid @RequestBody LoginRequest request) {
        TokenResponse token = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", token));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        // Generic response regardless of whether the email is registered.
        return ResponseEntity.ok(ApiResponse.ok(
                "If an account exists for that email, a password reset link has been sent.", null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.ok("Password reset successfully. You can now sign in.", null));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(@RequestBody Map<String, String> body) {
        TokenResponse token = authService.refresh(body.get("refreshToken"));
        return ResponseEntity.ok(ApiResponse.ok("Token refreshed", token));
    }

    @PostMapping("/validate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validate(
            @RequestHeader("Authorization") String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Missing Bearer token"));
        }
        Claims claims = authService.validate(authorization.substring(7));
        Map<String, Object> payload = Map.of(
                "userId", claims.get("userId"),
                "username", claims.getSubject(),
                "roles", claims.get("roles"),
                "expiresAt", claims.getExpiration().toInstant().toString()
        );
        return ResponseEntity.ok(ApiResponse.ok("Token valid", payload));
    }
}
