#!/usr/bin/env bash
set -euo pipefail

TOKEN=""
API_URL=""
INSTALL_ROOT="${INSTALL_ROOT:-/opt/pharma-connector-agent}"
CONFIG_DIR="${CONFIG_DIR:-/etc/pharma-connector-agent}"
LOG_DIR="${LOG_DIR:-/var/log/pharma-connector-agent}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --token)
      TOKEN="${2:-}"
      shift 2
      ;;
    --api-url)
      API_URL="${2:-}"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [[ -z "$TOKEN" ]]; then
  echo "Uso: curl -fsSL ... | sudo bash -s -- --token SEU_TOKEN [--api-url https://api...]" >&2
  exit 1
fi

mkdir -p "$INSTALL_ROOT" "$CONFIG_DIR" "$LOG_DIR"

if [[ ! -f "$INSTALL_ROOT/dist/index.js" ]]; then
  echo "Copie o pacote do agente (dist + node_modules ou bundle) para $INSTALL_ROOT antes deste script." >&2
  exit 1
fi

CFG="$CONFIG_DIR/config.json"
if [[ -n "$API_URL" ]]; then
  node -e '
    const fs = require("fs");
    const path = process.argv[1];
    const token = process.argv[2];
    const apiUrl = process.argv[3];
    const prev = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : {};
    const next = { ...prev, apiUrl, token, syncIntervalSeconds: prev.syncIntervalSeconds || 15, logLevel: prev.logLevel || "info" };
    fs.writeFileSync(path, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
  ' "$CFG" "$TOKEN" "$API_URL"
else
  echo "--api-url e obrigatorio para instalar o agente em modo servico." >&2
  exit 1
fi

chmod 600 "$CFG" 2>/dev/null || true

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install -m 644 "$SCRIPT_DIR/pharma-connector-agent.service" /etc/systemd/system/pharma-connector-agent.service
systemctl daemon-reload
systemctl enable pharma-connector-agent.service
systemctl restart pharma-connector-agent.service
