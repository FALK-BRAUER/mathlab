# mathlab

Small browser games that teach the school algebra chapter — substitution, like terms,
products, quotients, common factors — to kids who would rather not do another worksheet.

No build step, no dependencies. Open `index.html` in a browser and play.

## Run it

**Anywhere — the published site:**

> https://falk-brauer.github.io/mathlab/

**Locally:**

```bash
open index.html                 # straight from the filesystem, no server needed
tools/serve.sh                  # or http://localhost:8099
```

**As one self-contained file:**

`node tools/bundle.mjs` writes `dist/mathlab.html` — every app, theme and engine inlined
into a single page you can hand to someone or paste anywhere. Rebuild it after changing
any app.

**On a private tailnet** (optional — iPad, phone, laptop signed into Tailscale):

```bash
tools/serve.sh                                            # backend on :8099
tailscale serve --bg --https=10200 http://127.0.0.1:8099  # map onto the tailnet
tailscale serve --https=10200 off                         # remove the mapping
```

Then open `https://<your-machine>.<your-tailnet>.ts.net:10200/`. Real HTTPS, no
port-forwarding, tailnet only. The mapping survives reboots; the backend does not — run
`tools/serve.sh` under a keepalive supervisor.

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
| 🎯 Daily Mix | 12 mixed questions a day from every app, plus a report for grown-ups | ✅ |
| 📈 Line Lab | Gradient and intercept: read, rearrange, draw on a grid, intercepts, special lines | ✅ |
| ✖️ Crossing Point | Solve by graphing; intercept or intersection; one, none or infinitely many | ✅ |
| ⚖️ Two Equations | Substitution and elimination step by step, every step offering the real mistakes; finish with x AND y | ✅ |
| 🧾 Story Solver | Word problems → two equations → answer, with sense checks; nine problem families | ✅ |
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
