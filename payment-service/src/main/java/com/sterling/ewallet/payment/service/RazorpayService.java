package com.sterling.ewallet.payment.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import com.sterling.ewallet.payment.exception.PaymentException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Thin wrapper around the Razorpay SDK: creates orders and verifies the payment
 * signature returned by Razorpay Checkout. The key secret never leaves this service.
 */
@Service
public class RazorpayService {

    private static final Logger LOGGER = LoggerFactory.getLogger(RazorpayService.class);

    private final String keyId;
    private final String keySecret;
    private final String currency;

    public RazorpayService(@Value("${razorpay.key-id}") String keyId,
                           @Value("${razorpay.key-secret}") String keySecret,
                           @Value("${razorpay.currency:INR}") String currency) {
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.currency = currency;
    }

    public Order createOrder(BigDecimal amount, String receipt) {
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            JSONObject options = new JSONObject();
            // Razorpay expects the amount in the smallest currency unit (paise for INR).
            options.put("amount", amount.movePointRight(2).intValueExact());
            options.put("currency", currency);
            options.put("receipt", receipt);
            return client.orders.create(options);
        } catch (RazorpayException ex) {
            LOGGER.error("Razorpay order creation failed: {}", ex.getMessage());
            throw new PaymentException("Could not create payment order: " + ex.getMessage(), ex);
        }
    }

    public boolean verifySignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", orderId);
            attributes.put("razorpay_payment_id", paymentId);
            attributes.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(attributes, keySecret);
        } catch (RazorpayException ex) {
            LOGGER.warn("Razorpay signature verification error: {}", ex.getMessage());
            return false;
        }
    }

    public String getKeyId() {
        return keyId;
    }

    public String getCurrency() {
        return currency;
    }
}
