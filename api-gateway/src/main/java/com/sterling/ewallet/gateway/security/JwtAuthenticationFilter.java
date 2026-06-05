package com.sterling.ewallet.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Component
public class JwtAuthenticationFilter extends AbstractGatewayFilterFactory<JwtAuthenticationFilter.Config> {

    private static final Logger LOGGER = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final SecretKey secretKey;

    public JwtAuthenticationFilter(@Value("${ewallet.security.jwt.secret}") String secret) {
        super(Config.class);
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return unauthorized(exchange.getResponse(), "Missing or invalid Authorization header");
            }

            String token = authHeader.substring(7);
            try {
                Jws<Claims> jws = Jwts.parser()
                        .verifyWith(secretKey)
                        .build()
                        .parseSignedClaims(token);
                Claims claims = jws.getPayload();

                ServerHttpRequest mutated = request.mutate()
                        .headers(headers -> {
                            // Overwrite (not append) identity headers so a client cannot
                            // spoof them, and strip the internal secret so it can only ever
                            // be set by trusted service-to-service Feign calls.
                            headers.set("X-User-Id", String.valueOf(claims.get("userId")));
                            headers.set("X-Username", String.valueOf(claims.getSubject()));
                            headers.set("X-User-Roles", String.valueOf(claims.get("roles")));
                            headers.remove("X-Internal-Secret");
                        })
                        .build();
                return chain.filter(exchange.mutate().request(mutated).build());
            } catch (Exception ex) {
                LOGGER.warn("JWT validation failed: {}", ex.getMessage());
                return unauthorized(exchange.getResponse(), "Invalid or expired JWT token");
            }
        };
    }

    private Mono<Void> unauthorized(ServerHttpResponse response, String message) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json");
        String body = "{\"success\":false,\"message\":\"" + message + "\"}";
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8))));
    }

    public static class Config {
    }
}
