package com.sterling.ewallet.common.messaging;

public final class RabbitTopics {

    private RabbitTopics() {
    }

    public static final String EWALLET_EXCHANGE = "ewallet.exchange";

    public static final String USER_REGISTERED_QUEUE = "ewallet.user.registered.q";
    public static final String USER_REGISTERED_ROUTING_KEY = "user.registered";

    public static final String TRANSACTION_INITIATED_QUEUE = "ewallet.transaction.initiated.q";
    public static final String TRANSACTION_INITIATED_ROUTING_KEY = "transaction.initiated";

    public static final String TRANSACTION_COMPLETED_QUEUE = "ewallet.transaction.completed.q";
    public static final String TRANSACTION_COMPLETED_ROUTING_KEY = "transaction.completed";

    public static final String WALLET_RESULT_QUEUE = "ewallet.wallet.result.q";
    public static final String WALLET_RESULT_ROUTING_KEY = "wallet.result";

    public static final String PASSWORD_RESET_QUEUE = "ewallet.password.reset.q";
    public static final String PASSWORD_RESET_ROUTING_KEY = "password.reset.requested";
}
