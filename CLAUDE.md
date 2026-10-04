# CLAUDE.md — mathlab

## Overview
Browser games that teach the school algebra chapter to kids. Static HTML, no build step.
Topics come from the Year 8/9 algebra worksheets: substitution, like terms, algebraic
products, algebraic quotients, highest common factors, word problems.

## Audience
Kids, roughly 12–14. Every design call resolves in favour of *fun and immediate feedback*
over completeness. Big targets, one idea per screen, an answer is judged the moment it is
given, and a wrong answer always shows the right one.

## Rules
- **No build step.** Vanilla JS, no npm, no framework. Apps must open from `file://`.
  This overrides the global TypeScript default — see ARCHITECTURE.md for why.
- **One app = one file** in `apps/`, plus the shared theme and engine. Never fork the theme.
- **Never hardcode a question bank.** Generate rounds so practice never runs out.
- **Construct backwards for clean answers.** Pick the result, then build a question that
  yields it — do not draw randomly and reject.
- **Judge answers with `MathLab.canon()`**, never string equality. `6qp` is `6pq`.
- Comments in English. Conventional Commits.

## Testing
- `node tools/check-engine.mjs` — the algebra parser in `shared/engine.js`.
- `node tools/check-algebra.mjs [samples]` — plays every generator in `shared/problems.js`
  through `shared/algebra.js` and asserts seven things: no dead ends, value preserved at
  every step, goal reachable, refused moves leaving the line untouched, nothing thrown, the
  problem not already finished when it starts, and the end state genuinely finished judged
  by code written independently of `isSimplified`.
- `node tools/check-linear.mjs [samples]` — the equations chapter: two independent solvers
  must agree, every step keeps the solution, every trap is false at the answer.
- `node tools/check-ui.mjs [rounds] [app…]` — headless Chrome at iPhone size, every level.
- After changing any app: `node tools/bundle.mjs` (regenerates `index.html`, `dist/`,
  `shared/all-apps.js`).

Before trusting any new assertion, break the thing it covers and watch it fail. Twenty-six
mutations have been bitten so far; two real defects were found only because a mutation
that should have gone red did not.

## Adding an app
1. Copy an `apps/*.html` file.
2. Write level generators returning `{ prompt, question, given, hint, solution, mount }`.
3. Register with `MathLab.app(key, { …, build() { return levels; } })`, start with `MathLab.run(key)`.
4. Add it to `ORDER` in `tools/bundle.mjs`, run the bundler (the hub is generated), add a row to README.md.
