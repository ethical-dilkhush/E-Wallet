# #!/usr/bin/env bash
# # Convenience script to start all Sterling E-Wallet microservices in the background.
# # Prerequisites: Maven (mvn), JDK 17+, RabbitMQ running on localhost:5672
# # Each service writes logs into ./logs/<service>.log
# # Use scripts/stop-all.sh to terminate them.

# set -euo pipefail
# ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# cd "$ROOT_DIR"

# mkdir -p logs

# start_service() {
#   local module=$1
#   echo "[run-all] Starting $module ..."
#   nohup mvn -pl "$module" spring-boot:run \
#     > "logs/${module}.log" 2>&1 &
#   echo $! > "logs/${module}.pid"
# }

# start_service eureka-server
# sleep 15
# start_service api-gateway
# start_service auth-service
# start_service user-service
# start_service wallet-service
# start_service transaction-service

# echo "[run-all] All services launched. Tail logs in ./logs/"
# echo "[run-all] Eureka:        http://localhost:8761"
# echo "[run-all] API Gateway:   http://localhost:8080"
# echo "[run-all] Auth Service:  http://localhost:18081"
# echo "[run-all] User Service:  http://localhost:8082/swagger-ui.html"
# echo "[run-all] Wallet Service:http://localhost:8083/swagger-ui.html"
# echo "[run-all] Txn Service:   http://localhost:8084/swagger-ui.html"



#!/usr/bin/env bash
# Convenience script to start all Sterling E-Wallet microservices in the background.
# Prerequisites: Maven (mvn), JDK 17+, RabbitMQ running on localhost:5672, Node.js/npm
# Each service writes logs into ./logs/<service>.log
# Use scripts/stop-all.sh to terminate them.

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

mkdir -p logs

start_service() {
  local module=$1
  echo "[run-all] Starting $module ..."
  nohup mvn -pl "$module" spring-boot:run \
    > "logs/${module}.log" 2>&1 &
  echo $! > "logs/${module}.pid"
}

# 1. Service Registry first
start_service eureka-server
sleep 15

# 2. API Gateway
start_service api-gateway

# 3. Core Spring Boot Services
start_service auth-service
start_service user-service
start_service wallet-service
start_service transaction-service
start_service payment-service
start_service notification-service
start_service agent-service

# 4. Build Chrome Extension (one-time build, no server needed)
echo "[run-all] Building ewallet-extension ..."
cd "$ROOT_DIR/ewallet-extension"
npm install > "$ROOT_DIR/logs/ewallet-extension.log" 2>&1
npm run build >> "$ROOT_DIR/logs/ewallet-extension.log" 2>&1
echo "[run-all] ewallet-extension build done! Load dist/ folder in Chrome."
cd "$ROOT_DIR"

# 5. Start UI (Vite dev server)
echo "[run-all] Starting ewallet-ui ..."
cd "$ROOT_DIR/ewallet-ui"
npm install > "$ROOT_DIR/logs/ewallet-ui.log" 2>&1
nohup npm run dev >> "$ROOT_DIR/logs/ewallet-ui.log" 2>&1 &
echo $! > "$ROOT_DIR/logs/ewallet-ui.pid"
cd "$ROOT_DIR"

echo ""
echo "[run-all] All services launched. Tail logs in ./logs/"
echo "=================================================="
echo "[run-all] Eureka:               http://localhost:8761"
echo "[run-all] API Gateway:          http://localhost:8080"
echo "[run-all] Auth Service:         http://localhost:18081"
echo "[run-all] User Service:         http://localhost:8082/swagger-ui.html"
echo "[run-all] Wallet Service:       http://localhost:8083/swagger-ui.html"
echo "[run-all] Txn Service:          http://localhost:8084/swagger-ui.html"
echo "[run-all] Payment Service:      http://localhost:8085/swagger-ui.html"
echo "[run-all] Notification Service: http://localhost:8086/swagger-ui.html"
echo "[run-all] Agent Service:        http://localhost:8087/swagger-ui.html"
echo "[run-all] UI:                   http://localhost:3000"
echo "[run-all] Extension:            Load ewallet-extension/dist/ in Chrome -> chrome://extensions"
echo "=================================================="