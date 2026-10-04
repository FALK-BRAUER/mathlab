/**
 * Check of the simultaneous-equations chapter: exact fractions, lines, pairs, the step
 * scripts, and every word-problem family.
 *
 *   node tools/check-linear.mjs [samples]
 *
 * Every pair is solved twice — by Cramer's rule inside Linear, and by a separate float
 * elimination written here — and the two must agree with the answer the generator says it
 * built backwards from. Two derivations of one fact: if they disagree, one is wrong.
 *
 * It also asserts what makes a trap a trap: a wrong option must really be wrong. A "trap"
 * equation that the true answer satisfies would mark a correct line as a mistake.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(here, '..', 'shared', f), 'utf8');
const { MathLab, Linear: L, Stories } = new Function(
  src('engine.js') + '\n' + src('linear.js') + '\n' + src('stories.js') + '\nreturn { MathLab, Linear, Stories };',
)();

const N = Number(process.argv[2] || 300);
const failures = [];
const counts = {};
const fail = (where, msg, detail) => {
  counts[where] = (counts[where] || 0) + 1;
  if (counts[where] <= 3) failures.push(`${where}: ${msg}${detail ? '\n      ' + detail : ''}`);
};
let checks = 0;
const ok = (cond, where, msg, detail) => { checks++; if (!cond) fail(where, msg, detail); };

const f = (q) => q.n / q.d;
const txt = (e) => L.dispText(L.layoutStd(e, L.varsOf(e)));
/** What the kid sees, as plain text she could have typed. */
const plainDisp = (d) => L.dispText(d)
  .replace(/<span class="frac"><span class="num">(.*?)<\/span><span class="den">(.*?)<\/span><\/span>/g, '(($1)/($2))')
  .replace(/<[^>]+>/g, '').replace(/−/g, '-');

/** Independent solver: float elimination on the 2×2 system, no Linear involved. */
function floatSolve(e1, e2, [u, v]) {
  const a1 = f(e1.co[u] || L.Q(0)), b1 = f(e1.co[v] || L.Q(0)), c1 = f(e1.k);
  const a2 = f(e2.co[u] || L.Q(0)), b2 = f(e2.co[v] || L.Q(0)), c2 = f(e2.k);
  if (Math.abs(a1) < 1e-12) {
    if (Math.abs(b1) < 1e-12) return null;
    const vv = c1 / b1;
    if (Math.abs(a2) < 1e-12) return null;
    return { [u]: (c2 - b2 * vv) / a2, [v]: vv };
  }
  const m = a2 / a1;
  const b = b2 - m * b1, c = c2 - m * c1;
  if (Math.abs(b) < 1e-12) return null;
  const vv = c / b;
  return { [u]: (c1 - b1 * vv) / a1, [v]: vv };
}
const close = (a, b) => Math.abs(a - b) < 1e-9;

/* ---------------- fractions ---------------- */

for (let i = 0; i < N; i++) {
  const a = L.Q(MathLab.rndNonZero(-40, 40), MathLab.rnd(1, 12));
  const b = L.Q(MathLab.rndNonZero(-40, 40), MathLab.rnd(1, 12));
  ok(close(f(L.add(a, b)), f(a) + f(b)), 'Q', 'add');
  ok(close(f(L.mul(a, b)), f(a) * f(b)), 'Q', 'mul');
  ok(close(f(L.div(a, b)), f(a) / f(b)), 'Q', 'div');
  ok(L.eq(L.parseNumber(L.qText(a).replace('−', '-')), a), 'Q', 'parse(qText) round trip', L.qText(a));
}
for (const [s, want] of [['3', 3], ['-2', -2], ['−7', -7], ['3/4', 0.75], ['-1.5', -1.5], ['$2.90', 2.9], ['238 cm', 238], ['94°', 94], ['.5', 0.5]]) {
  const q = L.parseNumber(s);
  ok(q && close(f(q), want), 'parseNumber', JSON.stringify(s));
}
for (const s of ['', 'abc', '3/0', '1..2', '--3']) ok(L.parseNumber(s) === null, 'parseNumber', 'should refuse ' + JSON.stringify(s));

/* ---------------- typed equations ---------------- */

