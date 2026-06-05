package com.sterling.ewallet.transaction.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Adds the shared internal secret to every outbound Feign request so this
 * service can reach other services' {@code /internal/} endpoints. The header is
 * harmless on public endpoints (e.g. GET /api/users/{id}) since those ignore it.
 */
@Configuration
public class FeignClientConfig {

    @Bean
    public RequestInterceptor internalSecretInterceptor(
            @Value("${ewallet.internal.secret}") String internalSecret) {
        return template -> template.header("X-Internal-Secret", internalSecret);
    }
}
