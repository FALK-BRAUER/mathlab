#!/bin/bash
# Serve mathlab for the tailnet.
#
# Binds 127.0.0.1 only — Tailscale proxies to it, so the port never needs to be
# exposed on the LAN or any other interface. Reachable from any tailnet device at
# https://falks-mac-mini-2.tail31e524.ts.net:10200/
#
# The Tailscale side is already configured and survives reboots:
#   tailscale serve --bg --https=10200 http://127.0.0.1:8099
#   tailscale serve --https=10200 off      # to remove it
#
# Run under Lingon Pro (KeepAlive) so it comes back after a reboot or a crash.

set -euo pipefail

PORT="${MATHLAB_PORT:-8099}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"
exec /usr/bin/python3 -m http.server "$PORT" --bind 127.0.0.1
