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
`node tools/check-engine.mjs` exercises the algebra parser. Before trusting any new
assertion in it, break the thing it covers and watch it fail — a green test that has never
been seen red covers nothing.

## Adding an app
1. Copy an `apps/*.html` file.
2. Write level generators returning `{ prompt, question, given, hint, solution, mount }`.
3. `MathLab.createGame({ key, levels })`.
4. Add a tile to `index.html` and a row to README.md.
