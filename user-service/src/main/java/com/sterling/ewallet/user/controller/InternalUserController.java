package com.sterling.ewallet.user.controller;

import com.sterling.ewallet.common.dto.ApiResponse;
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
}
