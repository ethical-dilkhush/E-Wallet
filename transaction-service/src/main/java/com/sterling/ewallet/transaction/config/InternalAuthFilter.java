package com.sterling.ewallet.transaction.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Guards service-to-service endpoints under {@code /internal/}. These are meant
 * only for trusted Feign calls from other services and must never be reachable
 * by external clients, so they require a shared secret header that the gateway
 * strips from inbound requests.
 */
@Component
public class InternalAuthFilter extends OncePerRequestFilter {

    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";

    private final String internalSecret;

    public InternalAuthFilter(@Value("${ewallet.internal.secret}") String internalSecret) {
        this.internalSecret = internalSecret;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String provided = request.getHeader(INTERNAL_SECRET_HEADER);
        if (internalSecret == null || internalSecret.isBlank() || !internalSecret.equals(provided)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Forbidden: internal endpoint\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().contains("/internal/");
    }
}
