package com.sterling.ewallet.payment.service;

import com.razorpay.Order;
import com.sterling.ewallet.payment.client.TransactionInternalClient;
import com.sterling.ewallet.payment.dto.CreateOrderResponse;
import com.sterling.ewallet.payment.dto.InternalTopupRequest;
import com.sterling.ewallet.payment.dto.VerifyPaymentRequest;
import com.sterling.ewallet.payment.entity.PaymentEntity;
import com.sterling.ewallet.payment.exception.PaymentException;
import com.sterling.ewallet.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger LOGGER = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final RazorpayService razorpayService;
    private final TransactionInternalClient transactionInternalClient;

    public PaymentService(PaymentRepository paymentRepository,
                          RazorpayService razorpayService,
                          TransactionInternalClient transactionInternalClient) {
        this.paymentRepository = paymentRepository;
        this.razorpayService = razorpayService;
        this.transactionInternalClient = transactionInternalClient;
    }

    @Transactional
    public CreateOrderResponse createOrder(String userId, BigDecimal amount) {
        String receipt = "rcpt_" + System.currentTimeMillis();
        Order order = razorpayService.createOrder(amount, receipt);
        String orderId = order.get("id");

        PaymentEntity payment = new PaymentEntity();
        payment.setId("PAY-" + UUID.randomUUID().toString().replace("-", ""));
        payment.setUserId(userId);
        payment.setAmount(amount);
        payment.setCurrency(razorpayService.getCurrency());
        payment.setRazorpayOrderId(orderId);
        payment.setStatus(PaymentEntity.Status.CREATED);
        paymentRepository.save(payment);

        LOGGER.info("Created Razorpay order {} for userId={} amount={}", orderId, userId, amount);
        return new CreateOrderResponse(orderId, razorpayService.getKeyId(), amount, razorpayService.getCurrency());
    }

    @Transactional
    public void verifyAndCredit(String userId, VerifyPaymentRequest request) {
        PaymentEntity payment = paymentRepository.findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new PaymentException("Unknown payment order: " + request.getRazorpayOrderId()));

        if (!payment.getUserId().equals(userId)) {
            throw new PaymentException("This payment does not belong to the current user");
        }

        // Idempotency: never credit the same payment twice (client retry or webhook).
        if (payment.getStatus() == PaymentEntity.Status.CREDITED) {
            LOGGER.info("Payment {} already credited; ignoring duplicate verify", payment.getRazorpayOrderId());
            return;
        }

        boolean valid = razorpayService.verifySignature(
                request.getRazorpayOrderId(), request.getRazorpayPaymentId(), request.getRazorpaySignature());
        if (!valid) {
            payment.setStatus(PaymentEntity.Status.FAILED);
            payment.setUpdatedAt(Instant.now());
            paymentRepository.save(payment);
            throw new PaymentException("Payment signature verification failed");
        }

        payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
        payment.setStatus(PaymentEntity.Status.PAID);
        payment.setUpdatedAt(Instant.now());
        paymentRepository.save(payment);

        // Drive the existing top-up flow using the server-stored amount (never the client's).
        InternalTopupRequest topup = new InternalTopupRequest(
                userId, payment.getAmount(), payment.getRazorpayPaymentId(), "Wallet top-up via Razorpay");
        transactionInternalClient.topup(topup);

        payment.setStatus(PaymentEntity.Status.CREDITED);
        payment.setUpdatedAt(Instant.now());
        paymentRepository.save(payment);

        LOGGER.info("Payment {} verified and top-up triggered for userId={} amount={}",
                payment.getRazorpayOrderId(), userId, payment.getAmount());
    }
}
