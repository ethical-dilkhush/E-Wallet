package com.sterling.ewallet.auth.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final long accessTokenValidityMillis;
    private final long refreshTokenValidityMillis;
    private final String issuer;

    public JwtTokenProvider(
            @Value("${ewallet.security.jwt.secret}") String secret,
            @Value("${ewallet.security.jwt.access-token-validity-ms:3600000}") long accessTokenValidityMillis,
            @Value("${ewallet.security.jwt.refresh-token-validity-ms:86400000}") long refreshTokenValidityMillis,
            @Value("${ewallet.security.jwt.issuer:sterling-ewallet}") String issuer) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenValidityMillis = accessTokenValidityMillis;
        this.refreshTokenValidityMillis = refreshTokenValidityMillis;
        this.issuer = issuer;
    }

    public String generateAccessToken(String userId, String username, List<String> roles) {
        return buildToken(userId, username, roles, accessTokenValidityMillis, "access");
    }

    public String generateRefreshToken(String userId, String username, List<String> roles) {
        return buildToken(userId, username, roles, refreshTokenValidityMillis, "refresh");
    }

    private String buildToken(String userId, String username, List<String> roles, long ttlMillis, String tokenType) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + ttlMillis);
        return Jwts.builder()
                .issuer(issuer)
                .subject(username)
                .issuedAt(now)
                .expiration(expiry)
                .claims(Map.of(
                        "userId", userId,
                        "roles", roles,
                        "type", tokenType
                ))
                .signWith(secretKey)
                .compact();
    }

    public Claims parse(String token) {
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token);
        return jws.getPayload();
    }

    public long getAccessTokenValiditySeconds() {
        return accessTokenValidityMillis / 1000;
    }
}
