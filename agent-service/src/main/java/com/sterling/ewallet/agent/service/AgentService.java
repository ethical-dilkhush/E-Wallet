package com.sterling.ewallet.agent.service;

import com.sterling.ewallet.agent.client.TransactionClient;
import com.sterling.ewallet.agent.client.UserClient;
import com.sterling.ewallet.agent.client.WalletClient;
import com.sterling.ewallet.agent.dto.ChatMessage;
import com.sterling.ewallet.agent.dto.TransactionView;
import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.common.dto.UserDto;
import com.sterling.ewallet.common.dto.WalletDto;
import feign.FeignException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Orchestrates a Sterling Agent chat turn: fetch the caller's authoritative wallet
 * and transaction data, build a restricted system prompt, and ask the model.
 */
@Service
public class AgentService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AgentService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_INSTANT;
    private static final int MAX_TRANSACTIONS = 50;

    private final UserClient userClient;
    private final WalletClient walletClient;
    private final TransactionClient transactionClient;
    private final OpenAiService openAiService;

    public AgentService(UserClient userClient,
                        WalletClient walletClient,
                        TransactionClient transactionClient,
                        OpenAiService openAiService) {
        this.userClient = userClient;
        this.walletClient = walletClient;
        this.transactionClient = transactionClient;
        this.openAiService = openAiService;
    }

    public String reply(String userId, List<ChatMessage> conversation) {
        UserDto userProfile = fetchUserProfile(userId);
        WalletDto wallet = fetchWallet(userId);
        List<TransactionView> transactions = fetchTransactions(userId);
        Map<String, String> userNames = resolveCounterpartyNames(userId, transactions);
        String systemPrompt = buildSystemPrompt(userId, userProfile, wallet, transactions, userNames);
        return openAiService.chat(systemPrompt, conversation);
    }

    private UserDto fetchUserProfile(String userId) {
        try {
            ApiResponse<UserDto> res = userClient.me(userId);
            return res != null && res.isSuccess() ? res.getData() : null;
        } catch (FeignException ex) {
            LOGGER.warn("Could not load user profile for {}: {}", userId, ex.getMessage());
            return null;
        }
    }

    private WalletDto fetchWallet(String userId) {
        try {
            ApiResponse<WalletDto> res = walletClient.myWallet(userId);
            return res != null && res.isSuccess() ? res.getData() : null;
        } catch (FeignException ex) {
            LOGGER.warn("Could not load wallet for {}: {}", userId, ex.getMessage());
            return null;
        }
    }

    private List<TransactionView> fetchTransactions(String userId) {
        try {
            ApiResponse<List<TransactionView>> res = transactionClient.myTransactions(userId);
            return res != null && res.isSuccess() && res.getData() != null
                    ? res.getData() : Collections.emptyList();
        } catch (FeignException ex) {
            LOGGER.warn("Could not load transactions for {}: {}", userId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private Map<String, String> resolveCounterpartyNames(String userId, List<TransactionView> transactions) {
        Set<String> ids = new LinkedHashSet<>();
        for (TransactionView t : transactions) {
            if (t.getFromUserId() != null && !t.getFromUserId().equals(userId)) {
                ids.add(t.getFromUserId());
            }
            if (t.getToUserId() != null && !t.getToUserId().equals(userId)) {
                ids.add(t.getToUserId());
            }
        }
        Map<String, String> map = new HashMap<>();
        for (String id : ids) {
            try {
                ApiResponse<UserDto> res = userClient.getById(id, userId);
                if (res != null && res.isSuccess() && res.getData() != null) {
                    UserDto u = res.getData();
                    String display = u.getFullName() != null && !u.getFullName().isBlank()
                            ? u.getFullName() + " (@" + u.getUsername() + ")"
                            : "@" + u.getUsername();
                    map.put(id, display);
                }
            } catch (FeignException ex) {
                LOGGER.debug("Could not resolve user {}: {}", id, ex.getMessage());
            }
        }
        return map;
    }

    private String buildSystemPrompt(String userId, UserDto userProfile, WalletDto wallet, List<TransactionView> transactions, Map<String, String> userNames) {
        String currency = wallet != null && wallet.getCurrency() != null ? wallet.getCurrency() : "INR";
        String balance = wallet != null && wallet.getBalance() != null
                ? wallet.getBalance().toPlainString() : "unknown";

        StringBuilder sb = new StringBuilder();
        sb.append("You are \"Sterling Agent\", a personal wallet assistant inside the Sterling E-Wallet app. ")
                .append("You are speaking with the wallet owner (their user id is ").append(userId).append("). ")
                .append("Be concise, friendly, and accurate. Use the wallet's currency (").append(currency)
                .append(") when discussing money, and format amounts clearly.\n\n");

        sb.append("USER PROFILE:\n");
        if (userProfile != null) {
            sb.append("- Username: ").append(nullToDash(userProfile.getUsername())).append("\n");
            sb.append("- Full Name: ").append(nullToDash(userProfile.getFullName())).append("\n");
            sb.append("- Email: ").append(nullToDash(userProfile.getEmail())).append("\n");
            sb.append("- Phone: ").append(nullToDash(userProfile.getPhone())).append("\n");
            sb.append("- Account Active: ").append(userProfile.isActive() ? "Yes" : "No").append("\n");
        } else {
            sb.append("- (profile data unavailable)\n");
        }
        sb.append("\n");

        sb.append("SCOPE RULES:\n")
                .append("- Answer questions about THIS user's account and wallet: profile info (username, name, ")
                .append("email, phone), balance, transactions, spending, transfers, top-ups, merchant payments, ")
                .append("history, totals, and money trends/analysis derived from the data below.\n")
                .append("- You CAN and SHOULD give personalised financial advice, tips, and insights based on the ")
                .append("user's actual wallet data — for example: spending patterns, saving suggestions, warnings ")
                .append("about low balance, frequent spending categories, budgeting tips derived from their ")
                .append("transaction history, and general money management advice relevant to their situation.\n")
                .append("- If asked something completely unrelated to finance or their wallet (coding, news, ")
                .append("entertainment, etc.), politely decline in one sentence and steer them back.\n")
                .append("- Never invent transactions or numbers. If the data does not contain the answer, say so.\n")
                .append("- Budgets are not tracked in this app yet, so if asked about budgets, say budgeting isn't ")
                .append("available yet and offer spending analysis from their transactions instead.\n\n");

        sb.append("CURRENT WALLET:\n")
                .append("- Balance: ").append(balance).append(" ").append(currency).append("\n\n");

        if (!userNames.isEmpty()) {
            sb.append("KNOWN USERS (counterparties in this user's transactions):\n");
            for (Map.Entry<String, String> entry : userNames.entrySet()) {
                sb.append("- ").append(entry.getKey()).append(" = ").append(entry.getValue()).append("\n");
            }
            sb.append("When referring to transactions, use the person's name/username instead of their raw user ID.\n\n");
        }

        sb.append("RECENT TRANSACTIONS (most recent first; amounts in ").append(currency).append("):\n");
        if (transactions.isEmpty()) {
            sb.append("- (no transactions yet)\n");
        } else {
            int count = 0;
            for (TransactionView t : transactions) {
                if (count++ >= MAX_TRANSACTIONS) {
                    break;
                }
                sb.append("- ").append(describeTransaction(userId, t, userNames)).append("\n");
            }
        }
        return sb.toString();
    }

    private String describeTransaction(String userId, TransactionView t, Map<String, String> userNames) {
        String type = t.getType() == null ? "TXN" : t.getType();
        String status = t.getStatus() == null ? "" : t.getStatus();
        String amount = t.getAmount() == null ? "?" : t.getAmount().toPlainString();
        String date = t.getCreatedAt() == null ? "" : DATE_FMT.format(t.getCreatedAt());

        String direction;
        if ("TOPUP".equalsIgnoreCase(type)) {
            direction = "credit (+" + amount + ")";
        } else if (Objects.equals(userId, t.getFromUserId())) {
            String to = "MERCHANT_PAYMENT".equalsIgnoreCase(type)
                    ? "merchant " + nullToDash(t.getMerchantId())
                    : resolveUserLabel(t.getToUserId(), userNames);
            direction = "debit (-" + amount + ") to " + to;
        } else if (Objects.equals(userId, t.getToUserId())) {
            direction = "credit (+" + amount + ") from " + resolveUserLabel(t.getFromUserId(), userNames);
        } else {
            direction = amount;
        }

        StringBuilder line = new StringBuilder();
        line.append(date).append(" | ").append(type).append(" | ").append(direction).append(" | ").append(status);
        if (t.getReason() != null && !t.getReason().isBlank()) {
            line.append(" | note: ").append(t.getReason());
        }
        line.append(" | ref ").append(nullToDash(t.getReference()));
        return line.toString();
    }

    private String resolveUserLabel(String id, Map<String, String> userNames) {
        if (id == null || id.isBlank()) return "-";
        String name = userNames.get(id);
        return name != null ? name : id;
    }

    private String nullToDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
