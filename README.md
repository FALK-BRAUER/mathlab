# mathlab

Small browser games that teach the school algebra chapter — substitution, like terms,
products, quotients, common factors — to kids who would rather not do another worksheet.

No build step, no dependencies. Open `index.html` in a browser and play.

## Run it

```bash
open index.html                 # straight from the filesystem
python3 -m http.server 8080     # or serve it, then visit localhost:8080
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
| Substitution Machine | Evaluate expressions for given values | ✅ |
| Like Terms Hunt | Identify and collect like terms | ✅ |
| Product Builder | Multiplying algebraic terms | 🔲 |
| Quotient Cruncher | Simplifying algebraic fractions | 🔲 |
| HCF Detective | Highest common factor | 🔲 |
| Chocolate Box | Word problems → expressions | 🔲 |

## Adding an app

1. Copy an existing file in `apps/`.
2. Write level generators that return a round: `{ prompt, question, given, hint, solution, mount }`.
3. Call `MathLab.createGame({ key, levels })`.
4. Add a tile to `index.html`.

See `ARCHITECTURE.md` for the round contract and why answers are compared canonically.
