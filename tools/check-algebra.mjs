/**
 * Exhaustive check of the transformation engine and the whole question repertoire.
 *
 *   node tools/check-algebra.mjs [samplesPerGenerator]
 *
 * For every generator, many times over, it plays the problem the way the app lets a
 * student play it and asserts four things:
 *
 *   1. NO DEAD END      — from any reachable line, either a move applies or the goal is met.
 *   2. VALUE PRESERVED  — every step keeps the expression's value, checked numerically at
 *                         several points (poles skipped for fractions).
 *   3. GOAL REACHED     — following `suggest` always terminates at the goal.
 *   4. NOTHING THROWS   — no move, render or hint blows up on any reachable state.
 *   5. REAL QUESTION    — the problem is not already solved before the student starts.
 *   6. FULLY FINISHED   — the end state really is finished, judged independently of
 *                         Algebra.isSimplified so a lenient finish test is caught.
 *   7. TAUGHT THE POINT — a cancelling question actually cancelled; a fraction sum
 *                         ended as one fraction.
 *
 * Domain is deliberately NOT checked here: valueAt skips poles, so a cancel that
 * changes the allowed values of x is invisible to this file by design. Banned
 * values are asserted in the app instead, from the ORIGINAL denominator.
 *
 * It also drives every OTHER move at every step — the ones a student would press by
 * mistake — to prove a refused move leaves the line untouched rather than half-applying.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(here, '..', 'shared', f), 'utf8');

// Browser globals, loaded in order into one scope. None of them touch the DOM at load.
const { MathLab, Algebra, Problems } = new Function(
  src('engine.js') + '\n' + src('algebra.js') + '\n' + src('problems.js') +
  '\nreturn { MathLab, Algebra, Problems };',
)();

const SAMPLES = Number(process.argv[2] || 400);
const MAX_STEPS = 20;
const POINTS = [2, 3, 5, 7, 11, 13, -2, -3, -5, -7, 17, 19];

const failures = [];
const fail = (gen, kind, detail) => failures.push({ gen, kind, ...detail });

/** Numeric value at one assignment, or null if it is a pole / not finite. */
function valueAt(items, vars, base) {
  const vals = {};
  vars.forEach((v, i) => { vals[v] = POINTS[(base + i) % POINTS.length]; });
  try {
    const n = Algebra.evaluate(items, vals);
    return Number.isFinite(n) ? { n, vals } : null;
  } catch {
    return null;
  }
}

/** Compare two lines at up to `want` usable points. Returns null when they agree. */
function disagreement(before, after, vars) {
  let used = 0;
  for (let base = 0; base < POINTS.length && used < 3; base++) {
    const a = valueAt(before, vars, base);
    if (!a) continue;
    const b = valueAt(after, vars, base);
    if (!b) continue;                       // pole introduced by cancelling is expected
    used += 1;
    const scale = Math.max(1, Math.abs(a.n));
    if (Math.abs(a.n - b.n) > 1e-7 * scale) {
      return { vals: a.vals, was: a.n, now: b.n };
    }
  }
  return used === 0 ? { vals: null, was: null, now: null, note: 'no usable test point' } : null;
}

/**
 * 6. FULLY FINISHED — written independently of Algebra.isSimplified, because the checker
 *    uses isSimplified to decide when to stop, and so cannot otherwise notice that
 *    isSimplified is too lenient. That is a real bug this project already shipped once:
 *    9s^2 - 15s over 3s "finished" as 3s(3s - 5) over 3s.
 */
function residualWork(goal, items) {
  const brText = (ts) => ts.map((x) => x.c + '|' + Algebra.sig(x)).sort().join(',');

  const sideBlocks = (side) => {
    if (side.length !== 1) return null;
    const it = side[0];
    if (it.k === 't') return { mul: it, brs: [] };
    if (it.k === 'b') return { mul: it.m, brs: [it.ts] };
    if (it.k === 'p') return { mul: it.m, brs: [it.a, it.b] };
    return null;
  };

  const shareFactor = (a, b) => {
    if (Algebra.gcdAll([a.c, b.c]) > 1) return true;
    return Object.keys(a.v).some((k) => (b.v[k] || 0) > 0);
  };

  if (items.length === 1 && items[0].k === 'f') {
    const f = items[0];
    const n = sideBlocks(f.num), d = sideBlocks(f.den);
    if (n && d) {
      for (const a of n.brs) for (const b of d.brs) {
        if (brText(a) === brText(b)) return 'a bracket is on both top and bottom';
        if (brText(a) === brText(b.map((x) => ({ c: -x.c, v: x.v, k: 't' }))))
          return 'top and bottom brackets are opposites';
      }
      if (shareFactor(n.mul, d.mul)) return 'top and bottom still share a factor';
    }
    return null;
  }

  if (goal === 'factor') {
    return Algebra.isProduct(items) ? null : 'not written as a product';
  }

  const seen = new Set();
  for (const it of items) {
    if (it.k !== 't') continue;
    const s = Algebra.sig(it);
    if (seen.has(s)) return 'two terms still have the same shape';
    seen.add(s);
  }
  for (const it of items) {
    if (['b', 'p', 'm', 'd', 'e', 'x', 'f'].includes(it.k)) return 'an unresolved ' + it.k + ' item is left';
  }
  return null;
}

