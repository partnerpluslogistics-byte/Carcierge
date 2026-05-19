#!/usr/bin/env bash
# ============================================================
# Carcierge Load Test Runner
# ============================================================
# Usage:
#   ./run_tests.sh [--users N] [--spawn-rate N] [--run-time T]
#                  [--host URL] [--headless] [--ui]
#
# Defaults:
#   --users      1000
#   --spawn-rate 10        (users added per second)
#   --run-time   15m
#   --host       http://localhost:8000
#   --headless   (pass --ui to open the web UI instead)
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")/backend"
REPORT_DIR="$SCRIPT_DIR/reports"

# ── Defaults ──────────────────────────────────────────────────────────────────
USERS=1000
SPAWN_RATE=10
RUN_TIME="15m"
HOST="http://localhost:8000"
MODE="headless"       # headless | ui

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --users)        USERS="$2";       shift 2 ;;
    --spawn-rate)   SPAWN_RATE="$2";  shift 2 ;;
    --run-time)     RUN_TIME="$2";    shift 2 ;;
    --host)         HOST="$2";        shift 2 ;;
    --headless)     MODE="headless";  shift   ;;
    --ui)           MODE="ui";        shift   ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Install dependencies ──────────────────────────────────────────────────────
echo "==> Installing load-test dependencies..."
pip install -q -r "$SCRIPT_DIR/requirements.txt"

# ── Start backend if not already running ──────────────────────────────────────
BACKEND_PID=""
_cleanup() {
  if [[ -n "$BACKEND_PID" ]]; then
    echo "==> Stopping backend (PID $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap _cleanup EXIT

if ! curl -sf "$HOST/api/health" > /dev/null 2>&1; then
  echo "==> Backend not running at $HOST – starting it now..."
  cd "$BACKEND_DIR"
  pip install -q -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 &
  BACKEND_PID=$!

  echo -n "==> Waiting for backend to become healthy"
  for i in $(seq 1 30); do
    if curl -sf "$HOST/api/health" > /dev/null 2>&1; then
      echo " ready."
      break
    fi
    echo -n "."
    sleep 2
    if [[ $i -eq 30 ]]; then
      echo ""
      echo "ERROR: backend did not start within 60 s"
      exit 1
    fi
  done
else
  echo "==> Backend already running at $HOST"
fi

# ── Create report directory ───────────────────────────────────────────────────
mkdir -p "$REPORT_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
HTML_REPORT="$REPORT_DIR/report_${TIMESTAMP}.html"
CSV_PREFIX="$REPORT_DIR/results_${TIMESTAMP}"

# ── Run Locust ────────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR"

if [[ "$MODE" == "headless" ]]; then
  echo ""
  echo "============================================================"
  echo "  Carcierge Load Test"
  echo "  Users      : $USERS"
  echo "  Spawn rate : $SPAWN_RATE users/s"
  echo "  Run time   : $RUN_TIME"
  echo "  Target     : $HOST"
  echo "  Report     : $HTML_REPORT"
  echo "============================================================"
  echo ""

  locust \
    -f "$SCRIPT_DIR/locustfile.py" \
    --host="$HOST" \
    --users="$USERS" \
    --spawn-rate="$SPAWN_RATE" \
    --headless \
    --run-time="$RUN_TIME" \
    --html="$HTML_REPORT" \
    --csv="$CSV_PREFIX" \
    --exit-code-on-error 1

  echo ""
  echo "==> Test complete. Reports saved:"
  echo "    HTML  : $HTML_REPORT"
  echo "    CSV   : ${CSV_PREFIX}_stats.csv"
  echo "          : ${CSV_PREFIX}_failures.csv"
  echo "          : ${CSV_PREFIX}_history.csv"

else
  echo ""
  echo "==> Starting Locust web UI at http://localhost:8089"
  echo "    Configure users=$USERS, spawn-rate=$SPAWN_RATE in the UI."
  echo ""
  locust \
    -f "$SCRIPT_DIR/locustfile.py" \
    --host="$HOST"
fi
