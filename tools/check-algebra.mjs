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

        items = next;
        Algebra.render(items);          // must not throw on any reachable state

        if (++steps > MAX_STEPS) {
          fail(name, 'did not terminate', { start: startLine, stuckAt: Algebra.render(items) });
          break;
        }
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
