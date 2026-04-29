#!/usr/bin/env bash
# Deploy 4gk.pl: push current branch to GitHub, then SSH to the server,
# pull, rebuild and restart the app container.
#
# Usage: ./deploy.sh
# Requires: .ssh_4gk private key in repo root (gitignored).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

KEY=".ssh_4gk"
HOST="root@4gk.pl"
REMOTE_DIR="/opt/4gk"

if [ ! -f "$KEY" ]; then
  echo "ERROR: $KEY not found in repo root" >&2
  exit 1
fi
chmod 600 "$KEY"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "==> Pushing $BRANCH to origin"
git push origin "$BRANCH"

echo "==> Deploying on $HOST"
ssh -i "$KEY" \
  -o StrictHostKeyChecking=no \
  -o ServerAliveInterval=15 \
  -o ServerAliveCountMax=4 \
  -o ConnectTimeout=10 \
  "$HOST" \
  "cd $REMOTE_DIR && git pull --ff-only && docker compose build app && docker compose up -d app && sleep 3 && docker compose ps app"

echo "==> Done. https://4gk.pl/"
