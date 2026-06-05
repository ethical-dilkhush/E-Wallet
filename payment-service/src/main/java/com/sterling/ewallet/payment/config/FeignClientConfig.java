package com.sterling.ewallet.payment.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

/**
 * Adds the shared internal secret to outbound Feign requests so payment-service
 * can reach transaction-service's {@code /internal/} top-up endpoint. Not annotated
 * with {@code @Configuration} so it is only applied to clients that reference it.
 */
public class FeignClientConfig {

    @Bean
    public RequestInterceptor internalSecretInterceptor(
            @Value("${ewallet.internal.secret}") String internalSecret) {
        return template -> template.header("X-Internal-Secret", internalSecret);
    }
}
