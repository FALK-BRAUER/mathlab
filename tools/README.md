# tools/

Developer scripts. Run with plain `node`; no dependencies, nothing installed.

| Script | What it does |
|--------|--------------|
| `check-engine.mjs` | Asserts the algebra parser's behaviour — canonical form, rejection of unparseable input, display formatting. |
| `check-algebra.mjs` | Plays every question generator through the transformation engine thousands of times, asserting seven invariants. Takes an optional sample count. |
| `check-linear.mjs` | The equations chapter: every pair solved two independent ways, every step script replayed, every word-problem family generated, and every trap proven really wrong at the answer. |
| `check-ui.mjs` | Plays every app in headless Chrome at iPhone size (390×844, touch). Fails on exceptions, sideways scroll, taps under 44px, "Next" showing before an answer, or a round that cannot be finished. `--shots DIR` saves screenshots. |
| `bundle.mjs` | Inlines theme, engine, every shared script and every app into `dist/mathlab.html`; regenerates `index.html` and `shared/all-apps.js`. |
| `serve.sh` | Serves the project on `127.0.0.1:8099` for the tailnet proxy. |

Break the code a check covers and watch it go red before trusting a new assertion in it.

Goes here: scripts for maintaining the project.
Does not go here: anything the games load at runtime — that is `shared/`.