const parses = [
  ['5x - 2(3+x) = 0', L.std(3, 0, 6)],
  ['x/2 + y = 3', L.std(L.Q(1, 2), 1, 3)],
  ['1/2x + y = 3', L.std(L.Q(1, 2), 1, 3)],
  ['2(x - 3) = -(y + 1)', L.std(2, 1, 5)],
  ['y = 3x - 4', L.std(-3, 1, -4)],
  ['0.25m + 15 = c', L.E({ m: L.Q(1, 4), c: -1 }, -15)],
];
for (const [s, want] of parses) {
  const e = L.parseEquation(s);
  ok(e && L.equivalent(e, want), 'parseEquation', s, e && txt(e));
}
for (const s of ['x*y = 3', 'x^2 = 4', '3x + 2', '= 4', 'x = = 2', '2(x = 3)']) ok(L.parseEquation(s) === null, 'parseEquation', 'should refuse ' + s);

/* ---------------- lines ---------------- */

for (let i = 0; i < N; i++) {
  for (const frac of [false, true]) {
    const { eq: e, m, c } = L.mcLine({ frac });
    ok(L.eq(L.gradient(e), m) && L.eq(L.yIntercept(e), c), 'mcLine', 'gradient/intercept read back', txt(e));
    const p1 = { x: L.Q(m.d), y: L.add(c, m.n) }, p2 = { x: L.Q(-m.d), y: L.sub(c, m.n) };
    const onGrid = (p) => Math.abs(f(p.x)) <= 6 && Math.abs(f(p.y)) <= 6 && L.satisfies(e, p);
    ok(onGrid(p1) || onGrid(p2), 'mcLine', 'a second whole point on the ±6 grid', txt(e));
  }
  const { eq: e, xInt, yInt } = L.interceptLine();
  ok(L.satisfies(e, { x: xInt, y: L.Q(0) }) && L.satisfies(e, { x: L.Q(0), y: yInt }), 'interceptLine', 'passes through its intercepts', txt(e));
  ok(L.eq(L.xIntercept(e), xInt) && L.eq(L.yIntercept(e), yInt), 'interceptLine', 'intercepts read back', txt(e));

  // display round trip: what is shown parses back to the same line
  for (const how of ['std', 'zero']) {
    const shown = how === 'zero' ? L.layoutZero(e, ['x', 'y']) : L.layoutStd(e, ['x', 'y']);
    const back = L.parseEquation(L.dispText(shown).replace(/−/g, '-'));
    ok(back && L.equivalent(back, e), 'display', how + ' round trip', L.dispText(shown));
  }
}

/* ---------------- pairs ---------------- */

function checkPair(name, e1, e2, sol) {
  ok(L.satisfies(e1, sol) && L.satisfies(e2, sol), name, 'answer satisfies both', txt(e1) + ' | ' + txt(e2));
  const r = L.solve2(e1, e2, ['x', 'y']);
  ok(r.kind === 'one' && L.eq(r.sol.x, sol.x) && L.eq(r.sol.y, sol.y), name, 'Cramer agrees');
  const fl = floatSolve(e1, e2, ['x', 'y']);
  ok(fl && close(fl.x, f(sol.x)) && close(fl.y, f(sol.y)), name, 'independent elimination agrees', txt(e1) + ' | ' + txt(e2));
}

for (let i = 0; i < N; i++) {
  const g = L.graphPair({});
  checkPair('graphPair', g.e1, g.e2, g.sol);
  ok(L.num(g.sol.x) !== 0 && L.num(g.sol.y) !== 0, 'graphPair', 'crossing is off the axes (else it is also an intercept)');
  for (const e of [g.e1, g.e2]) ok(Math.abs(f(L.yIntercept(e))) <= 5 && L.isInt(L.yIntercept(e)), 'graphPair', 'whole intercept on the grid', txt(e));

  for (const shape of ['match', 'one', 'both']) {
    const p = L.elimPair({ shape });
    checkPair('elimPair/' + shape, p.e1, p.e2, p.sol);
    const s1 = Math.abs(f(L.coef(p.e1, p.target))), s2 = Math.abs(f(L.coef(p.e2, p.target)));
    if (shape === 'match') ok(s1 === s2, 'elimPair/match', 'coefficients already match');
    if (shape === 'one') ok((s1 % s2 === 0 || s2 % s1 === 0) && s1 !== s2, 'elimPair/one', 'one multiplier needed');
    if (shape === 'both') ok(s1 % s2 !== 0 && s2 % s1 !== 0, 'elimPair/both', 'both need multiplying');
  }
  const q = L.subPair({});
  checkPair('subPair', q.eS, q.eO, q.sol);
  ok(L.eq(L.coef(q.eS, q.solved), 1), 'subPair', 'one equation already solved for a letter');

  for (const kind of ['none', 'infinite']) {
    const sp = L.specialPair(kind);
    ok(L.solve2(sp.e1, sp.e2, ['x', 'y']).kind === kind, 'specialPair/' + kind, 'Cramer classifies it');
    ok(floatSolve(sp.e1, sp.e2, ['x', 'y']) === null, 'specialPair/' + kind, 'independent: determinant is 0');
    // independent: same gradient; and same/different intercept
    const m1 = L.gradient(sp.e1), m2 = L.gradient(sp.e2);
    ok(m1 && m2 && L.eq(m1, m2), 'specialPair/' + kind, 'same gradient');
    const sameC = L.eq(L.yIntercept(sp.e1), L.yIntercept(sp.e2));
    ok(kind === 'infinite' ? sameC : !sameC, 'specialPair/' + kind, kind === 'infinite' ? 'same intercept' : 'different intercept');
  }
}

