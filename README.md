# Sterling Corporation E-Wallet — Microservices Platform

A modernised, microservices-based reimplementation of Sterling's E-Wallet platform.
The legacy monolith — where user management, transactions and balance management
were tightly coupled — is decomposed into independent services that scale, deploy,
and fail independently, and communicate primarily through asynchronous events.

---

## 1. Architecture Overview

```
                            ┌──────────────────┐
                            │  Eureka Server   │  :8761
                            └─────────┬────────┘
                  Service registry / discovery (all services register here)
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌────────────────┐         ┌────────────────┐           ┌──────────────────┐
│  API Gateway   │ :8080   │ Auth Service   │ :8081     │  User Service    │ :8082
│ Spring Cloud   │ ──────► │ JWT issuer     │ ────────► │ Registration,    │
│  Gateway       │   JWT   │ /api/auth/*    │  Feign    │ credentials,     │
│                │         │                │           │ profile          │
└────────┬───────┘         └────────────────┘           └─────────┬────────┘
         │                                                        │
         │                                              UserRegistered event
         │                                                        │
         │   ┌──────────────────────────────────────────────────┐ ▼
         │   │                                                  ┌──────────────────┐
         │   │                                                  │  RabbitMQ        │
         │   │                                                  │ ewallet.exchange │
         │   │                                                  └─────────┬────────┘
         ▼   ▼                                                            │
┌────────────────────┐   TransactionInitiated event           ┌───────────▼───────┐
│ Transaction Service│ ────────────────────────────────────► │   Wallet Service  │ :8083
│ :8084              │ ◄──── WalletOperationResult event ─── │ Balance, ledger,  │
│ /api/transactions  │                                       │ auto-provisioning │
│ Persists state in  │                                       │  on user create   │
│ H2 (txn history)   │                                       └───────────────────┘
└────────────────────┘
```

### Services

| Service             | Port | Responsibility                                                                 |
| ------------------- | ---- | ------------------------------------------------------------------------------ |
| `eureka-server`     | 8761 | Service discovery (Spring Cloud Netflix Eureka)                                |
| `api-gateway`       | 8080 | Single entry point, JWT validation, routing                                    |
| `auth-service`      | 8081 | Login, refresh, JWT issuance & validation (calls user-service via Feign)       |
| `user-service`      | 8082 | User registration, profile, credential verification; emits `UserRegistered`    |
| `wallet-service`    | 8083 | Wallet balance, credit/debit, ledger; consumes user & transaction events       |
| `transaction-service`| 8084| Initiates transfers / merchant payments / top-ups; consumes wallet results     |
| `common-lib`        | —    | Shared DTOs, events, RabbitMQ topic constants                                  |

### Event Topology (RabbitMQ topic exchange `ewallet.exchange`)

| Routing key               | Producer            | Consumer            | Purpose                                |
| ------------------------- | ------------------- | ------------------- | -------------------------------------- |
| `user.registered`         | user-service        | wallet-service      | Auto-provision wallet on user creation |
| `transaction.initiated`   | transaction-service | wallet-service      | Ask wallet to debit/credit             |
| `wallet.result`           | wallet-service      | transaction-service | Report success/failure of operation    |
| `transaction.completed`   | transaction-service | (downstream/reporting consumers, future) | Final transaction state |

This is a **saga-style choreography**: when a transfer is requested, the
transaction-service persists a `PENDING` row and publishes an event. The
wallet-service performs the actual debit/credit inside a single DB transaction
(with pessimistic locking, see `WalletRepository.findByUserIdForUpdate`), and
emits a result event. The transaction-service then marks the transaction
`COMPLETED` or `FAILED`.

---

## 2. Technology Stack

- **Java 17** + **Spring Boot 3.2.5**
- **Spring Cloud 2023.0.1** (Gateway, Netflix Eureka, OpenFeign)
- **Spring Security** + **JJWT 0.12.5** (JWT-based auth, OAuth2-style flow)
- **Spring Data JPA** + **H2** (file-based, per-service database)
- **Spring AMQP / RabbitMQ** for async event-driven communication
- **Spring Boot Actuator** for health, metrics, info endpoints
- **springdoc-openapi** (Swagger UI) on each REST service
- **JUnit 5** + **Mockito** + **AssertJ** for unit tests

---

## 3. Prerequisites

