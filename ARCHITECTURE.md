# Architecture

## Shape

Static site. No bundler, no package manager, no server. Every app is one HTML file in
`apps/` that loads `shared/theme.css` and `shared/engine.js`.

```
index.html          hub
apps/*.html         one game each — markup + its own level generators
shared/theme.css    tokens, cards, chips, feedback states
shared/engine.js    MathLab — random helpers, algebra parser, quiz shell
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

`mount` owns its own UI, which is what lets tap-to-select and typed answers share one
shell. `MathLab.textAnswer()` covers the common typed case.

## Scoring

10 points per correct answer plus 2 per streak step, capped at 10 steps — enough to reward
a run without making a late mistake feel catastrophic. Best streak per app persists in
`localStorage` under `mathlab:<key>`; every read and write is wrapped, so private browsing
degrades to "scores don't stick" rather than a broken page.