/* ---------------- step scripts ---------------- */

function checkScript(name, script, sol, eqs) {
  ok(L.eq(script.sol.x, sol.x) && L.eq(script.sol.y, sol.y), name, 'script ends at the answer');
  for (const raw of script.steps) {
    const st = L.present(raw);
    const where = name + ':' + st.kind;
    ok(st.options.filter((o) => o.ok).length >= 1, where, 'has a right option');
    if (st.kind !== 'pick') ok(st.options.filter((o) => o.ok).length === 1, where, 'exactly one right option', st.prompt);
    const htmls = st.options.map((o) => o.html);
    ok(new Set(htmls).size === htmls.length, where, 'options look different', htmls.join(' | '));
    ok(st.options.length >= 2, where, 'there is something to choose between', st.prompt);
    ok(!/undefined|NaN|null/.test(htmls.join('') + st.prompt + st.writtenHTML), where, 'no undefined/NaN on screen', htmls.join(' | '));
    if (st.kind === 'value') {
      ok(L.eq(st.answer, sol[st.v]), where, 'value step lands on the answer', st.v + ' = ' + L.qText(st.answer));
      for (const o of st.options.filter((x) => !x.ok)) ok(!L.eq(o.value, st.answer), where, 'a trap value is really wrong', o.trap);
    }
    if (st.kind === 'eq' || st.kind === 'line' || st.kind === 'show') {
      ok(L.satisfies(st.answer, sol), where, 'step keeps the solution (value preserved)', L.dispText(L.layoutStd(st.answer, L.varsOf(st.answer))));
    }
    if (st.kind === 'eq') {
      for (const o of st.options.filter((x) => !x.ok)) ok(!L.satisfies(o.value, sol) || !L.identical(o.value, st.answer), where, 'a trap line is not the right line');
      for (const o of st.options.filter((x) => !x.ok)) ok(!L.satisfies(o.value, sol), where, 'a trap line is false at the answer', o.trap + ': ' + L.dispText(L.layoutStd(o.value, ['x', 'y'])));
    }
    if (st.kind === 'show') {
      // parse what is SHOWN for every option: the right one must be true at the answer, traps false
      for (const o of st.options) {
        const shown = plainDisp(o.disp);
        const e = L.parseEquation(shown);
        ok(!!e, where, 'shown line parses', shown);
        if (e) ok(L.satisfies(e, sol) === !!o.ok, where, o.ok ? 'shown right line holds at the answer' : 'shown trap line fails at the answer', (o.trap || 'right') + ': ' + shown);
      }
    }
    if (st.kind === 'line') {
      for (const o of st.options) {
        const shown = plainDisp(o.disp);
        const e = L.parseEquation(shown);
        ok(e && L.satisfies(e, sol) === !!o.ok, where, o.ok ? 'shown right line holds' : 'shown trap line fails', shown);
      }
    }
  }
  for (const e of eqs) ok(L.satisfies(e, script.sol), name, 'script answer satisfies the original pair');
}