| Requirement    | Install Command            | Verify Command     |
| -------------- | -------------------------- | ------------------ |
| **JDK 17+**    | (already installed)        | `java -version`    |
| **Maven**      | `brew install maven`       | `mvn -v`           |
| **RabbitMQ**   | `brew install rabbitmq`    | `rabbitmqctl status` |
| **Node.js**    | (already installed)        | `node -v`          |

---

## 4. Start RabbitMQ

```bash
brew services start rabbitmq
# Management UI: http://localhost:15672  (guest / guest)
```

RabbitMQ listens on `localhost:5672` by default. You can override the
connection details with environment variables: `RABBITMQ_HOST`,
`RABBITMQ_PORT`, `RABBITMQ_USER`, `RABBITMQ_PASS`.

---

## 5. Build Everything

```bash
mvn clean install -DskipTests       # build all modules
mvn test                             # run all unit tests
```

---

## 6. Run the Services

Open **six terminals** (or use `scripts/run-all.sh`).
**Order matters**: start Eureka first, then any service.

```bash
# Terminal 1
mvn -pl eureka-server spring-boot:run

# Terminal 2 (wait ~15s for Eureka to be ready)
mvn -pl api-gateway spring-boot:run

# Terminal 3
mvn -pl auth-service spring-boot:run

# Terminal 4
mvn -pl user-service spring-boot:run

# Terminal 5
mvn -pl wallet-service spring-boot:run

# Terminal 6
mvn -pl transaction-service spring-boot:run
```

Or, all-in-one (background, with logs under `./logs/`):

```bash
./scripts/run-all.sh        # start everything
./scripts/stop-all.sh       # graceful shutdown
```

### Useful URLs

| URL                                       | What                              |
| ----------------------------------------- | --------------------------------- |
| http://localhost:8761                     | Eureka dashboard                  |
| http://localhost:15672                    | RabbitMQ management (guest/guest) |
| http://localhost:8082/swagger-ui.html     | User Service API docs             |
| http://localhost:8083/swagger-ui.html     | Wallet Service API docs           |
| http://localhost:8084/swagger-ui.html     | Transaction Service API docs      |
| http://localhost:8082/h2-console          | H2 console (jdbc:h2:file:./data/userdb)   |
| http://localhost:8083/h2-console          | H2 console (jdbc:h2:file:./data/walletdb) |
| http://localhost:8084/h2-console          | H2 console (jdbc:h2:file:./data/txndb)    |
| http://localhost:<port>/actuator/health   | Health check on any service       |

---

## 7. End-to-End API Walkthrough

All public traffic flows through the gateway at **http://localhost:8080**.

### 7.1 Register a User (public)

```bash
curl -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email":    "alice@sterling.io",
    "password": "Secret123!",
    "fullName": "Alice Walker",
    "phone":    "+1 555 0100"
  }'
```

→ user persisted in `user-service`, `UserRegistered` event published to
RabbitMQ, `wallet-service` consumes it and auto-creates a zero-balance wallet.

### 7.2 Login & Obtain JWT (public)

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"Secret123!"}'
```

Response:

```json
{
  "success": true,
  "data": {
    "accessToken":  "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "tokenType":    "Bearer",
    "expiresIn":    3600,
    "userId":       1,
    "username":     "alice"
  }
}
```

Save the access token:

```bash
export TOKEN=eyJhbGciOi...
```

### 7.3 View Your Wallet (authenticated)

```bash
curl http://localhost:8080/api/wallets/me \
  -H "Authorization: Bearer $TOKEN"
```

### 7.4 Top up the Wallet

```bash
curl -X POST http://localhost:8080/api/transactions/topup \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000.00, "paymentGatewayReference": "PG-DEMO-001", "reason":"Initial top-up"}'
```

Returns `202 Accepted` with a `PENDING` transaction. After RabbitMQ round-trip,
`GET /api/transactions/{reference}` will show it as `COMPLETED` and the wallet
balance will have increased by 1000.

### 7.5 Transfer to Another User

Register a second user (`bob`) the same way, then:

```bash
curl -X POST http://localhost:8080/api/transactions/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toUserId": 2, "amount": 250.00, "reason": "Lunch"}'
```

### 7.6 Pay a Merchant

```bash
curl -X POST http://localhost:8080/api/transactions/merchant-payment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"merchantId": "MERCHANT-STERLING-CAFE", "amount": 75.50, "reason":"Coffee"}'
```

### 7.7 View Transaction History

```bash
curl http://localhost:8080/api/transactions/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 8. Security Model

