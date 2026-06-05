package com.sterling.ewallet.auth.service;

import com.sterling.ewallet.auth.client.UserCredentialsRequest;
import com.sterling.ewallet.auth.client.UserCredentialsResponse;
import com.sterling.ewallet.auth.client.UserServiceClient;
import com.sterling.ewallet.auth.dto.LoginRequest;
import com.sterling.ewallet.auth.dto.TokenResponse;
import com.sterling.ewallet.auth.jwt.JwtTokenProvider;
import com.sterling.ewallet.common.dto.ApiResponse;
import io.jsonwebtoken.Claims;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuthService.class);

    private final UserServiceClient userServiceClient;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(UserServiceClient userServiceClient, JwtTokenProvider jwtTokenProvider) {
        this.userServiceClient = userServiceClient;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public TokenResponse login(LoginRequest request) {
        ApiResponse<UserCredentialsResponse> response = userServiceClient.verifyCredentials(
                new UserCredentialsRequest(request.getUsername(), request.getPassword()));

        if (response == null || !response.isSuccess() || response.getData() == null) {
            LOGGER.warn("Login failed for user {}", request.getUsername());
            throw new BadCredentialsException("Invalid username or password");
        }

        UserCredentialsResponse user = response.getData();
        if (!user.isActive()) {
            throw new BadCredentialsException("User account is disabled");
        }

        List<String> roles = user.getRoles() == null ? List.of("USER") : user.getRoles();
        String access = jwtTokenProvider.generateAccessToken(user.getUserId(), user.getUsername(), roles);
        String refresh = jwtTokenProvider.generateRefreshToken(user.getUserId(), user.getUsername(), roles);

        return new TokenResponse(access, refresh, jwtTokenProvider.getAccessTokenValiditySeconds(),
                user.getUserId(), user.getUsername());
    }

    @SuppressWarnings("unchecked")
    public TokenResponse refresh(String refreshToken) {
        Claims claims = jwtTokenProvider.parse(refreshToken);
        String type = String.valueOf(claims.get("type"));
        if (!"refresh".equals(type)) {
            throw new BadCredentialsException("Provided token is not a refresh token");
        }
        String userId = String.valueOf(claims.get("userId"));
        String username = claims.getSubject();
        List<String> roles = (List<String>) claims.get("roles");

        String access = jwtTokenProvider.generateAccessToken(userId, username, roles);
        String refresh = jwtTokenProvider.generateRefreshToken(userId, username, roles);
        return new TokenResponse(access, refresh, jwtTokenProvider.getAccessTokenValiditySeconds(),
                userId, username);
    }

    public Claims validate(String accessToken) {
        return jwtTokenProvider.parse(accessToken);
    }
}
