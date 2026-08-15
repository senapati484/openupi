#!/bin/bash
set -euo pipefail

# ============================================================================
# OpenUPI VPS Installer
# Installs Docker, Docker Compose, clones repo, configures .env, and starts
# the gateway with production hardening.
# ============================================================================

REPO_URL="https://github.com/senapati484/openupi.git"
INSTALL_DIR="/opt/open-upi"
ENV_FILE="$INSTALL_DIR/.env"

# ── Detect OS ─────────────────────────────────────────────────────────────────
if [[ -f /etc/debian_version ]]; then
  PKG_MGR="apt"
elif [[ -f /etc/redhat-release ]]; then
  PKG_MGR="yum"
else
  echo "❌ Unsupported OS. Install manually on Debian/Ubuntu or RHEL/CentOS."
  exit 1
fi

echo ""
echo "🚀 OpenUPI Installer — Self-Hosted UPI Payment Gateway"
echo "═══════════════════════════════════════════════════════"

# ── Install Docker ────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "[1/5] Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "[1/5] Docker already installed ✓"
fi

# ── Install Docker Compose V2 ─────────────────────────────────────────────────
if ! docker compose version &>/dev/null; then
  echo "[2/5] Installing Docker Compose V2..."
  apt-get install -y docker-compose-plugin 2>/dev/null || yum install -y docker-compose-plugin 2>/dev/null
else
  echo "[2/5] Docker Compose V2 already installed ✓"
fi

# ── Clone Repository ──────────────────────────────────────────────────────────
echo "[3/5] Cloning OpenUPI to $INSTALL_DIR..."
if [[ -d "$INSTALL_DIR" ]]; then
  echo "  Directory exists — pulling latest..."
  git -C "$INSTALL_DIR" pull
else
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

# ── Configure Environment ─────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[4/5] Generating .env from template..."
  cp "$INSTALL_DIR/.env.example" "$ENV_FILE"

  DEVICE_SECRET=$(openssl rand -hex 32)
  MERCHANT_API_KEY=$(openssl rand -hex 16)

  sed -i "s|DEVICE_SHARED_SECRET=.*|DEVICE_SHARED_SECRET=$DEVICE_SECRET|" "$ENV_FILE"
  sed -i "s|MERCHANT_API_KEY=.*|MERCHANT_API_KEY=sk_live_$MERCHANT_API_KEY|" "$ENV_FILE"

  echo ""
  echo "  ┌────────────────────────────────────────────────────────────┐"
  echo "  │  ⚠️  SAVE THESE SECRETS — they won't be shown again!        │"
  echo "  │                                                            │"
  echo "  │  DEVICE_SHARED_SECRET = $DEVICE_SECRET  │"
  echo "  │  MERCHANT_API_KEY     = sk_live_$MERCHANT_API_KEY          │"
  echo "  └────────────────────────────────────────────────────────────┘"
  echo ""
  echo "  ➡️  Edit $ENV_FILE to set MERCHANT_VPA and MERCHANT_NAME."
  read -p "  Press Enter after you've updated .env to continue..." _
else
  echo "[4/5] .env already exists — skipping key generation ✓"
fi

# ── Start Services ────────────────────────────────────────────────────────────
echo "[5/5] Starting OpenUPI gateway with Docker Compose..."
cd "$INSTALL_DIR/docker"
docker compose up -d --build

echo ""
echo "✅ OpenUPI is running!"
echo "   API:     http://$(hostname -I | awk '{print $1}'):4000"
echo "   Health:  curl http://localhost:4000/health"
echo ""
