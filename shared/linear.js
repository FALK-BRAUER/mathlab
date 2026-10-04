/* mathlab linear — exact fractions, straight lines, pairs of equations, and the step
   scripts for solving a pair by substitution or elimination.

   Pure: nothing here touches the DOM, so tools/check-linear.mjs can play every generator
   in node. Depends on MathLab (engine.js) for the random helpers only.

   Every number is an exact fraction Q = { n, d }. Floats would make "is this point on the
   line" a tolerance question, and a tolerance is exactly where a wrong trap hides. */

const Linear = (() => {
  const { rnd, rndNonZero, pick, shuffle } = MathLab;

  /* ================= exact fractions ================= */

  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => Math.abs(a * b) / (gcd(a, b) || 1);

  function Q(n, d = 1) {
    if (n && typeof n === 'object') return n;
    if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error('Q needs integers, got ' + n + '/' + d);
    if (d === 0) throw new Error('Q: zero denominator');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    return { n: n / g || 0, d: d / g };
  }

  const R = (v) => (typeof v === 'number' ? Q(v) : v);
  const add = (a, b) => { a = R(a); b = R(b); return Q(a.n * b.d + b.n * a.d, a.d * b.d); };
  const neg = (a) => { a = R(a); return Q(-a.n, a.d); };
  const sub = (a, b) => add(a, neg(b));
  const mul = (a, b) => { a = R(a); b = R(b); return Q(a.n * b.n, a.d * b.d); };
  const div = (a, b) => { a = R(a); b = R(b); if (b.n === 0) throw new Error('divide by zero'); return Q(a.n * b.d, a.d * b.n); };
  const eq = (a, b) => { a = R(a); b = R(b); return a.n === b.n && a.d === b.d; };
  const isZero = (a) => R(a).n === 0;
  const isInt = (a) => R(a).d === 1;
  const num = (a) => { a = R(a); return a.n / a.d; };
  const abs = (a) => { a = R(a); return Q(Math.abs(a.n), a.d); };
  const sign = (a) => Math.sign(R(a).n);

  /**
   * Read what a kid typed as a number: 7, −7, 3.5, 7/2, $2.90, 238 cm, 94°.
   * Returns null for anything it can't read, so a typo is judged as unreadable, not as 0.
   */
  function parseNumber(raw) {
    let s = String(raw).trim().toLowerCase()
      .replace(/[−–—]/g, '-')
      .replace(/\s+/g, '')
      .replace(/,/g, '');
    s = s.replace(/^(s\$|\$|€|£)/, '').replace(/^(-)(s\$|\$|€|£)/, '$1');
    s = s.replace(/[a-z°²³%¢]+$/, '');
    let m;
    if ((m = /^([+-]?)(\d+)\/(\d+)$/.exec(s))) {
      if (Number(m[3]) === 0) return null;
      return Q((m[1] === '-' ? -1 : 1) * Number(m[2]), Number(m[3]));
    }
    if ((m = /^([+-]?)(\d*)\.(\d+)$/.exec(s))) {
      const whole = m[2] || '0';
      const scale = 10 ** m[3].length;
      return Q((m[1] === '-' ? -1 : 1) * (Number(whole) * scale + Number(m[3])), scale);
    }
    if ((m = /^([+-]?)(\d+)$/.exec(s))) return Q((m[1] === '-' ? -1 : 1) * Number(m[2]));
    return null;
  }

  const MINUS = '−';

  const fracHTML = (top, bottom) =>
    '<span class="frac"><span class="num">' + top + '</span><span class="den">' + bottom + '</span></span>';

  /** −3/2 as text. */
  function qText(q) {
    q = R(q);
    const s = q.n < 0 ? MINUS : '';
    const a = Math.abs(q.n);
    return s + (q.d === 1 ? a : a + '/' + q.d);
  }

  /** −3/2 as a stacked fraction. */
  function qHTML(q) {
    q = R(q);
    const s = q.n < 0 ? MINUS : '';
    const a = Math.abs(q.n);
    return s + (q.d === 1 ? String(a) : fracHTML(a, q.d));
  }

  /** Money: 290/100 -> "$2.90", whole dollars stay "$14". */
  function money(q, sym = '$') {
    const v = num(q);
    const s = v < 0 ? MINUS : '';
    const a = Math.abs(v);
    return s + sym + (Number.isInteger(a) ? String(a) : a.toFixed(2));
  }

  /** A short decimal when the fraction is one (0.25, 1.5), else the fraction. */
  function qNice(q) {
    q = R(q);
    if (q.d === 1) return qText(q);
    let d = q.d;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    if (d === 1) return (q.n < 0 ? MINUS : '') + String(Math.abs(num(q)));
    return qText(q);
  }

  /* ================= equations =================
     An equation is { co: { x: Q, y: Q }, k: Q } meaning  co.x·x + co.y·y = k.
     Letters are free: a story uses { a, c } for adults and children. */

  function E(co, k) {
    const out = {};
    for (const v of Object.keys(co)) out[v] = R(co[v]);
    return { co: out, k: R(k) };
  }

  /** a·x + b·y = c in the given letters. */
  const std = (a, b, c, vars = ['x', 'y']) => E({ [vars[0]]: a, [vars[1]]: b }, c);

  const varsOf = (...eqs) => [...new Set(eqs.flatMap((e) => Object.keys(e.co)))].sort();
  const coef = (e, v) => e.co[v] || Q(0);

  function scale(e, f) {
    const co = {};
    for (const v of Object.keys(e.co)) co[v] = mul(e.co[v], f);
    return { co, k: mul(e.k, f) };
  }

  function combine(e1, e2, f2) {
    const co = {};
    for (const v of varsOf(e1, e2)) co[v] = add(coef(e1, v), mul(coef(e2, v), f2));
    return { co, k: add(e1.k, mul(e2.k, f2)) };
  }

  const addEq = (e1, e2) => combine(e1, e2, 1);
  const subEq = (e1, e2) => combine(e1, e2, -1);

  /** Drop letters whose coefficient is 0. */
  function tidy(e) {
    const co = {};
    for (const v of Object.keys(e.co)) if (!isZero(e.co[v])) co[v] = e.co[v];
    return { co, k: e.k };
  }

  /** Does the assignment { x: Q, y: Q } make the equation true? */
  function satisfies(e, sol) {
    let lhs = Q(0);
    for (const v of Object.keys(e.co)) {
      if (isZero(e.co[v])) continue;
      if (!(v in sol)) return false;
      lhs = add(lhs, mul(e.co[v], sol[v]));
    }
    return eq(lhs, e.k);
  }

  const lhsAt = (e, sol) => Object.keys(e.co).reduce((acc, v) => add(acc, mul(e.co[v], sol[v] || 0)), Q(0));

  /** Same set of solutions: one is a non-zero multiple of the other. */
  function equivalent(e1, e2) {
    const vars = varsOf(e1, e2);
    const a = [...vars.map((v) => coef(e1, v)), e1.k];
    const b = [...vars.map((v) => coef(e2, v)), e2.k];
    const i = a.findIndex((q) => !isZero(q));
    if (i === -1) return b.every(isZero);
    if (isZero(b[i])) return false;
    const f = div(b[i], a[i]);
    return a.every((q, j) => eq(mul(q, f), b[j]));
  }

  /** Same equation including how it is scaled — up to moving everything to the other side. */
  function identical(e1, e2) {
    const vars = varsOf(e1, e2);
    const same = (f) => vars.every((v) => eq(mul(coef(e1, v), f), coef(e2, v))) && eq(mul(e1.k, f), e2.k);
    return same(1) || same(-1);
  }

  /** Cramer's rule. Returns { kind: 'one', sol } | { kind: 'none' } | { kind: 'infinite' }. */
  function solve2(e1, e2, vars = varsOf(e1, e2)) {
    const [u, v] = vars;
    const a1 = coef(e1, u), b1 = coef(e1, v), a2 = coef(e2, u), b2 = coef(e2, v);
    const det = sub(mul(a1, b2), mul(a2, b1));
    if (isZero(det)) return { kind: equivalent(e1, e2) ? 'infinite' : 'none' };
    return {
      kind: 'one',
      sol: {
        [u]: div(sub(mul(e1.k, b2), mul(e2.k, b1)), det),
        [v]: div(sub(mul(a1, e2.k), mul(a2, e1.k)), det),
      },
    };
  }

  /* ---------- drawing an equation as text ----------
     A display is a list of terms on each side: [{ c: Q, v: 'x' }, { c: Q }]. The same
     equation can be shown many ways (y = 3 − x, x + y = 3, x + y − 3 = 0) and reading a
     line in an unfamiliar arrangement is half of what the worksheets drill. */

  function termsOut(terms, fmtQ, joinFirst = false) {
    const parts = [];
    terms.forEach((t, i) => {
      const c = R(t.c);
      if (isZero(c) && terms.length > 1) return;
      const neg_ = c.n < 0;
      const mag = abs(c);
      let body;
      if (t.v) {
        if (t.raw) body = t.raw;
        else body = (eq(mag, 1) ? '' : fmtQ(mag)) + t.v;
      } else {
        body = t.raw || fmtQ(mag);
      }
      if (parts.length === 0 && !joinFirst) parts.push((neg_ ? MINUS : '') + body);
      else parts.push((neg_ ? ' ' + MINUS + ' ' : ' + ') + body);
    });
    if (!parts.length) return '0';
    return parts.join('');
  }

  const sideText = (terms) => termsOut(terms, qText);
  const sideHTML = (terms) => termsOut(terms, qHTML);
  /** Story numbers: 2.25 and 0.3 read better as decimals than as 9/4 and 3/10. */
  const sideNice = (terms) => termsOut(terms, qNice);

  /** Render a display { L: terms, R: terms } as HTML (letters italicised by mathHTML). */
  const dispHTML = (d) => MathLab.mathHTML(sideHTML(d.L) + ' = ' + sideHTML(d.R));
  const dispText = (d) => sideText(d.L) + ' = ' + sideText(d.R);
  const dispNice = (d) => MathLab.mathHTML(sideNice(d.L) + ' = ' + sideNice(d.R));
  /** Money: 37.1 reads as 37.10. Whole numbers stay whole. */
  const qMoney = (q) => (isInt(q) ? qText(q) : (num(q) < 0 ? MINUS : '') + Math.abs(num(q)).toFixed(2));
  const dispMoney = (d) => MathLab.mathHTML(termsOut(d.L, qMoney) + ' = ' + termsOut(d.R, qMoney));

  /** a·x + b·y = k in the given letter order. */
  function layoutStd(e, order = varsOf(e)) {
    const L = order.filter((v) => !isZero(coef(e, v))).map((v) => ({ c: coef(e, v), v }));
    return { L: L.length ? L : [{ c: Q(0) }], R: [{ c: e.k }] };
  }

  /** a·x + b·y − k = 0 */
  function layoutZero(e, order = varsOf(e)) {
    const L = order.filter((v) => !isZero(coef(e, v))).map((v) => ({ c: coef(e, v), v }));
    if (!isZero(e.k)) L.push({ c: neg(e.k) });
    return { L, R: [{ c: Q(0) }] };
  }

  /** Solve for `v` and show v = (the rest), slope term first: y = mx + c. */
  function layoutFor(e, v = 'y', constFirst = false) {
    const cv = coef(e, v);
    if (isZero(cv)) return null;
    const rest = Object.keys(e.co).filter((u) => u !== v && !isZero(e.co[u]))
      .map((u) => ({ c: neg(div(e.co[u], cv)), v: u }));
    const k = { c: div(e.k, cv) };
    let R_ = constFirst ? [k, ...rest] : [...rest, k];
    if (rest.length && isZero(k.c)) R_ = rest;
    return { L: [{ c: Q(1), v }], R: R_ };
  }

  /** A straight line shown the way a textbook would: y = mx + c, or x = k when vertical. */
  function layoutLine(e) {
    if (isZero(coef(e, 'y'))) return layoutFor(e, 'x');
    return layoutFor(e, 'y');
  }

  const show = (e, how = 'std') => {
    const d = how === 'mc' ? layoutLine(e)
      : how === 'cm' ? (layoutFor(e, 'y', true) || layoutLine(e))
      : how === 'zero' ? layoutZero(e, ['x', 'y'].filter((v) => v in e.co).concat(varsOf(e).filter((v) => v !== 'x' && v !== 'y')))
      : layoutStd(e, ['x', 'y'].filter((v) => v in e.co).concat(varsOf(e).filter((v) => v !== 'x' && v !== 'y')));
    return dispHTML(d);
  };

  /* ================= reading what the kid types =================
     A small recursive-descent parser for linear expressions: 5x − 2(3 + x), x/2 + 1,
     1/2x, 0.25m. Anything non-linear (x·y, x²) is refused, not guessed at. */

  function tokenize(src) {
    const s = String(src).toLowerCase().replace(/[−–—]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/');
    const out = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const q = parseNumber(s.slice(i, j));
        if (!q) return null;
        out.push({ t: 'n', q });
        i = j;
        continue;
      }
      if (/[a-z]/.test(ch)) { out.push({ t: 'v', v: ch }); i++; continue; }
      if ('+-*/()='.includes(ch)) { out.push({ t: ch }); i++; continue; }
      return null;
    }
    return out;
  }

  const linConst = (q) => ({ co: {}, k: R(q) });
  const linVar = (v) => ({ co: { [v]: Q(1) }, k: Q(0) });
  const isConst = (L) => Object.values(L.co).every(isZero);
  function linAdd(A, B, f = 1) {
    const co = { ...A.co };
    for (const v of Object.keys(B.co)) co[v] = add(co[v] || Q(0), mul(B.co[v], f));
    return { co, k: add(A.k, mul(B.k, f)) };
  }
  function linScale(A, f) {
    const co = {};
    for (const v of Object.keys(A.co)) co[v] = mul(A.co[v], f);
    return { co, k: mul(A.k, f) };
  }

  function parseExpr(tokens) {
    let i = 0;
    const peek = () => tokens[i];
    const take = () => tokens[i++];

    function expr() {
      let sgn = 1;
      while (peek() && (peek().t === '+' || peek().t === '-')) { if (take().t === '-') sgn = -sgn; }
      let acc = term();
      if (!acc) return null;
      acc = linScale(acc, sgn);
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        let s = take().t === '-' ? -1 : 1;
        while (peek() && (peek().t === '+' || peek().t === '-')) { if (take().t === '-') s = -s; }
        const t = term();
        if (!t) return null;
        acc = linAdd(acc, t, s);
      }
      return acc;
    }

    function term() {
      let acc = factor();
      if (!acc) return null;
      for (;;) {
        const p = peek();
        if (!p) break;
        if (p.t === '*') { take(); const f = factor(); if (!f) return null; acc = times(acc, f); if (!acc) return null; continue; }
        if (p.t === '/') {
          take();
          const f = factor();
          if (!f || !isConst(f) || isZero(f.k)) return null;
          acc = linScale(acc, div(1, f.k));
          continue;
        }
        if (p.t === 'n' || p.t === 'v' || p.t === '(') {   // implicit multiplication: 2x, 2(x+1), x(3)
          const f = factor();
          if (!f) return null;
          acc = times(acc, f);
          if (!acc) return null;
          continue;
        }
        break;
      }
      return acc;
    }

    function times(A, B) {
      if (isConst(A)) return linScale(B, A.k);
      if (isConst(B)) return linScale(A, B.k);
      return null;                                         // x·y is not linear
    }

    function factor() {
      const p = take();
      if (!p) return null;
      if (p.t === 'n') return linConst(p.q);
      if (p.t === 'v') return linVar(p.v);
      if (p.t === '-') { const f = factor(); return f && linScale(f, -1); }
      if (p.t === '+') return factor();
      if (p.t === '(') {
        const inner = expr();
        if (!inner || !peek() || take().t !== ')') return null;
        return inner;
      }
      return null;
    }

    const out = expr();
    return out && i === tokens.length ? out : null;
  }

  /** "5x − 2(3 + x)" -> { co, k } as an expression (k is the constant part). */
  function parseLinear(src) {
    const toks = tokenize(src);
    if (!toks || !toks.length || toks.some((t) => t.t === '=')) return null;
    return parseExpr(toks);
  }

  /** "5x − 2(3 + x) = 0" -> equation { co, k } with everything collected. */
  function parseEquation(src) {
    const toks = tokenize(src);
    if (!toks) return null;
    const at = toks.findIndex((t) => t.t === '=');
    if (at <= 0 || at === toks.length - 1 || toks.slice(at + 1).some((t) => t.t === '=')) return null;
    const L = parseExpr(toks.slice(0, at));
    const Rr = parseExpr(toks.slice(at + 1));
    if (!L || !Rr) return null;
    const diff = linAdd(L, Rr, -1);
    return tidy({ co: diff.co, k: neg(diff.k) });
  }

  /* ================= lines =================
     A straight line is an equation in x and y. Gradient and intercepts are read off it. */

  const lineMC = (m, c) => {
    m = R(m); c = R(c);
    const L = lcm(m.d, c.d);
    return E({ x: Q(m.n * (L / m.d)), y: Q(-L) }, Q(-c.n * (L / c.d)));
  };
  const vertical = (k) => E({ x: 1, y: 0 }, k);
  const horizontal = (k) => E({ x: 0, y: 1 }, k);

  /** Integer, reduced, x-coefficient positive — one name per line, for comparing. */
  function normal(e) {
    const vs = ['x', 'y'];
    const all = [...vs.map((v) => coef(e, v)), e.k];
    const L = all.reduce((acc, q) => lcm(acc, q.d), 1);
    let ints = all.map((q) => q.n * (L / q.d));
    const g = ints.reduce((acc, n) => gcd(acc, n), 0) || 1;
    ints = ints.map((n) => n / g);
    const lead = ints.find((n) => n !== 0) || 1;
    if (lead < 0) ints = ints.map((n) => -n || 0);
    return std(ints[0], ints[1], ints[2]);
  }

  const gradient = (e) => (isZero(coef(e, 'y')) ? null : neg(div(coef(e, 'x'), coef(e, 'y'))));
  const yIntercept = (e) => (isZero(coef(e, 'y')) ? null : div(e.k, coef(e, 'y')));
  const xIntercept = (e) => (isZero(coef(e, 'x')) ? null : div(e.k, coef(e, 'x')));
  const sameLine = (a, b) => equivalent(a, b);

  /** Gradients a 13-year-old meets: whole, and the friendly fractions. */
  const SLOPES = {
    whole: [1, 2, 3, -1, -2, -3, 4, -4].map((n) => Q(n)),
    frac: [[1, 2], [-1, 2], [1, 3], [-1, 3], [2, 3], [-2, 3], [3, 2], [-3, 2], [1, 4], [-1, 4],
           [3, 4], [-3, 4], [5, 2], [-5, 2], [5, 3], [-5, 3], [1, 5], [2, 5]].map(([a, b]) => Q(a, b)),
  };

  /**
   * y = mx + c with a second whole-number point still on a ±R grid, so the kid can plot it.
   * The slope's denominator is the run, so the next grid point is (q, c + p).
   */
  function mcLine({ frac = false, R: Rg = 6, m: forceM, cRange = 4 } = {}) {
    const m = forceM !== undefined ? R(forceM) : pick(frac ? SLOPES.frac : SLOPES.whole);
    const room = Math.max(0, Math.min(cRange, Rg - Math.abs(m.n)));
    const c = rnd(-room, room);
    return { eq: lineMC(m, c), m, c: Q(c) };
  }

  /** Line through two whole-number intercepts: (p, 0) and (0, q). */
  function interceptLine({ R: Rg = 6 } = {}) {
    const p = rndNonZero(-Rg, Rg);
    const q = rndNonZero(-Rg, Rg);
    return { eq: normal(std(q, p, p * q)), xInt: Q(p), yInt: Q(q) };
  }

  /* ================= pairs of equations =================
     Every pair is built backwards: choose the crossing point, then lines through it. */

  /** Two lines through a whole-number point, both with a visible whole-number intercept. */
  function graphPair({ R: Rg = 6, frac = false, range = 4, offAxis = true } = {}) {
    const pool = frac ? [...SLOPES.whole, ...SLOPES.frac] : SLOPES.whole.concat([Q(1, 2), Q(-1, 2)]);
    const points = [];
    // a crossing ON an axis is also an intercept — it blurs exactly the distinction being taught
    for (let x = -range; x <= range; x++) for (let y = -range; y <= range; y++) {
      if (offAxis && (x === 0 || y === 0)) continue;
      points.push([x, y]);
    }
    for (const [x0, y0] of shuffle(points)) {
      const ok = pool.filter((m) => {
        const c = sub(y0, mul(m, x0));
        return isInt(c) && Math.abs(c.n) <= Rg - 1;
      });
      if (ok.length < 2) continue;
      const [m1, m2] = shuffle(ok.slice()).slice(0, 2);
      if (eq(m1, m2)) continue;
      return {
        e1: lineMC(m1, sub(y0, mul(m1, x0))),
        e2: lineMC(m2, sub(y0, mul(m2, x0))),
        sol: { x: Q(x0), y: Q(y0) },
      };
    }
    throw new Error('graphPair: no point fits');
  }

  /**
   * a1·x + b1·y = k1, a2·x + b2·y = k2 through (x0, y0), shaped for elimination.
   *   match  — one letter already has equal or opposite coefficients
   *   one    — one equation needs multiplying
   *   both   — both need multiplying (3 and 4, say)
   */
  function elimPair({ shape = pick(['match', 'one', 'both']), range = 7, maxCo = 7 } = {}) {
    // never 0: multiplying by 0 hides exactly the mistakes the traps are there to show
    const x0 = rndNonZero(-range, range);
    const y0 = rndNonZero(-range, range);
    const target = pick(['x', 'y']);
    const other = target === 'x' ? 'y' : 'x';

    let s1, s2;
    if (shape === 'match') { s1 = rnd(1, 6); s2 = pick([s1, -s1]); }
    else if (shape === 'one') { s1 = rnd(1, 3); s2 = s1 * rnd(2, 3) * pick([1, -1]); }
    else {
      const pairs = [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [3, 2], [5, 3], [4, 3], [5, 2]];
      [s1, s2] = pick(pairs);
      s2 *= pick([1, -1]);
    }
    if (Math.random() < 0.5) [s1, s2] = [s2, s1];

    // the other coefficients: anything non-zero that keeps the two lines from being parallel
    const options = [];
    for (let o1 = -maxCo; o1 <= maxCo; o1++) for (let o2 = -maxCo; o2 <= maxCo; o2++) {
      if (!o1 || !o2) continue;
      if (s1 * o2 - s2 * o1 === 0) continue;
      if (Math.abs(o1) === Math.abs(s1) && Math.abs(o2) === Math.abs(s2)) continue;   // nothing to choose between
      options.push([o1, o2]);
    }
    const [o1, o2] = pick(options);
    const mk = (s, o) => E({ [target]: s, [other]: o }, s * (target === 'x' ? x0 : y0) + o * (target === 'x' ? y0 : x0));
    return { e1: mk(s1, o1), e2: mk(s2, o2), sol: { x: Q(x0), y: Q(y0) }, target };
  }

  /** y = mx + c (or x = my + c) and a general line, through a whole-number point. */
  function subPair({ range = 6, solved = pick(['y', 'y', 'x']) } = {}) {
    const free = solved === 'y' ? 'x' : 'y';
    const p0 = { x: rndNonZero(-range, range), y: rndNonZero(-range, range) };
    if (p0.x === p0.y) p0.y = p0.y > 0 ? -p0.y : p0.y - 1;   // x = y makes a wrong-letter swap look right
    const m = rndNonZero(-4, 4);
    const c = p0[solved] - m * p0[free];
    if (c === 0) return subPair({ range, solved });
    const eS = E({ [solved]: 1, [free]: -m }, c);       // solved = m·free + c
    const opts = [];
    for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) {
      if (!a || !b) continue;
      const aF = solved === 'y' ? a : b;                  // coefficient on the free letter
      const aS = solved === 'y' ? b : a;                  // coefficient on the solved letter
      if (aF + aS * m === 0) continue;                    // would be parallel
      opts.push([a, b]);
    }
    const [a, b] = pick(opts);
    const eO = E({ x: a, y: b }, a * p0.x + b * p0.y);
    return { eS, eO, solved, free, m: Q(m), c: Q(c), sol: { x: Q(p0.x), y: Q(p0.y) } };
  }

  /** Two parallel lines (no solution) or one line written twice (infinitely many). */
  function specialPair(kind = pick(['none', 'infinite'])) {
    const m = pick([...SLOPES.whole, Q(1, 2), Q(-1, 2), Q(2, 3), Q(-3, 2)]);
    const c1 = rnd(-5, 5);
    const e1 = lineMC(m, c1);
    if (kind === 'none') {
      let c2 = rnd(-5, 5);
      if (c2 === c1) c2 = c1 + pick([-3, -2, 2, 3]);
      return { kind, e1, e2: scale(normal(lineMC(m, c2)), pick([1, 1, 2, -1])) };
    }
    return { kind, e1, e2: scale(normal(e1), pick([2, 3, -2, -1])) };
  }

  /* ================= step scripts =================
     Solving a pair, broken into the decisions a student makes. Each step offers the right
     line next to the lines the classic mistakes produce, so she has to look at the wrong
     one and turn it down. A trap that happens to equal the right answer is dropped — it
     would mark a correct line wrong. */

  /** Build the options for one step: one right answer plus distinct, genuinely wrong traps. */
  function choices(right, traps, same) {
    const out = [{ ...right, ok: true }];
    for (const t of traps) {
      if (out.length >= 4) break;                         // one right answer and three traps is plenty on a phone
      if (!t || !t.value) continue;
      if (same(t.value, right.value)) continue;
      if (out.some((o) => same(o.value, t.value))) continue;
      out.push({ ...t, ok: false });
    }
    return out;
  }

  const sameEq = (a, b) => identical(tidy(a), tidy(b));
  const sameQ = (a, b) => eq(a, b);

  /** Display terms for c1·u + c2·v = k with a substituted value shown in brackets. */
  const T = (c, v, raw) => ({ c: R(c), v, raw });

  /** Options for "solve a·v = k": the right value and the three classic slips. */
  function valueStep(a, v, k, extra = {}) {
    const right = div(k, a);
    const traps = [
      { value: neg(right), trap: 'value-sign', why: 'Check the sign. A negative divided by a positive is negative; two negatives make a positive.' },
      isZero(k) ? null : { value: div(a, k), trap: 'value-upside-down', why: 'Upside down: to undo × ' + qText(a) + ', divide the other side by ' + qText(a) + '.' },
      { value: sub(k, a), trap: 'value-subtract', why: qText(a) + v + ' means ' + qText(a) + ' × ' + v + '. Undo a multiply with a divide, not a subtract.' },
    ];
    return {
      kind: 'value',
      v,
      prompt: extra.prompt || 'So ' + v + ' = ?',
      context: extra.context || MathLab.mathHTML(sideHTML([T(a, v)]) + ' = ' + qHTML(k)),
      answer: right,
      options: choices({ value: right }, traps, sameQ),
    };
  }

  /**
   * Elimination script for a pair in a·x + b·y = k form.
   * Returns { method, sol, steps } — each step is shown, chosen (or typed), then written
   * into the working.
   */
  function eliminationScript(e1, e2, target) {
    const [u, w] = target === 'x' ? ['x', 'y'] : ['y', 'x'];   // u disappears, w is solved first
    const s1 = coef(e1, u), s2 = coef(e2, u);
    const L = lcm(Math.abs(s1.n), Math.abs(s2.n));
    const f1 = Q(L / Math.abs(s1.n)), f2 = Q(L / Math.abs(s2.n));
    const steps = [];
    const order = ['x', 'y'];

    let A = e1, B = e2;
    const scaleTraps = (e, f) => [
      { value: E(scale(e, f).co, e.k), trap: 'scale-not-rhs', why: 'Every term gets multiplied — the number on the right too.' },
      { value: E({ ...e.co, [order[0]]: mul(coef(e, order[0]), f) }, e.k), trap: 'scale-first-only', why: 'Multiply the whole line, not just the first term.' },
      { value: E({ ...scale(e, f).co }, mul(e.k, add(f, 1))), trap: 'scale-arith', why: 'Check the right-hand side: ' + qText(e.k) + ' × ' + qText(f) + ' = ' + qText(mul(e.k, f)) + '.' },
    ];
    for (const [idx, e, f] of [[1, e1, f1], [2, e2, f2]]) {
      if (eq(f, 1)) continue;
      const right = scale(e, f);
      steps.push({
        kind: 'eq',
        prompt: 'Multiply equation ' + (idx === 1 ? '①' : '②') + ' by ' + qText(f) + ' so the ' + u + '-terms match. What does it become?',
        tag: (idx === 1 ? '①' : '②') + ' × ' + qText(f),
        answer: right,
        mustMatch: { [u]: coef(right, u) },
        options: choices({ value: right }, scaleTraps(e, f), sameEq),
        layout: (x) => layoutStd(x, order),
      });
      if (idx === 1) A = right; else B = right;
    }

    // add or subtract?
    const same = sign(coef(A, u)) === sign(coef(B, u));
    steps.push({
      kind: 'pick',
      prompt: 'The ' + u + '-terms are ' + MathLab.mathHTML(sideHTML([T(coef(A, u), u)])) + ' and ' +
        MathLab.mathHTML(sideHTML([T(coef(B, u), u)])) + '. Add the equations or subtract them?',
      options: [
        { value: 'add', label: 'Add them', ok: !same, trap: 'add-vs-subtract',
          why: 'Adding ' + qText(coef(A, u)) + u + ' and ' + qText(coef(B, u)) + u + ' gives ' + qText(add(coef(A, u), coef(B, u))) + u + ' — nothing disappears. Same signs: subtract.' },
        { value: 'sub', label: 'Subtract them', ok: same, trap: 'add-vs-subtract',
          why: 'Subtracting gives ' + qText(sub(coef(A, u), coef(B, u))) + u + ' — nothing disappears. Opposite signs: add.' },
      ],
    });

    const C = same ? subEq(A, B) : addEq(A, B);
    const one = tidy(C);
    const traps = [];
    if (same) {
      traps.push({ value: tidy(E({ [w]: sub(coef(A, w), coef(B, w)) }, add(A.k, B.k))), trap: 'subtract-rhs',
        why: 'Subtract the right-hand sides too: ' + qText(A.k) + ' − (' + qText(B.k) + ').' });
      traps.push({ value: tidy(E({ [w]: add(coef(A, w), coef(B, w)) }, C.k)), trap: 'subtract-negative',
        why: 'Taking away ' + qText(coef(B, w)) + w + ' changes its sign: ' + qText(coef(A, w)) + w + ' − (' + qText(coef(B, w)) + w + ').' });
    } else {
      traps.push({ value: tidy(E({ [w]: add(coef(A, w), coef(B, w)) }, sub(A.k, B.k))), trap: 'add-rhs',
        why: 'You are adding the equations, so add the right-hand sides too.' });
    }
    traps.push({ value: tidy(E({ [w]: neg(coef(C, w)) }, C.k)), trap: 'collect-flip',
      why: 'Check the sign of the ' + w + '-term: ' + qText(coef(A, w)) + w + (same ? ' − (' : ' + (') + qText(coef(B, w)) + w + ').' });
    // the −4y + y = −5y slip: magnitudes added, sign of the first kept
    const aw = coef(A, w), bw = same ? neg(coef(B, w)) : coef(B, w);
    if (sign(aw) !== sign(bw) && !isZero(bw)) {
      const slip = Q(sign(aw) * (Math.abs(num(aw)) + Math.abs(num(bw))) * aw.d * bw.d, aw.d * bw.d);
      traps.push({ value: tidy(E({ [w]: slip }, C.k)), trap: 'collect-sign',
        why: 'Walk it on a number line: start at ' + qText(aw) + ', move ' + qText(bw) + '. One sign is up, the other is down.' });
    }
    steps.push({
      kind: 'eq',
      prompt: (same ? 'Subtract ② from ①' : 'Add ① and ②') + '. What is left?',
      tag: same ? '① − ②' : '① + ②',
      answer: one,
      mustMatch: { [u]: Q(0) },
      options: choices({ value: one }, traps, sameEq),
      layout: (x) => layoutStd(x, order),
    });

    steps.push(valueStep(coef(one, w), w, one.k));
    const wVal = div(one.k, coef(one, w));

    // back-substitute into whichever original equation is simpler
    const backEq = Math.abs(num(coef(e1, u))) <= Math.abs(num(coef(e2, u))) ? e1 : e2;
    const backTag = backEq === e1 ? '①' : '②';
    steps.push(...backSteps(backEq, backTag, w, wVal, u));

    return { method: 'elimination', target: u, steps, sol: { [w]: wVal, [u]: div(sub(backEq.k, mul(coef(backEq, w), wVal)), coef(backEq, u)) } };
  }

  /** Put a known value back into an equation, then solve for the other letter. */
  function backSteps(e, tag, known, val, unknown) {
    const cK = coef(e, known), cU = coef(e, unknown);
    const prod = mul(cK, val);
    const shown = (p) => [T(p), T(cU, unknown)];
    const right = { value: prod };
    const traps = [
      { value: val, trap: 'sub-coefficient', why: qText(cK) + known + ' means ' + qText(cK) + ' × ' + known + '. Multiply: ' + qText(cK) + ' × ' + qText(val) + '.' },
      { value: neg(prod), trap: 'sub-sign', why: qText(cK) + ' × ' + qText(val) + ': check the sign of the product.' },
    ];
    const s1 = {
      kind: 'line',
      prompt: 'Put ' + known + ' = ' + qText(val) + ' into ' + tag + '. Which line do you get?',
      tag: known + ' = ' + qText(val) + ' in ' + tag,
      answer: E({ [unknown]: cU }, sub(e.k, prod)),
      mustMatch: { [unknown]: cU },
      options: choices(right, traps, sameQ).map((o) => ({ ...o, disp: { L: shown(o.value), R: [T(e.k)] } })),
      dispRight: { L: shown(prod), R: [T(e.k)] },
    };
    const rest = sub(e.k, prod);
    const s2 = valueStep(cU, unknown, rest, {
      context: MathLab.mathHTML(sideHTML(shown(prod)) + ' = ' + qHTML(e.k)),
    });
    // the extra slip here: moving the number across without changing its sign
    s2.options = choices({ value: div(rest, cU) }, [
      { value: div(add(e.k, prod), cU), trap: 'move-sign', why: 'Moving ' + qText(prod) + ' to the other side changes its sign.' },
      ...s2.options.filter((o) => !o.ok),
    ], sameQ);
    return [s1, s2];
  }

  /**
   * Substitution script: eS is "solved = m·free + c", eO is the other line.
   * The steps are exactly where the worksheet errors live: the bracket, the sign in front
   * of it, and collecting like terms with different signs.
   */
  function substitutionScript(eS, eO, solved, free) {
    const m = neg(coef(eS, free));                        // solved = m·free + c
    const c = eS.k;
    const a = coef(eO, free), b = coef(eO, solved);       // a·free + b·solved = k
    const k = eO.k;
    const steps = [];
    const bracket = sideText([T(m, free), T(c)]);
    const bracketHTML = MathLab.mathHTML(sideHTML([T(m, free), T(c)]));
    const order = ['x', 'y'];
    const freeFirst = order.indexOf(free) < order.indexOf(solved);

    // 1. substitute — keep the bracket
    const sub1 = (L) => ({ L, R: [T(k)] });
    const withBracket = freeFirst
      ? sub1([T(a, free), { c: b, v: '(' + bracket + ')', raw: (eq(abs(b), 1) ? '' : qText(abs(b))) + '(' + bracketHTML + ')' }])
      : sub1([{ c: b, v: '(' + bracket + ')', raw: (eq(abs(b), 1) ? '' : qText(abs(b))) + '(' + bracketHTML + ')' }, T(a, free)]);
    const noBracket = freeFirst
      ? sub1([T(a, free), T(mul(b, m), free), T(c)])
      : sub1([T(mul(b, m), free), T(c), T(a, free)]);
    const wrongLetter = { L: [{ c: a, v: '(' + bracket + ')', raw: (eq(abs(a), 1) ? '' : qText(abs(a))) + '(' + bracketHTML + ')' }, T(b, solved)], R: [T(k)] };
    steps.push({
      kind: 'show',
      prompt: 'Swap ' + solved + ' in ② for what it equals in ①. Which line is that?',
      tag: 'put ① into ②',
      options: [
        { disp: withBracket, ok: true },
        // with 1 in front, dropping the bracket changes nothing — so it is no mistake there
        eq(b, 1) ? null : { disp: noBracket, ok: false, trap: 'sub-no-bracket', why: 'Keep the bracket: ' + qText(b) + ' multiplies all of (' + bracket + '), not just the first part.' },
        { disp: wrongLetter, ok: false, trap: 'sub-wrong-letter', why: 'You swap out ' + solved + ' — the letter ① tells you about — not ' + free + '.' },
      ].filter(Boolean),
      answer: tidy(E({ [free]: add(a, mul(b, m)) }, sub(k, mul(b, c)))),
      written: withBracket,
    });

    // 2. expand
    const bm = mul(b, m), bc = mul(b, c);
    const expRight = freeFirst ? [T(a, free), T(bm, free), T(bc)] : [T(bm, free), T(bc), T(a, free)];
    const expTraps = [
      { L: freeFirst ? [T(a, free), T(bm, free), T(neg(bc))] : [T(bm, free), T(neg(bc)), T(a, free)], trap: 'expand-sign',
        why: qText(b) + ' × ' + qText(c) + ' = ' + qText(bc) + '. The sign in front of the bracket multiplies every term.' },
      { L: freeFirst ? [T(a, free), T(bm, free), T(c)] : [T(bm, free), T(c), T(a, free)], trap: 'expand-first-only',
        why: 'Multiply both terms in the bracket: ' + qText(b) + ' × ' + qText(c) + ' too.' },
      { L: freeFirst ? [T(a, free), T(m, free), T(bc)] : [T(m, free), T(bc), T(a, free)], trap: 'expand-skip-term',
        why: qText(b) + ' multiplies the ' + free + '-term too: ' + qText(b) + ' × ' + qText(m) + free + ' = ' + qText(bm) + free + '.' },
    ];
    // keep only traps that differ from the right line AND from each other
    const sig = (terms) => terms.map((t) => qText(t.c) + (t.v || '')).join(',');
    const seenExp = new Set([sig(expRight)]);
    const expKeep = expTraps.filter((t) => { const k = sig(t.L); if (seenExp.has(k)) return false; seenExp.add(k); return true; });
    steps.push({
      kind: 'show',
      prompt: 'Open the bracket. What do you get?',
      tag: 'open the bracket',
      options: [{ disp: { L: expRight, R: [T(k)] }, ok: true },
        ...expKeep.map((t) => ({ disp: { L: t.L, R: [T(k)] }, ok: false, trap: t.trap, why: t.why }))],
      answer: tidy(E({ [free]: add(a, bm) }, sub(k, bc))),
      written: { L: expRight, R: [T(k)] },
    });

    // 3. collect the like terms
    const tot = add(a, bm);
    const colTraps = [];
    if (sign(a) !== sign(bm)) {
      const first = freeFirst ? a : bm;
      const slip = Q(sign(first) * (Math.abs(num(a)) + Math.abs(num(bm))) * a.d * bm.d, a.d * bm.d);
      colTraps.push({ c: slip, trap: 'collect-sign', why: 'Walk it on a number line: start at ' + qText(freeFirst ? a : bm) + ', then move ' + qText(freeFirst ? bm : a) + '.' });
    }
    colTraps.push({ c: neg(tot), trap: 'collect-flip', why: qText(freeFirst ? a : bm) + ' and ' + qText(freeFirst ? bm : a) + ' together make ' + qText(tot) + '. Check the sign.' });
    colTraps.push({ c: mul(a, bm), trap: 'collect-multiply', why: 'Like terms are added, not multiplied: ' + qText(a) + ' + (' + qText(bm) + ').' });
    const colRight = [T(tot, free), T(bc)];
    const colOpts = [{ disp: { L: colRight, R: [T(k)] }, ok: true }];
    for (const t of colTraps) {
      if (eq(t.c, tot) || colOpts.some((o) => eq(o.disp.L[0].c, t.c))) continue;
      colOpts.push({ disp: { L: [T(t.c, free), T(bc)], R: [T(k)] }, ok: false, trap: t.trap, why: t.why });
    }
    steps.push({ kind: 'show', prompt: 'Collect the ' + free + '-terms.', tag: 'collect', options: colOpts,
      answer: tidy(E({ [free]: tot }, sub(k, bc))), written: { L: colRight, R: [T(k)] } });

    // 4. move the number across
    const rhs = sub(k, bc);
    const moveOpts = [{ disp: { L: [T(tot, free)], R: [T(rhs)] }, ok: true }];
    if (!isZero(bc)) {
      moveOpts.push({ disp: { L: [T(tot, free)], R: [T(add(k, bc))] }, ok: false, trap: 'move-sign',
        why: 'Moving ' + qText(bc) + ' to the other side changes its sign: ' + qText(k) + ' − (' + qText(bc) + ').' });
      steps.push({ kind: 'show', prompt: 'Get the number on its own side.', tag: 'move the number', options: moveOpts,
        answer: E({ [free]: tot }, rhs), written: { L: [T(tot, free)], R: [T(rhs)] } });
    }

    steps.push(valueStep(tot, free, rhs));
    const fVal = div(rhs, tot);

    // 5. back into ①
    const sVal = add(mul(m, fVal), c);
    const prod = mul(m, fVal);
    steps.push({
      kind: 'value',
      v: solved,
      prompt: 'Now put ' + free + ' = ' + qText(fVal) + ' back into ①. So ' + solved + ' = ?',
      showContext: true,
      context: MathLab.mathHTML(solved + ' = ' + sideHTML([{ c: m, v: '(' + qText(fVal) + ')', raw: (eq(abs(m), 1) ? '' : qText(abs(m))) + '(' + qHTML(fVal) + ')' }, T(c)])),
      answer: sVal,
      options: choices({ value: sVal }, [
        { value: add(neg(prod), c), trap: 'sub-sign', why: qText(m) + ' × ' + qText(fVal) + ' = ' + qText(prod) + '. Check the sign of the product.' },
        { value: add(fVal, c), trap: 'sub-coefficient', why: qText(m) + free + ' means ' + qText(m) + ' × ' + free + ' — multiply first.' },
        { value: sub(prod, c), trap: 'value-sign', why: 'Then add ' + qText(c) + ': ' + qText(prod) + ' + (' + qText(c) + ').' },
      ], sameQ),
    });

    return { method: 'substitution', steps, sol: { [free]: fVal, [solved]: sVal } };
  }

  /**
   * Give every option and every step its HTML, whatever kind it is, so an app renders one
   * shape: step.options[i].html, step.writtenHTML (what goes into the working once done).
   */
  function present(step) {
    const opts = step.options.map((o) => {
      let html;
      if (step.kind === 'pick') html = o.label;
      else if (step.kind === 'value') html = MathLab.mathHTML(step.v) + ' = ' + qHTML(o.value);
      else if (o.disp) html = dispHTML(o.disp);
      else html = dispHTML(step.layout(o.value));
      return { ...o, html };
    });
    let writtenHTML = '';
    if (step.kind === 'value') writtenHTML = MathLab.mathHTML(step.v) + ' = ' + qHTML(step.answer);
    else if (step.kind === 'eq') writtenHTML = dispHTML(step.layout(step.answer));
    else if (step.kind === 'line') writtenHTML = dispHTML(step.dispRight);
    else if (step.kind === 'show') writtenHTML = dispHTML(step.written);
    return { ...step, options: opts, writtenHTML };
  }

  /**
   * "① 2(3) + 4(−1) = 2 ✓" — the pair put into the equation, both sides worked out.
   * Seeing LHS and RHS as two numbers that match is what "=" means; a solution is the
   * pair that makes BOTH come out equal.
   */
  function checkHTML(e, sol, order = varsOf(e), tag = '', fmt = qNice) {
    const parts = [];
    order.forEach((v) => {
      const c = coef(e, v);
      if (isZero(c)) return;
      const val = sol[v];
      const mag = abs(c);
      const body = (eq(mag, 1) ? '' : fmt(mag)) + '(' + fmt(val) + ')';
      parts.push((parts.length ? (c.n < 0 ? ' ' + MINUS + ' ' : ' + ') : (c.n < 0 ? MINUS : '')) + body);
    });
    const lhs = lhsAt(e, sol);
    const ok = eq(lhs, e.k);
    return '<div class="' + (ok ? 'ok' : 'no') + '">' + (tag ? tag + ' &nbsp;' : '') + parts.join('') + ' = ' + fmt(lhs) +
      (ok ? ' ✓' : ' — but it should be ' + fmt(e.k) + ' ✗') + '</div>';
  }

  /** The same check, but in the arrangement the kid saw: "837.10 = 60 + 40.90(19) = 837.10 ✓". */
  function checkDispHTML(d, sol, tag = '', fmt = qNice) {
    const side = (terms) => {
      let val = Q(0);
      const parts = [];
      terms.forEach((t) => {
        const c = R(t.c);
        if (isZero(c) && terms.length > 1) return;
        const v = t.v && sol[t.v];
        const mag = abs(c);
        const body = v ? (eq(mag, 1) ? '' : fmt(mag)) + (eq(mag, 1) ? fmt(v) : '(' + fmt(v) + ')') : fmt(mag);
        parts.push((parts.length ? (c.n < 0 ? ' ' + MINUS + ' ' : ' + ') : (c.n < 0 ? MINUS : '')) + body);
        val = add(val, v ? mul(c, v) : c);
      });
      const lone = terms.length === 1 && eq(R(terms[0].c), 1) && terms[0].v;
      return { text: parts.join(''), val, lone, konst: terms.every((t) => !t.v) };
    };
    const l = side(d.L), r = side(d.R);
    const ok = eq(l.val, r.val);
    // c = 646 · 34(19) = 646 · 12 — each side read the way it is written
    const show = (sd, terms) => (sd.konst ? fmt(sd.val) : sd.lone ? terms[0].v + ' = ' + fmt(sd.val) : sd.text + ' = ' + fmt(sd.val));
    return '<div class="' + (ok ? 'ok' : 'no') + '">' + (tag ? tag + ' &nbsp;' : '') + show(l, d.L) + (ok ? ', and ' : ', but ') + show(r, d.R) + (ok ? ' ✓' : ' ✗') + '</div>';
  }

  const sumC = (terms) => terms.reduce((acc, t) => add(acc, t.c), Q(0));

  return {
    gcd, lcm, Q, add, sub, mul, div, neg, eq, isZero, isInt, num, abs, sign,
    parseNumber, qText, qHTML, qNice, money, fracHTML, MINUS,
    E, std, coef, scale, addEq, subEq, tidy, satisfies, lhsAt, equivalent, identical, solve2, varsOf,
    layoutStd, layoutZero, layoutFor, layoutLine, dispHTML, dispText, dispNice, dispMoney, qMoney, sideHTML, sideText, sideNice, show, T,
    parseLinear, parseEquation,
    lineMC, vertical, horizontal, normal, gradient, yIntercept, xIntercept, sameLine, SLOPES,
    mcLine, interceptLine, graphPair, elimPair, subPair, specialPair,
    eliminationScript, substitutionScript, choices, present, checkHTML, checkDispHTML,
  };
})();
