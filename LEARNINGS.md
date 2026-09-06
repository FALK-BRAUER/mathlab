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

## 2026-09-06 — A new mechanic behind a level button is an invisible mechanic
Shipped block-joining as level ② of Like Terms Hunt. Falk opened it and said he could not
see a change — correctly, because the app lands on level ①, which was untouched. Read back
the published artifact to rule out caching: the code was live, the change was just two taps
deep. If a change is the point of a release, it has to be what the app opens on.

## 2026-09-06 — A NaN comparison is a test that always passes
The Step Builder check re-derives each transformation numerically and compares. It reported
60/60 clean. It was wrong: a regex inserted `*` inside `Math.pow(`, every squared term
evaluated to NaN, and `Math.abs(NaN - NaN) > 1e-9` is false — so every comparison involving
a power silently "agreed". Caught only by feeding the detector known-wrong pairs and
noticing `3x² + 4x²` vs `7x⁴` was not flagged. The evaluator now throws on any non-finite
result, so the failure cannot be silent again. Verify the detector on a known defect before
trusting a clean run — a comparison that cannot fail is not a check.

## 2026-09-06 — Rendering that returns HTML collides with helpers that rewrite text
`Algebra.render` returns real markup for fractions. `MathLab.mathHTML` italicises every
lowercase letter — including the ones inside `<span class="frac">` — so every fraction
rendered as broken tag soup. Found only because a DOM-scraping test printed the raw string.
`mathHTML` now skips anything inside a tag. Related: applying the operator-spacing regex to
an already-rendered item double-spaced the contents of brackets, so `render` joins with
explicit operators instead.

## 2026-09-06 — Move the logic out of the page to make it testable
The transformation engine and the question repertoire now live in `shared/algebra.js` and
`shared/problems.js` rather than inside the app's `<script>`. That is what lets
`tools/check-algebra.mjs` play thousands of problems in node in a second, instead of
driving a browser. It found nothing the browser run had missed — but it is repeatable,
fast, and mutation-bitten, which the browser run was not.

## 2026-09-06 — A checker that decides "done" using the code under test has a blind spot
`check-algebra.mjs` stopped playing when `Algebra.isSimplified` said so, which meant it
could never notice that `isSimplified` was too lenient. It shipped exactly that bug:
`(9x² − 15x)/3x` "finished" as `3x(3x − 5)/3x`, uncancelled, because cancelling only looked
at brackets and not at the multiplier in front. No dead end, no value change — the run was
green. Fixed the engine, then added a `residualWork()` check written independently of
`isSimplified`, and confirmed it by reverting the fix and watching it go red.

## 2026-09-06 — Order-sensitive keys silently disable a feature
Brackets were matched by their rendered text, so `(x − 5)` never matched the negative of
`(5 − x)` — the strings differ. The sign-flip move could therefore never fire, and worse,
those questions counted as already finished: open one, press done, win, having done
nothing. Keys are now built from sorted term signatures. The mutation that revealed it was
one the suite initially failed to catch, which is why "a question that starts already
finished" is now its own assertion.

## 2026-09-06 — A refused button teaches nothing about a mistake she never made
Wrong moves were refused with an explanation and the line left untouched. That is good for
not punishing, but it means the classic errors were only ever *described*. The fix is the
predict step: after choosing a move, she picks what it turns into from the correct line and
the ones the named traps produce — x² + 25, 7x⁴, 7x⁵, 7 − 2x − 5. She has to look at the
wrong answer and reject it. This came out of the Fable review, which called it the single
biggest lever between modelling and drilling, and it was right.

## 2026-09-06 — Saying a thing in the report does not make it true in the code
I told Falk the score was "steps you found yourself". The code called `submit(true)`
unconditionally, so score and streak meant nothing in that app. Likewise I claimed the
questions were interleaved while Mixed was a flat concatenation of pools — brackets being
the biggest pool, it was brackets-heavy. Both were found by a reviewer reading the code
against my own description of it. Check claims against the source before making them.

## 2026-09-06 — The publishable build and the servable build are not the same file
`dist/mathlab.html` is written headless on purpose: the Artifact publisher supplies the
`<html><head>` with charset and viewport. Served directly over the LAN that file has no
viewport meta at all, so mobile Chrome falls back to a 980px layout viewport and every
mobile media query silently fails — the phone gets a shrunken desktop and nothing looks
broken enough to point at. `bundle.mjs` now also writes `dist/index.html`, the same bytes
inside a real document, and that is the URL to serve. Measured under device emulation, not
by squinting at a narrow window: Chrome clamps a real window at 500px wide, so resizing the
window never actually tested a phone.

## 2026-09-06 — Two hand-maintained copies of the same list means one of them is wrong
The hub existed twice: `index.html` at the project root, written by hand, and the hub built
into the bundle. Apps were added to the bundle and not to the root file, so the site root
served a page listing two of five games plus four "coming soon" tiles for games that had
either been built already or been folded into Step Builder. Anyone opening the plain LAN
address saw a project three commits out of date. `bundle.mjs` now generates the root hub
from the apps' own `MathLab.app()` registrations, so there is one source for the list and
drift is not possible.
