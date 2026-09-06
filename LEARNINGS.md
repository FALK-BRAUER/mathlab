# Learnings

## 2026-09-06 — Answer checking has to be canonical, not textual
Kids type `6qp` when the book says `6pq`, and `3x + 2x²` when the answer key says
`2x² + 3x`. Both are correct. String comparison would mark them wrong and teach the kid
that maths is about guessing the marker's preferred order. `MathLab.canon()` parses terms
into `{ coeff, vars }` and compares meaning. Cost: a real parser (~60 lines) instead of
`===`. Worth it — it is the difference between a game and a punishment.

## 2026-09-06 — Construct backwards to keep answers clean
First cut of the fraction level drew random values and retried until the division came out
whole. That loops unboundedly for some draws. Fix: pick the *answer* first, then solve for
a numerator that produces it. Terminates in one pass, and the difficulty stays where you
put it instead of drifting toward whatever divides easily.

## 2026-09-06 — Mutation-bite before trusting the engine checks
`tools/check-engine.mjs` passed on first run, which proves nothing. Broke the code eight
different ways; 18 of the 21 checks went red under at least one break. Three did not move
under any mutation tried — `sign matters`, `different letters are not like terms`,
`gibberish never matches`. They are kept as guards but are not yet earned.
