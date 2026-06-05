package com.sterling.ewallet.common.id;

import com.github.f4b6a3.ulid.UlidCreator;

/**
 * Central factory for prefixed ULID identifiers used across the platform.
 *
 * <p>A ULID renders as a 26-character Crockford base32 string, so a 4-character
 * prefix (e.g. "USR-") yields a 30-character identifier that fits VARCHAR(30).
 */
public final class Ids {

    public static final String USER_PREFIX = "USR-";
    public static final String WALLET_PREFIX = "WLT-";

    private Ids() {
    }

    public static String userId() {
        return USER_PREFIX + UlidCreator.getUlid();
    }

    public static String walletId() {
        return WALLET_PREFIX + UlidCreator.getUlid();
    }
}
