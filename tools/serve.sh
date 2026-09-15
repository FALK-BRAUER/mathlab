#!/bin/bash
# Serve mathlab over HTTP.
#
# Binds every interface by default, so it is reachable three ways:
#   http://localhost:8099/                        on this machine
#   http://<lan-ip>:8099/                         on the LAN
#   https://<machine>.<tailnet>.ts.net:10200/     over Tailscale, given a serve mapping
#
# Set MATHLAB_BIND=127.0.0.1 to go back to localhost-only, which is enough when
# Tailscale is the only way in — Tailscale proxies from loopback.
#
# Map it onto a tailnet (the mapping survives reboots):
#   tailscale serve --bg --https=10200 http://127.0.0.1:8099
#   tailscale serve --https=10200 off      # to remove it
#
# Run under a keepalive supervisor (launchd, Lingon Pro, pm2) so it comes back
# after a reboot or a crash.

set -euo pipefail

PORT="${MATHLAB_PORT:-8099}"
BIND="${MATHLAB_BIND:-0.0.0.0}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"
exec /usr/bin/python3 -m http.server "$PORT" --bind "$BIND"
