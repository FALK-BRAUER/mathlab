# tools/

Developer scripts. Run with plain `node`; no dependencies, nothing installed.

| Script | What it does |
|--------|--------------|
| `check-engine.mjs` | Asserts the algebra parser's behaviour — canonical form, rejection of unparseable input, display formatting. |
| `check-algebra.mjs` | Plays every question generator through the transformation engine thousands of times, asserting seven invariants. Takes an optional sample count. |
| `bundle.mjs` | Inlines theme, engine, algebra, problems and every app into `dist/mathlab.html` for publishing. |
| `serve.sh` | Serves the project on `127.0.0.1:8099` for the tailnet proxy. |

Break the code a check covers and watch it go red before trusting a new assertion in it.

Goes here: scripts for maintaining the project.
Does not go here: anything the games load at runtime — that is `shared/`.