for (const [name, generator] of Object.entries(Problems.ALL)) {
  for (let s = 0; s < SAMPLES; s++) {
    let problem;
    try {
      problem = generator();
    } catch (e) {
      fail(name, 'generator threw', { err: String(e) });
      break;
    }

    const { goal } = problem;
    let items = Algebra.cloneAll(problem.items);
    const startLine = Algebra.render(items);
    const vars = Algebra.varsUsed(items);
    let steps = 0;
    const used = [];

    // 5. A question that is already finished is a broken question — the student presses
    //    "done" and wins having done nothing. This is neither a dead end nor a value
    //    error, so it needs its own assertion.
    if (Algebra.reachedGoal(goal, items)) {
      fail(name, 'STARTS ALREADY FINISHED', { start: startLine, goal });
      continue;
    }

    try {
      while (!Algebra.reachedGoal(goal, items)) {
        // every move that is NOT the suggested one must either apply cleanly or refuse
        // without touching the line
        for (const key of Algebra.PALETTE[goal]) {
          const move = Algebra.MOVES[key];
          if (move.can(items)) continue;
          const snapshot = Algebra.render(items);
          const msg = move.refuse(items);
          if (typeof msg !== 'string' || !msg.length) {
            fail(name, 'refusal has no message', { start: startLine, move: key });
          }
          if (Algebra.render(items) !== snapshot) {
            fail(name, 'refused move mutated the line', { start: startLine, move: key });
          }
        }

        const key = Algebra.suggest(goal, items);
        if (!key) {
          fail(name, 'DEAD END', {
            start: startLine,
            stuckAt: Algebra.render(items),
            goal,
            notYet: Algebra.notYet(goal, items),
          });
          break;
        }

        const before = items;
        const { next, why } = Algebra.MOVES[key].apply(items);

        if (typeof why !== 'string' || !why.length) {
          fail(name, 'move has no explanation', { start: startLine, move: key });
        }

        const bad = disagreement(before, next, vars);
        if (bad) {
          fail(name, bad.note ? 'unverifiable step' : 'VALUE CHANGED', {
            start: startLine, move: key,
            from: Algebra.render(before), to: Algebra.render(next), ...bad,
          });
          break;
        }

        used.push(key);
        items = next;
        Algebra.render(items);          // must not throw on any reachable state

        if (++steps > MAX_STEPS) {
          fail(name, 'did not terminate', { start: startLine, stuckAt: Algebra.render(items) });
          break;
        }
      }
      // 7. Route-specific: a cancelling question that never cancelled did not teach the
      //    thing it exists to teach, even if the end state looks tidy.
      if (goal === 'fraction' && !used.includes('cancel')) {
        fail(name, 'FRACTION FINISHED WITHOUT CANCELLING', { start: startLine, final: Algebra.render(items), used: used.join(' → ') });
      }
      if (goal === 'fracarith' && items.filter((i) => i.k === 'f').length > 1) {
        fail(name, 'STILL TWO FRACTIONS', { start: startLine, final: Algebra.render(items) });
      }

      const left = residualWork(goal, items);
      if (left) {
        fail(name, 'NOT FULLY FINISHED', { start: startLine, final: Algebra.render(items), left });
      }
    } catch (e) {
      fail(name, 'THREW', { start: startLine, at: Algebra.render(items), err: String(e && e.stack || e) });
    }
  }
}

/* ---------------- report ---------------- */

const byKind = new Map();
for (const f of failures) byKind.set(f.kind, (byKind.get(f.kind) || 0) + 1);

const generators = Object.keys(Problems.ALL).length;
console.log(`\n${generators} generators × ${SAMPLES} samples = ${generators * SAMPLES} problems played\n`);

if (!failures.length) {
  console.log('no dead ends, no value changes, nothing threw — all clear\n');
  process.exit(0);
}

for (const [kind, n] of byKind) console.log(`  ${n.toString().padStart(5)}  ${kind}`);
console.log('\nfirst examples:\n');
const shown = new Set();
for (const f of failures) {
  const tag = f.gen + '|' + f.kind;
  if (shown.has(tag)) continue;
  shown.add(tag);
  console.log('  ' + f.gen + ' — ' + f.kind);
  for (const [k, v] of Object.entries(f)) {
    if (k === 'gen' || k === 'kind' || v == null) continue;
    console.log('      ' + k + ': ' + (typeof v === 'object' ? JSON.stringify(v) : v));
  }
  console.log('');
}
process.exit(1);