- `auth-service` issues HS256 JWTs containing `sub` (username), `userId`,
  `roles`, `iat`, `exp`, and `type` (`access` or `refresh`).
- The **API Gateway** intercepts every request to `/api/users/**`,
  `/api/wallets/**`, `/api/transactions/**` (except public ones), validates the
  JWT with the same shared secret, and forwards user context to downstream
  services via the headers `X-User-Id`, `X-Username`, and `X-User-Roles`.
- Downstream services therefore never re-validate the token themselves —
  they trust the gateway. Direct service ports should be firewalled in
  production (only the gateway should be public).
- Passwords are hashed with **BCrypt** (Spring Security default strength).
- The shared secret can be overridden via the `EWALLET_JWT_SECRET` env var.
  The default in `application.yml` is **for development only**.

### OAuth2 Note

This implementation uses an in-house JWT bearer token model
(resource-owner-password flow equivalent), but it is structured so the
`auth-service` can be replaced with a full OAuth2 Authorization Server
(e.g. Spring Authorization Server or Keycloak) without any other service
changing — they only validate the JWT signature.

---

## 9. Observability

Every service exposes Spring Boot Actuator endpoints:

- `GET /actuator/health` — liveness, including RabbitMQ + DB checks
- `GET /actuator/info`
- `GET /actuator/metrics` and `/actuator/metrics/{metric}`
- Eureka dashboard at `:8761` shows all instances

---

## 10. Testing

```bash
mvn test
```

The repository ships with focused JUnit 5 + Mockito tests for the most
critical service classes:

- `user-service` → `UserServiceTest` (registration, credential verification)
- `wallet-service` → `WalletServiceTest` (credit, debit, insufficient balance, idempotent create)
- `transaction-service` → `TransactionServiceTest` (transfer validation, completion, same-account guard)

---

## 11. Project Layout

```
E-Wallet/
├── pom.xml                     # Parent POM
├── scripts/                    # run-all / stop-all helpers
├── common-lib/                 # Shared DTOs & event types
├── eureka-server/              # Service discovery
├── api-gateway/                # Spring Cloud Gateway + JWT filter
├── auth-service/               # JWT issuance / validation
├── user-service/               # Users (H2 file-based)
├── wallet-service/             # Wallets + ledger (H2 file-based)
├── transaction-service/        # Transactions (H2 file-based)
└── ewallet-ui/                 # React frontend
```

---

## 12. Why This Architecture Solves the Original Problems

| Legacy pain point                                 | How this design addresses it                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Tightly coupled user / txn / wallet logic         | Three independently deployable services with their own DB schemas                              |
| Scalability bottlenecks                           | Each service scales horizontally behind the gateway; Eureka load-balances Feign calls          |
| Deployment bottlenecks                            | Independent versioning and rollouts per service                                                |
| One failure brings everything down                | Async RabbitMQ messaging + isolated DBs + Feign timeouts isolate faults                        |
| Slow API responses under load                     | The HTTP request returns `202 ACCEPTED` immediately; heavy work happens asynchronously         |
| Hard to integrate third-party payment gateways    | Add a new producer/consumer on the exchange, or a new microservice — no change to existing code |
| No visibility into running components             | Eureka dashboard + Actuator + Swagger UI per service                                           |

---

## 13. Extending the System

- **Real payment gateway integration**: add a `payment-gateway-service` that
  consumes `transaction.initiated` events with `type=TOPUP` and confirms via a
  new `topup.confirmed` event. Wallet-service then credits only on confirmation.
- **Notifications**: subscribe a `notification-service` to
  `transaction.completed` and send email/SMS via RabbitMQ fan-out.
- **Replace H2 with PostgreSQL/MySQL**: only the `spring.datasource.*` and
  `spring.jpa.database-platform` properties change.
- **Replace JWT with full OAuth2**: swap `auth-service` for Keycloak or
  Spring Authorization Server; the gateway filter already validates standard
  HS256 JWTs and can be retargeted to RS256.

---

## 14. License

Internal Sterling Corporation project — not for redistribution.
