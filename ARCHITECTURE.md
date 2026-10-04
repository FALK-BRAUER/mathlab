# Architecture

## Shape

Static site. No bundler, no package manager, no server. Every app is one HTML file in
`apps/` that loads `shared/theme.css` and `shared/engine.js`.

```
index.html          hub
apps/*.html         one game each — markup + its own level generators
shared/theme.css    tokens, cards, chips, feedback states
shared/engine.js    MathLab — random helpers, algebra parser, quiz shell, learning log,
                    choice-with-named-mistakes, keypad fields
shared/linear.js    Linear — exact fractions, lines, pairs, solving step scripts, typed-equation parser
shared/grid.js      Grid — tappable SVG coordinate plane
shared/stories.js   Stories — word-problem families for the equations chapter
shared/all-apps.js  GENERATED — every app's registration, so the daily mix can use them
```

## Decisions

**No build step, vanilla JS.** The house default is TypeScript strict. It is deliberately
not used here: these apps have to open from a `file://` path on a school laptop, be
copy-pasteable into an Artifact, and be editable by a kid who wants to change the colours.
A toolchain would cost all three. The tradeoff is no compile-time type safety — accepted
because each app is ~150 lines with no shared mutable state.

**Shared CSS/JS, not fully self-contained files.** Six apps duplicating 350 lines of theme
would drift within a week. The cost is that an app can't be emailed as a single file. If
that becomes necessary, add a small inliner producing `dist/` — do not fork the theme.

**Answers are compared canonically, not as strings.** A kid typing `6qp` has the right
answer for `6pq`, and `2x²+3x` should match `3x+2x²`. `MathLab.canon()` parses each term
into `{ coeff, vars }`, collects like terms, sorts, and emits a canonical key. It also
tolerates unicode minus, `²`/`³`, `xx` for `x²`, and stray spaces. It returns `null` on
input it cannot parse, so a typo is judged wrong rather than silently treated as zero.

**Questions are generated, not listed.** Every round is constructed from random values, so
practice never runs out and answers cannot be memorised. Generators that could produce an
ugly answer construct backwards instead: the fraction levels pick the *result* first and
then solve for a numerator that divides exactly, rather than rejecting bad draws in a loop.

**Exact fractions in the equations chapter.** `Linear` does every calculation in `{ n, d }`
rationals. "Is this point on the line" and "is this trap really wrong" are equality
questions; with floats they become tolerance questions, and a tolerance is where a wrong
trap hides. The checker solves every pair a second way, in floats, as a disagreement test.

**A trap must be false at the answer.** Every step and every word problem offers the right
line next to lines the named misconceptions produce. When the answer has a 0 in it, or two
counts are equal, a "mistake" can come out true — and marking a true line wrong teaches the
wrong thing. Generators avoid those shapes (no zero coordinates, unequal counts); `Stories.make`
drops any trap that is still true as a last guard; `check-linear.mjs` fails if more than 1%
of stories need that guard.

**Phone first for the grid.** The target device is an iPhone. A ±6 grid gives ~27px squares
against a 44pt finger, so taps snap to the nearest grid point and the coordinates are shown
above the grid while the finger is down. Typed answers use an on-screen keypad (`MathLab.fields`)
because the iOS keyboard hides the minus sign behind a mode switch — a sign-error machine for
a learner whose main error is signs.

**Feedback names the mistake.** `submit(correct, points, why)` and `MathLab.choice` show
*which* error was made, not just that one was (elaborated feedback beats showing the answer
in the evidence). Each named error is logged as a trap id; the daily mix's report turns the
log into a list for a parent. The log stays in `localStorage` on the device.

**Finishing is a rule, not a hope.** Rounds in the equations chapter end only when the
question actually asked is answered — both x and y, every derived quantity, the "hence" part.
Submitting with a part missing is refused with a reason and logged as `unfinished`.

## The round contract

A level's `make()` returns:

| Field | Purpose |
|-------|---------|
| `prompt` | Instruction line above the question (HTML) |
| `question` | The expression itself (HTML) |
| `given` | Optional `["k = 3", ...]` chips |
| `hint` | Shown when the kid presses "Need a hint?" (HTML) |
| `solution` | Displayed after a wrong answer |
| `mount(stage, submit)` | Render the answer UI; call `submit(bool)` once |

Optional: `noHint` (hide the hint button), `noScore` (a summary screen — no score, no log),
`origin` (the daily mix says which app a round came from), `firstTry` (set by multi-step
rounds so the log knows a finished round had mistakes on the way).

`mount` owns its own UI, which is what lets tap-to-select and typed answers share one
shell. `MathLab.textAnswer()` covers the common typed case.

## Scoring

10 points per correct answer plus 2 per streak step, capped at 10 steps — enough to reward
a run without making a late mistake feel catastrophic. Best streak per app persists in
`localStorage` under `mathlab:<key>`; every read and write is wrapped, so private browsing
degrades to "scores don't stick" rather than a broken page.

## Publishing

`node tools/bundle.mjs` inlines the theme, the engine and every app registration into one
self-contained `dist/mathlab.html`, adds a hash router, and leaves the sources untouched.
This is the inliner the "shared CSS/JS" decision above promised rather than forking the
theme, and it is what gets published as an Artifact so the games are reachable from a phone
with no server running.

For that to work, apps register with `MathLab.app(key, def)` and start via
`MathLab.run(key)` instead of calling `createGame` on load — the same file then works as a
standalone page and as one view inside the bundle.

`dist/` is generated and git-ignored. The published page relies on the Artifact wrapper for
its `<meta charset>`; served from a bare static server with no charset header, the emoji
will mojibake. That is a header problem, not a file problem — the bytes are UTF-8.
