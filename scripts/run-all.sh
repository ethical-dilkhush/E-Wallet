#!/usr/bin/env bash
# Convenience script to start all Sterling E-Wallet microservices in the background.
# Prerequisites: Maven (mvn), JDK 17+, RabbitMQ running on localhost:5672
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

start_service eureka-server
sleep 15
start_service api-gateway
start_service auth-service
start_service user-service
start_service wallet-service
start_service transaction-service

echo "[run-all] All services launched. Tail logs in ./logs/"
echo "[run-all] Eureka:        http://localhost:8761"
echo "[run-all] API Gateway:   http://localhost:8080"
echo "[run-all] Auth Service:  http://localhost:8081"
echo "[run-all] User Service:  http://localhost:8082/swagger-ui.html"
echo "[run-all] Wallet Service:http://localhost:8083/swagger-ui.html"
echo "[run-all] Txn Service:   http://localhost:8084/swagger-ui.html"
