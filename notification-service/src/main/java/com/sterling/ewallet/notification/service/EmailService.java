package com.sterling.ewallet.notification.service;

import com.sterling.ewallet.common.events.TransactionEvent;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class EmailService {

    private static final Logger LOGGER = LoggerFactory.getLogger(EmailService.class);
    private static final DateTimeFormatter WHEN_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").withZone(ZoneId.systemDefault());

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String frontendUrl;

    public EmailService(JavaMailSender mailSender,
                        @Value("${notification.mail.from:}") String fromAddress,
                        @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.frontendUrl = frontendUrl;
    }

    public void sendDebitAlert(String toEmail, String recipientName, TransactionEvent event, String counterparty) {
        String amount = formatInr(event.getAmount());
        String subject = "Debited " + amount + " from your Sterling Wallet";
        String body = buildBody("debit", recipientName, amount, event, counterparty);
        send(toEmail, subject, body, event.getTransactionId(), "debit");
    }

    public void sendCreditAlert(String toEmail, String recipientName, TransactionEvent event, String counterparty) {
        String amount = formatInr(event.getAmount());
        String subject = "Credited " + amount + " to your Sterling Wallet";
        String body = buildBody("credit", recipientName, amount, event, counterparty);
        send(toEmail, subject, body, event.getTransactionId(), "credit");
    }

    public void sendPasswordResetEmail(String toEmail, String recipientName, String token, Instant expiresAt) {
        String base = frontendUrl != null && frontendUrl.endsWith("/")
                ? frontendUrl.substring(0, frontendUrl.length() - 1)
                : frontendUrl;
        String link = base + "/reset-password?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
        String expiry = expiresAt != null ? WHEN_FORMAT.format(expiresAt) : "soon";
        String name = recipientName != null && !recipientName.isBlank() ? recipientName : "there";

        String body = """
                Hi %s,

                We received a request to reset your Sterling E-Wallet password.

                Click the link below to choose a new password:
                %s

                This link expires at %s. If you did not request a password reset,
                you can safely ignore this email — your password will not change.

                — Sterling E-Wallet
                """.formatted(name, link, expiry).trim();

        send(toEmail, "Reset your Sterling E-Wallet password", body, "password-reset", "password-reset");
    }

    private String buildBody(String direction, String recipientName, String amount,
                             TransactionEvent event, String counterparty) {
        String typeLabel = switch (event.getType()) {
            case TOPUP -> "Top-up";
            case TRANSFER -> "Transfer";
            case MERCHANT_PAYMENT -> "Merchant payment";
        };
        String when = event.getOccurredAt() != null ? WHEN_FORMAT.format(event.getOccurredAt()) : "N/A";
        String reason = event.getReason() != null && !event.getReason().isBlank()
                ? event.getReason() : "—";

        return """
                Hi %s,

                Your Sterling Wallet account has been %s.

                Amount:     %s
                Type:       %s
                %s
                Reason:     %s
                Reference:  %s
                Time:       %s

                If you did not authorise this transaction, please contact support immediately.

                — Sterling E-Wallet
                """.formatted(
                recipientName,
                direction.equals("debit") ? "debited" : "credited",
                amount,
                typeLabel,
                counterpartyLine(direction, event.getType(), counterparty),
                reason,
                event.getTransactionId(),
                when
        ).trim();
    }

    private static String counterpartyLine(String direction, TransactionEvent.Type type, String counterparty) {
        if (type == TransactionEvent.Type.TOPUP) {
            return "Source:     Wallet top-up";
        }
        if (type == TransactionEvent.Type.MERCHANT_PAYMENT) {
            return "Merchant:   " + counterparty;
        }
        return direction.equals("debit")
                ? "Sent to:    " + counterparty
                : "Received from: " + counterparty;
    }

    private void send(String toEmail, String subject, String body, String reference, String kind) {
        if (fromAddress == null || fromAddress.isBlank()) {
            LOGGER.warn("MAIL_FROM/MAIL_USERNAME not configured; skipping {} email for ref={}", kind, reference);
            return;
        }
        if (toEmail == null || toEmail.isBlank()) {
            LOGGER.warn("No email address for {} notification ref={}", kind, reference);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(body);
            mailSender.send(message);
            LOGGER.info("Sent {} email to {} for ref={}", kind, toEmail, reference);
        } catch (MessagingException ex) {
            LOGGER.error("Failed to send {} email to {} for ref={}: {}", kind, toEmail, reference, ex.getMessage());
        } catch (Exception ex) {
            LOGGER.error("Unexpected error sending {} email for ref={}", kind, reference, ex);
        }
    }

    static String formatInr(BigDecimal amount) {
        if (amount == null) {
            return "Rs. 0.00";
        }
        NumberFormat fmt = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
        return fmt.format(amount);
    }
}
