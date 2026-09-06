# mathlab

Small browser games that teach the school algebra chapter — substitution, like terms,
products, quotients, common factors — to kids who would rather not do another worksheet.

No build step, no dependencies. Open `index.html` in a browser and play.

## Run it

**Anywhere — the published link** (works on the Claude mobile app, any device, no Tailscale):

> https://claude.ai/code/artifact/3b1a8121-c22d-4f5b-89b5-99581c5577d5

That is `dist/mathlab.html`, a single self-contained page built by `node tools/bundle.mjs`.
Rebuild it and republish to the same URL after changing any app.

**On the tailnet** (iPad, phone, MacBook — any device signed into Tailscale):

> https://falks-mac-mini-2.tail31e524.ts.net:10200/

Real HTTPS, no port-forwarding, tailnet only — never exposed to the public internet.
The Mac mini serves it via `tools/serve.sh` (bound to `127.0.0.1`) with Tailscale
proxying in front:

```bash
tools/serve.sh                                          # start the backend
tailscale serve --https=10200 off                       # remove the tailnet mapping
tailscale serve --bg --https=10200 http://127.0.0.1:8099  # put it back
```

The Tailscale mapping survives reboots. The backend does not — run `tools/serve.sh`
under Lingon Pro with KeepAlive so it restarts on its own.

**Locally:**

```bash
open index.html                 # straight from the filesystem, no server needed
tools/serve.sh                  # or http://localhost:8099
```

## Layout

| Path | What |
|------|------|
| `index.html` | Hub — one tile per app |
| `apps/` | One self-contained HTML file per game |
| `shared/theme.css` | Look and feel for every app |
| `shared/engine.js` | Quiz shell, algebra parser, scoring, progress |

## Apps

| App | Topic | Status |
|-----|-------|--------|
| Step Builder | Pick the move; the working writes itself. Brackets, powers, collecting, factorising, cancelling, banned values | ✅ |
| Like Terms Hunt | Blocks you join; the joint holds when shapes differ | ✅ |
| Substitution Machine | Evaluate expressions for given values | ✅ |
| HCF Detective | Break both terms into pieces; what is in both is the answer | ✅ |
| Chocolate Box | Word problems → expression → number | ✅ |

## Adding an app

1. Copy an existing file in `apps/`.
2. Write level generators that return a round: `{ prompt, question, given, hint, solution, mount }`.
3. Call `MathLab.createGame({ key, levels })`.
4. Add a tile to `index.html`.

See `ARCHITECTURE.md` for the round contract and why answers are compared canonically.
