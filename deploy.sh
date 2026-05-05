#!/usr/bin/env bash
# Deploy 4gk.pl: push current branch to GitHub, then SSH to the server,
# pull, rebuild and restart the app container.
#
# Usage:
#   ./deploy.sh
#
# SSH: by default uses your normal OpenSSH setup (~/.ssh/config and ssh-agent).
# To force a specific private key:
#   DEPLOY_SSH_KEY=/path/to/key ./deploy.sh
#   DEPLOY_SSH_KEY=.ssh_4gk ./deploy.sh
#
# Do not commit private keys; prefer agent or SSH config HostMatch for 4gk.pl.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

HOST="root@4gk.pl"
REMOTE_DIR="/opt/4gk"

SSH_ARGS=(
  -o StrictHostKeyChecking=no
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=4
  -o ConnectTimeout=10
)

if [ -n "${DEPLOY_SSH_KEY:-}" ]; then
  if [ ! -f "${DEPLOY_SSH_KEY}" ]; then
    echo "ERROR: DEPLOY_SSH_KEY is set but file not found: ${DEPLOY_SSH_KEY}" >&2
    exit 1
  fi
  chmod 600 "${DEPLOY_SSH_KEY}"
  SSH_ARGS+=(-i "${DEPLOY_SSH_KEY}")
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "==> Pushing $BRANCH to origin"
git push origin "$BRANCH"

echo "==> Deploying on $HOST"
ssh "${SSH_ARGS[@]}" "$HOST" \
  "cd $REMOTE_DIR && git pull --ff-only && docker compose build app && docker compose up -d app && sleep 3 && docker compose ps app"

echo "==> Done. https://4gk.pl/"