for (let i = 0; i < N; i++) {
  for (const shape of ['match', 'one', 'both']) {
    const p = L.elimPair({ shape });
    checkScript('elimination/' + shape, L.eliminationScript(p.e1, p.e2, p.target), p.sol, [p.e1, p.e2]);
  }
  const q = L.subPair({});
  checkScript('substitution', L.substitutionScript(q.eS, q.eO, q.solved, q.free), q.sol, [q.eS, q.eO]);
  checkScript('substitution-as-elimination', L.eliminationScript(q.eS, q.eO, MathLab.pick(['x', 'y'])), q.sol, [q.eS, q.eO]);
}

/* ---------------- word problems ---------------- */

for (const fam of Object.keys(Stories.FAMILY)) {
  for (let i = 0; i < N; i++) {
    const s = Stories.make(fam);
    const where = 'story/' + fam;
    const plain = s.text.replace(/<[^>]+>/g, '');
    ok(!/undefined|NaN|null|\[object/.test(plain + s.sentence), where, 'no undefined/NaN in the text', plain);
    ok(s.eqs.length >= 1 && s.eqs.length <= 2, where, 'one or two equations');
    for (const e of s.eqs) {
      ok(L.satisfies(e.eq, s.sol), where, 'answer satisfies the equation', e.prompt + ' ' + txt(e.eq));
      const right = e.options.filter((o) => o.ok);
      ok(right.length === 1 && L.equivalent(right[0].eq, e.eq), where, 'exactly one right option and it is the equation');
      ok(e.options.length >= 2, where, 'a choice to make', e.prompt);
      for (const o of e.options.filter((x) => !x.ok)) {
        ok(!L.equivalent(o.eq, e.eq), where, 'trap differs from the right equation', o.trap);
        ok(!L.satisfies(o.eq, s.sol), where, 'trap is false at the answer', o.trap + ': ' + txt(o.eq) + ' — ' + plain.slice(0, 90));
        if (o.disp) {
          const shown = L.parseEquation(plainDisp(o.disp));
          if (shown) ok(L.equivalent(shown, o.eq), where, 'a trap shows what it means', o.trap + ': ' + L.dispText(o.disp) + ' vs ' + txt(o.eq));
        }
      }
      if (right[0] && right[0].disp) {
        const shown = L.parseEquation(plainDisp(right[0].disp));
        if (shown) ok(L.equivalent(shown, e.eq), where, 'the right option shows what it means', L.dispText(right[0].disp));
      }
    }
    // unique answer: two equations pin both letters down
    if (s.eqs.length === 2) {
      const vars = s.order;
      const r = L.solve2(s.eqs[0].eq, s.eqs[1].eq, vars);
      ok(r.kind === 'one', where, 'the pair has exactly one answer');
      const fl = floatSolve(s.eqs[0].eq, s.eqs[1].eq, vars);
      ok(fl && vars.every((v) => close(fl[v], f(s.sol[v]))), where, 'independent elimination agrees', plain.slice(0, 80));
    }
    for (const v of s.whole || []) ok(L.isInt(s.sol[v]) && L.sign(s.sol[v]) >= 0, where, v + ' is a whole count', L.qText(s.sol[v]));
    for (const v of s.positive || []) ok(L.sign(s.sol[v]) > 0, where, v + ' is positive');
    if (s.derived) for (const d of s.derived) {
      const val = d.value(s.sol);
      ok(L.sign(val) > 0, where, 'derived ' + d.label + ' is positive', L.qText(val));
    }
    if (s.final && s.final.value) for (const t of s.final.traps || []) ok(!L.eq(t.value, s.final.value), where, 'hence-trap differs from the answer');
    if (s.final && s.final.options) ok(s.final.options.filter((o) => o.ok).length === 1, where, 'one right decision');
    if (s.graph) ok(L.eq(L.Q(s.graph.nStar), s.sol[s.graph.L]), where, 'graph crossing = answer');
  }
}

// make() quietly drops a trap that happens to be true; the generators should rarely need it
const made = Object.keys(Stories.FAMILY).length * N;
ok(Stories.prunedCount() <= made * 0.01, 'story', 'generators rarely produce a true "trap"', Stories.prunedCount() + ' pruned in ' + made + ' stories');

/* ---------------- report ---------------- */

if (failures.length) {
  console.log(failures.join('\n'));
  console.log('\nfailures by kind:');
  for (const [k, n] of Object.entries(counts)) console.log(`  ${k}: ${n}`);
  console.log(`\n${checks} checks, ${Object.values(counts).reduce((a, b) => a + b, 0)} failed`);
  process.exit(1);
}
console.log(`${checks} checks — all clear`);
