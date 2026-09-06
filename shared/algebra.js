/**
 * algebra.js — the transformation engine behind Step Builder.
 *
 * An expression is a flat list of ITEMS that are added together. An item is one of:
 *
 *   { k: 't', c, v }                  a term:              -3x²y
 *   { k: 'm', fs: [term, ...] }       terms multiplied:    x² · x³
 *   { k: 'd', a, b }                  terms divided:       x⁵ ÷ x²
 *   { k: 'e', base, n }               a power of a power:  (x³)²
 *   { k: 'b', m, ts: [term] }         a bracket:           3x(2x + 3)
 *   { k: 'p', m, a: [], b: [] }       two brackets:        2(x + 3)(x - 1)
 *   { k: 'f', num: [item], den: [item] }   a fraction
 *   { k: 'x', op: '*' | '/', a, b }   two fractions multiplied or divided
 *
 * Every move is a pure function items -> { next, why }. Nothing mutates in place, so a
 * refused move cannot half-apply and corrupt the line.
 */

const Algebra = (() => {
  const { formatTerm, formatSum, signature } = MathLab;

  /* ================= term arithmetic ================= */

  const T = (c, v = {}) => ({ k: 't', c, v });

  const cloneVars = (v) => ({ ...v });
  const cloneTerm = (t) => ({ k: 't', c: t.c, v: cloneVars(t.v) });

  function cloneItem(it) {
    switch (it.k) {
      case 't': return cloneTerm(it);
      case 'm': return { k: 'm', fs: it.fs.map(cloneTerm) };
      case 'd': return { k: 'd', a: cloneTerm(it.a), b: cloneTerm(it.b) };
      case 'e': return { k: 'e', base: cloneTerm(it.base), n: it.n };
      case 'b': return { k: 'b', m: cloneTerm(it.m), ts: it.ts.map(cloneTerm) };
      case 'p': return { k: 'p', m: cloneTerm(it.m), a: it.a.map(cloneTerm), b: it.b.map(cloneTerm) };
      case 'f': return { k: 'f', num: it.num.map(cloneItem), den: it.den.map(cloneItem) };
      case 'x': return { k: 'x', op: it.op, a: cloneItem(it.a), b: cloneItem(it.b) };
      default: throw new Error('unknown item ' + it.k);
    }
  }

  const cloneAll = (items) => items.map(cloneItem);

  function mulTerm(a, b) {
    const v = cloneVars(a.v);
    for (const k of Object.keys(b.v)) {
      v[k] = (v[k] || 0) + b.v[k];
      if (v[k] === 0) delete v[k];
    }
    return T(a.c * b.c, v);
  }

  /** Divide two terms: coefficients divide, exponents subtract. */
  function divTerm(a, b) {
    const v = cloneVars(a.v);
    for (const k of Object.keys(b.v)) {
      v[k] = (v[k] || 0) - b.v[k];
      if (v[k] === 0) delete v[k];
    }
    return T(a.c / b.c, v);
  }

  /** Raise a term to a whole power: coefficient to the power, exponents multiplied. */
  function powTerm(t, n) {
    const v = {};
    for (const k of Object.keys(t.v)) v[k] = t.v[k] * n;
    return T(Math.pow(t.c, n), v);
  }

  const mulAll = (terms) => terms.reduce(mulTerm, T(1));
  const mulSums = (as, bs) => as.flatMap((a) => bs.map((b) => mulTerm(a, b)));
  const scale = (terms, m) => terms.map((t) => mulTerm(t, m));

  function collect(terms) {
    const out = [];
    const at = new Map();
    for (const t of terms) {
      const s = signature({ coeff: t.c, vars: t.v });
      if (at.has(s)) out[at.get(s)].c += t.c;
      else { at.set(s, out.length); out.push(cloneTerm(t)); }
    }
    return out.filter((t) => t.c !== 0);
  }

  const sig = (t) => signature({ coeff: t.c, vars: t.v });
  const isConst = (t) => Object.keys(t.v).length === 0;
  const isOne = (t) => isConst(t) && t.c === 1;

  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const gcdAll = (ns) => ns.reduce((g, n) => gcd(g, n), 0);
  const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

  const isSquareNumber = (n) => n > 0 && Number.isInteger(Math.sqrt(n));
  const isSquareTerm = (t) => isSquareNumber(t.c) && Object.values(t.v).every((p) => p % 2 === 0);
  const sqrtTerm = (t) => {
    const v = {};
    for (const k of Object.keys(t.v)) v[k] = t.v[k] / 2;
    return T(Math.sqrt(t.c), v);
  };

  /* ================= rendering ================= */

  const fmt = (t, lead) => formatTerm({ coeff: t.c, vars: t.v }, { leadingPlus: lead });
  const fmtSum = (ts) => formatSum(ts.map((t) => ({ coeff: t.c, vars: t.v })));

  function itemSign(it) {
    switch (it.k) {
      case 't': return Math.sign(it.c) || 1;
      case 'm': return Math.sign(it.fs.reduce((c, f) => c * f.c, 1)) || 1;
      case 'd': return Math.sign(it.a.c * it.b.c) || 1;
      case 'e': return it.n % 2 === 0 ? 1 : (Math.sign(it.base.c) || 1);
      case 'b':
      case 'p': return Math.sign(it.m.c) || 1;
      default: return 1;
    }
  }

  const mulPrefix = (m) => (isOne({ ...m, c: Math.abs(m.c) }) ? '' : fmt({ ...m, c: Math.abs(m.c) }, false));

  const frac = (num, den) =>
    '<span class="frac"><span class="num">' + num + '</span><span class="den">' + den + '</span></span>';

  function renderItemAbs(it) {
    switch (it.k) {
      case 't': return fmt({ ...it, c: Math.abs(it.c) }, false);
      case 'm': return it.fs.map((f, i) => fmt(i === 0 ? { ...f, c: Math.abs(f.c) } : f, false)).join(' · ');
      case 'd': return fmt({ ...it.a, c: Math.abs(it.a.c) }, false) + ' ÷ ' + fmt(it.b, false);
      case 'e': return '(' + fmt(it.base, false) + ')' + MathLab.sup(it.n);
      case 'b': return mulPrefix(it.m) + '(' + fmtSum(it.ts) + ')';
      case 'p': return mulPrefix(it.m) + (brKey(it.a) === brKey(it.b)
        ? '(' + fmtSum(it.a) + ')' + MathLab.sup(2)
        : '(' + fmtSum(it.a) + ')(' + fmtSum(it.b) + ')');
      case 'f': return frac(render(it.num), render(it.den));
      case 'x': return renderItemAbs(it.a) + (it.op === '*' ? ' × ' : ' ÷ ') + renderItemAbs(it.b);
      default: throw new Error('unknown item ' + it.k);
    }
  }

  /**
   * Render a sum of items, joining with explicit operators. (Spacing them with a regex
   * afterwards double-spaces anything already rendered, e.g. the "s + 2" inside a bracket.)
   */
  function render(items) {
    if (!items.length) return '0';
    return items
      .map((it, i) => {
        const neg = itemSign(it) < 0;
        const body = renderItemAbs(it);
        if (i === 0) return (neg ? '-' : '') + body;
        return (neg ? ' - ' : ' + ') + body;
      })
      .join('');
  }

  /* ================= inspection ================= */

  const find = (items, k) => items.findIndex((it) => it.k === k);
  const hasKind = (items, k) => find(items, k) !== -1;

  const theFraction = (items) => (items.length === 1 && items[0].k === 'f' ? items[0] : null);
  const fractionCount = (items) => items.filter((it) => it.k === 'f').length;

  function joinableIn(list) {
    const seen = new Set();
    for (const it of list) {
      if (it.k !== 't') continue;
      const s = sig(it);
      if (seen.has(s)) return true;
      seen.add(s);
    }
    return false;
  }

  const POWER_KINDS = ['m', 'd', 'e'];
  const hasPower = (items) => POWER_KINDS.some((k) => hasKind(items, k));

  /* ================= factorising ================= */

  function factorisation(terms) {
    if (!terms || terms.length < 2 || terms.some((t) => t.k !== 't')) return null;

    // 1 — a factor in every term. Tried after the square-minus-square test below,
    //     because 4x² - 36 must become (2x - 6)(2x + 6), not 4(x² - 9).
    const g = gcdAll(terms.map((t) => t.c));
    const shared = {};
    for (const k of Object.keys(terms[0].v)) {
      const least = Math.min(...terms.map((t) => t.v[k] || 0));
      if (least > 0) shared[k] = least;
    }
    if (g > 1 || Object.keys(shared).length) {
      // Take the sign out with the factor. Leaving it behind gives 2x(-x - 2), which a
      // teacher marks wrong — the chart wants -2x(x + 2).
      const signed = terms[0].c < 0 ? -g : g;
      const common = T(signed, shared);
      const inside = terms.map((t) => {
        const v = cloneVars(t.v);
        for (const k of Object.keys(shared)) {
          v[k] -= shared[k];
          if (v[k] === 0) delete v[k];
        }
        return T(t.c / signed, v);
      });
      return { kind: 'common', item: { k: 'b', m: common, ts: inside },
               why: 'Every term contains <b>' + fmt(common, false) + '</b>, so it comes out to the front.' };
    }

    // 2 — square minus square
    if (terms.length === 2 && isSquareTerm(terms[0]) && terms[1].c < 0 &&
        isSquareTerm({ ...terms[1], c: -terms[1].c })) {
      const A = sqrtTerm(terms[0]);
      const B = sqrtTerm({ ...terms[1], c: -terms[1].c });
      return { kind: 'dots', item: { k: 'p', m: T(1), a: [A, B], b: [A, T(-B.c, B.v)] },
               why: 'A square minus a square is always (first + second)(first − second).' };
    }

    // 3 — x² + px + q, split by two numbers that add to p and multiply to q.
    //     Sorted by degree first: "5x + x² + 6" is the same trinomial as "x² + 5x + 6".
    if (terms.length === 3) {
      const deg = (x) => Math.max(0, ...Object.values(x.v), 0);
      const [q2, q1, q0] = [...terms].sort((x, y) => deg(y) - deg(x));
      const vs = Object.keys(q2.v);
      const middleOnlyThatLetter = Object.keys(q1.v).length === 1 && q1.v[vs[0]] === 1;
      if (q2.c === 1 && vs.length === 1 && q2.v[vs[0]] === 2 && middleOnlyThatLetter && isConst(q0)) {
        const p = q1.c, q = q0.c;
        for (let m = -Math.abs(q) - 1; m <= Math.abs(q) + 1; m++) {
          if (m === 0 || q % m !== 0) continue;
          const n = q / m;
          if (m + n === p) {
            const x = vs[0];
            return { kind: 'vieta',
                     item: { k: 'p', m: T(1), a: [T(1, { [x]: 1 }), T(m)], b: [T(1, { [x]: 1 }), T(n)] },
                     why: m + ' and ' + n + ' add to ' + p + ' and multiply to ' + q + '.' };
          }
        }
      }
    }

    return null;
  }

  /* ================= fraction structure ================= */

  /**
   * A key that identifies a bracket regardless of the order its terms were written in.
   * Rendered text is NOT safe for this: "x - n" and "-n + x" are the same bracket but
   * different strings, which silently broke matching a bracket against its own negative.
   */
  const termKey = (t) => t.c + '|' + sig(t);
  const brKey = (ts) => ts.map(termKey).sort().join(',');

  /** Top or bottom broken into the blocks it is a product of, or null if it is still a sum. */
  function blocksOf(side) {
    if (side.length !== 1) return null;
    const it = side[0];
    if (it.k === 't') return { mul: it, brs: [] };
    if (it.k === 'b') return { mul: it.m, brs: [it.ts] };
    if (it.k === 'p') return { mul: it.m, brs: [it.a, it.b] };
    return null;
  }

  /** A bracket that appears on both top and bottom. */
  function sharedBracket(f) {
    const n = blocksOf(f.num), d = blocksOf(f.den);
    if (!n || !d) return null;
    for (const a of n.brs) for (const b of d.brs) if (brKey(a) === brKey(b)) return a;
    return null;
  }

  /** Is one bracket the exact negative of the other? (x - 5) and (5 - x). */
  const negated = (a, b) =>
    a.length === b.length && brKey(a) === brKey(b.map((t) => T(-t.c, t.v)));


  function negatedPair(f) {
    const n = blocksOf(f.num), d = blocksOf(f.den);
    if (!n || !d) return null;
    for (const a of n.brs) for (const b of d.brs) if (negated(a, b)) return { a, b };
    return null;
  }

  /**
   * A factor shared by the multipliers in front of top and bottom — 3s(3s - 5) over 3s.
   * This also covers a plain term over a plain term, which is the same thing with no
   * brackets attached. Missing it made an uncancelled fraction count as finished.
   */
  function commonMultiplier(f) {
    const n = blocksOf(f.num), d = blocksOf(f.den);
    if (!n || !d) return null;

    const g = gcd(n.mul.c, d.mul.c);
    const shared = {};
    for (const k of Object.keys(n.mul.v)) {
      const take = Math.min(n.mul.v[k], d.mul.v[k] || 0);
      if (take > 0) shared[k] = take;
    }
    if (g > 1 || Object.keys(shared).length) return { g, shared, n, d };
    return null;
  }

  /** Put a side back together from its multiplier and its brackets. */
  function rebuild(side, mul) {
    if (!side.brs.length) return [cloneTerm(mul)];
    if (side.brs.length === 1) return [{ k: 'b', m: cloneTerm(mul), ts: side.brs[0].map(cloneTerm) }];
    return [{ k: 'p', m: cloneTerm(mul), a: side.brs[0].map(cloneTerm), b: side.brs[1].map(cloneTerm) }];
  }

  const cancellable = (f) => !!(sharedBracket(f) || commonMultiplier(f));

  /** Letters first, highest power first, bare numbers last — how a textbook writes it. */
  const tidyOrder = (ts) => [...ts].sort((a, b) => {
    const da = Math.max(0, ...Object.values(a.v)), db = Math.max(0, ...Object.values(b.v));
    return db - da;
  });

  /** Multiply a whole item by a plain number. */
  function scaleItem(it, s) {
    if (it.k === 't') return T(it.c * s, cloneVars(it.v));
    if (it.k === 'b') return { k: 'b', m: T(it.m.c * s, cloneVars(it.m.v)), ts: it.ts.map(cloneTerm) };
    if (it.k === 'p') return { k: 'p', m: T(it.m.c * s, cloneVars(it.m.v)),
                               a: it.a.map(cloneTerm), b: it.b.map(cloneTerm) };
    return cloneItem(it);
  }

  /**
   * A bracket with nothing but 1 in front of it is not a product, it is just a sum —
   * and leaving it wrapped strands it, because no move in the fraction palette can open
   * a bracket. Unwrap it.
   */
  function unwrapUnitBracket(items) {
    if (items.length !== 1 || items[0].k !== 'b') return items;
    const b = items[0];
    if (!isConst(b.m) || Math.abs(b.m.c) !== 1) return items;
    return b.ts.map((x) => T(x.c * b.m.c, cloneVars(x.v)));
  }

  /** A bottom of 1 or -1 is not a fraction — fold it into the top. */
  function foldUnitDenominator(num, den) {
    if (den.length === 1 && den[0].k === 't' && isConst(den[0]) && Math.abs(den[0].c) === 1) {
      return unwrapUnitBracket(num.map((it) => scaleItem(it, den[0].c)));
    }
    return null;
  }

  /* ================= moves ================= */

  function openBracket(items) {
    let at = find(items, 'p');
    if (at !== -1) {
      const it = items[at];
      const opened = scale(mulSums(it.a, it.b), it.m);
      return { next: [...items.slice(0, at), ...opened, ...items.slice(at + 1)],
               why: 'Every term in the first bracket multiplies every term in the second.' };
    }
    at = find(items, 'b');
    const it = items[at];
    const opened = scale(it.ts, it.m);
    const why = it.m.c === -1 && isConst(it.m)
      ? 'A minus in front flips the sign of <b>every</b> term inside — not just the first.'
      : 'The <b>' + fmt(it.m, false) + '</b> outside touches <b>every</b> term inside.';
    return { next: [...items.slice(0, at), ...opened, ...items.slice(at + 1)], why };
  }

  function usePowerRule(items) {
    const at = items.findIndex((it) => POWER_KINDS.includes(it.k));
    const it = items[at];
    let merged, why;

    if (it.k === 'm') {
      merged = mulAll(it.fs);
      const coeffs = it.fs.map((f) => Math.abs(f.c));
      const product = coeffs.reduce((a, b) => a * b, 1);
      why = 'The numbers in front <b>multiply</b> (' + coeffs.join(' × ') + ' = ' + product +
            ') and the small numbers <b>add</b>: ' +
            it.fs.map((f) => fmt(f, false)).join(' · ') + ' = ' + fmt(merged, false) + '.';
    } else if (it.k === 'd') {
      merged = divTerm(it.a, it.b);
      why = isConst(merged) && merged.c === 1
        ? 'Dividing <b>subtracts</b> the small numbers — and they cancel to nothing. ' +
          'Anything over itself is 1, which is exactly why x⁰ = 1.'
        : 'Dividing powers of the same letter <b>subtracts</b> the small numbers: ' +
          fmt(it.a, false) + ' ÷ ' + fmt(it.b, false) + ' = ' + fmt(merged, false) + '.';
    } else {
      merged = powTerm(it.base, it.n);
      why = 'A power of a power <b>multiplies</b> the small numbers: (' + fmt(it.base, false) +
            ')' + MathLab.sup(it.n) + ' = ' + fmt(merged, false) + '.';
    }

    return { next: [...items.slice(0, at), merged, ...items.slice(at + 1)], why };
  }

  function joinBlocks(items) {
    const f = theFraction(items);

    if (f) {
      const num = joinableIn(f.num) ? collect(f.num) : f.num.map(cloneItem);
      const den = joinableIn(f.den) ? collect(f.den) : f.den.map(cloneItem);
      return { next: [{ k: 'f', num, den }],
               why: 'Collected the matching blocks — inside the top and bottom only. ' +
                    'You never collect <i>across</i> the fraction line.' };
    }

    const terms = items.filter((it) => it.k === 't');
    const others = items.filter((it) => it.k !== 't');

    let why = 'Collected the blocks that match.';
    const seen = new Map();
    for (const t of terms) {
      const s = sig(t);
      if (seen.has(s)) {
        why = seen.get(s) + ' and ' + t.c + ' make ' + (seen.get(s) + t.c) +
              ' of the same shape — the letters and powers do not change.';
        break;
      }
      seen.set(s, t.c);
    }

    return { next: [...collect(terms), ...others], why };
  }

  function factorOut(items) {
    const f = theFraction(items);
    if (f) {
      const nf = factorisation(f.num);
      if (nf) return { next: [{ k: 'f', num: [nf.item], den: f.den.map(cloneItem) }], why: 'Top: ' + nf.why };
      const df = factorisation(f.den);
      return { next: [{ k: 'f', num: f.num.map(cloneItem), den: [df.item] }], why: 'Bottom: ' + df.why };
    }
    // already a product, but the inside can still be broken down: 4(x² - 9)
    if (isProduct(items) && items[0].k === 'b') {
      const inner = factorisation(items[0].ts);
      const outer = items[0].m;
      return { next: [{ k: 'p', m: mulTerm(outer, inner.item.m || T(1)),
                        a: inner.item.k === 'p' ? inner.item.a : inner.item.ts,
                        b: inner.item.k === 'p' ? inner.item.b : [T(1)] }],
               why: 'The bracket itself still factorises. ' + inner.why };
    }

    const fa = factorisation(items);
    return { next: [fa.item], why: fa.why };
  }

  /** (5 - x) becomes -(x - 5), so a bracket that looked wrong-way-round now matches. */
  function flipSign(items) {
    const f = theFraction(items);
    const pair = negatedPair(f);
    const d = blocksOf(f.den);

    const flipped = tidyOrder(pair.b.map((t) => T(-t.c, cloneVars(t.v))));
    const rebuilt = d.brs.length === 1
      ? { k: 'b', m: T(-d.mul.c, d.mul.v), ts: flipped }
      : { k: 'p', m: T(-d.mul.c, d.mul.v),
          a: brKey(d.brs[0]) === brKey(pair.b) ? flipped : d.brs[0].map(cloneTerm),
          b: brKey(d.brs[1]) === brKey(pair.b) ? flipped : d.brs[1].map(cloneTerm) };

    return { next: [{ k: 'f', num: f.num.map(cloneItem), den: [rebuilt] }],
             why: '(' + fmtSum(pair.b) + ') is just −(' + fmtSum(flipped) + '). ' +
                  'Pull the minus out and the two brackets match.' };
  }

  function cancelBlock(items) {
    const f = theFraction(items);
    const shared = sharedBracket(f);

    if (shared) {
      const strip = (side) => {
        const it = side[0];
        if (it.k === 'b') return [cloneTerm(it.m)];
        if (it.k === 'p') {
          const keep = brKey(it.a) === brKey(shared) ? it.b : it.a;
          return [{ k: 'b', m: cloneTerm(it.m), ts: keep.map(cloneTerm) }];
        }
        return side.map(cloneItem);
      };
      const num = strip(f.num), den = strip(f.den);
      const folded = foldUnitDenominator(num, den);
      return { next: folded || [{ k: 'f', num, den }],
               why: 'The block (' + fmtSum(shared) + ') is on the top <i>and</i> the bottom, so it cancels. ' +
                    'Whole blocks only — never across a + or a −.' };
    }

    const cm = commonMultiplier(f);
    const shrink = (m) => {
      const v = cloneVars(m.v);
      for (const k of Object.keys(cm.shared)) {
        v[k] -= cm.shared[k];
        if (!v[k]) delete v[k];
      }
      return T(m.c / cm.g, v);
    };

    const num = rebuild(cm.n, shrink(cm.n.mul));
    const den = rebuild(cm.d, shrink(cm.d.mul));
    const folded = foldUnitDenominator(num, den);

    const removed = T(cm.g, cm.shared);
    return { next: folded || [{ k: 'f', num, den }],
             why: 'Top and bottom both contain <b>' + fmt(removed, false) + '</b>, so it cancels. ' +
                  'Whole factors only — never across a + or a −.' };
  }

  /** Two fractions divided becomes two fractions multiplied, with the second turned over. */
  function flipAndMultiply(items) {
    const at = items.findIndex((it) => it.k === 'x' && it.op === '/');
    const it = items[at];
    const turned = { k: 'f', num: it.b.den.map(cloneItem), den: it.b.num.map(cloneItem) };
    return { next: [...items.slice(0, at), { k: 'x', op: '*', a: cloneItem(it.a), b: turned }, ...items.slice(at + 1)],
             why: 'Dividing by a fraction is multiplying by it turned upside down.' };
  }

  const asTerm = (side) => (side.length === 1 && side[0].k === 't' ? side[0] : null);

  function multiplyAcross(items) {
    const at = items.findIndex((it) => it.k === 'x' && it.op === '*');
    const it = items[at];
    const num = mulTerm(asTerm(it.a.num), asTerm(it.b.num));
    const den = mulTerm(asTerm(it.a.den), asTerm(it.b.den));
    return { next: [...items.slice(0, at), { k: 'f', num: [num], den: [den] }, ...items.slice(at + 1)],
             why: 'Multiplying fractions goes straight across: tops together, bottoms together.' };
  }

  /** Put every fraction on the line over one denominator. */
  function commonDenominator(items) {
    const fracs = items.filter((it) => it.k === 'f');
    const loose = items.filter((it) => it.k === 't');

    const dens = fracs.map((f) => asTerm(f.den));
    const L = dens.reduce((acc, d) => lcm(acc, d.c), 1);

    const num = [];
    for (const f of fracs) {
      const factor = L / asTerm(f.den).c;
      for (const t of f.num) num.push(mulTerm(t, T(factor)));
    }
    for (const t of loose) num.push(mulTerm(t, T(L)));

    return { next: [{ k: 'f', num, den: [T(L)] }],
             why: 'Same bottom first. ' + dens.map((d) => d.c).join(' and ') +
                  ' both go into <b>' + L + '</b>, so everything is rewritten over ' + L + '.' };
  }

  /* ================= move table ================= */

  const MOVES = {
    open: {
      label: 'Open the brackets',
      can: (items) => !theFraction(items) && (hasKind(items, 'b') || hasKind(items, 'p')),
      apply: openBracket,
      refuse: (items) => theFraction(items)
        ? 'Not here. Brackets are what you <b>cancel</b> with — opening them throws away the thing you need.'
        : 'There is no bracket left to open.',
    },
    power: {
      label: 'Use the power rule',
      can: hasPower,
      apply: usePowerRule,
      refuse: () => 'Nothing here is being multiplied, divided or raised to a power. ' +
                    'Those rules never apply to adding.',
    },
    join: {
      label: 'Join like blocks',
      can: (items) => {
        const f = theFraction(items);
        if (f) return joinableIn(f.num) || joinableIn(f.den);
        return joinableIn(items);
      },
      apply: joinBlocks,
      refuse: (items) => theFraction(items)
        ? 'Nothing matches inside the top or the bottom — and you may never collect across the line.'
        : hasKind(items, 'b') || hasKind(items, 'p')
          ? 'Nothing matches out here yet. What is still inside a bracket cannot be joined — open it first.'
          : 'No two blocks have the same shape. Same letters <i>and</i> same powers, remember.',
    },
    factor: {
      label: 'Build a bracket',
      can: (items) => {
        const f = theFraction(items);
        if (f) return !!(factorisation(f.num) || factorisation(f.den));
        if (isProduct(items) && items[0].k === 'b') return !!factorisation(items[0].ts);
        return !!factorisation(items);
      },
      apply: factorOut,
      refuse: () => 'Nothing here shares a factor, and it is not a square minus a square.',
    },
    flip: {
      label: 'Turn a bracket round',
      can: (items) => {
        const f = theFraction(items);
        return !!(f && negatedPair(f) && !sharedBracket(f));
      },
      apply: flipSign,
      refuse: () => 'No bracket here is the exact opposite of another one.',
    },
    cancel: {
      label: 'Cancel',
      can: (items) => {
        const f = theFraction(items);
        return !!(f && cancellable(f));
      },
      apply: cancelBlock,
      refuse: (items) => theFraction(items)
        ? 'Top and bottom are not both single blocks yet — build the brackets first. ' +
          'You may never cancel across a + or a −.'
        : 'There is no fraction here to cancel.',
    },
    flipmul: {
      label: 'Flip and multiply',
      can: (items) => items.some((it) => it.k === 'x' && it.op === '/'),
      apply: flipAndMultiply,
      refuse: () => 'Nothing here is being divided by a fraction.',
    },
    across: {
      label: 'Multiply straight across',
      can: (items) => items.some((it) => it.k === 'x' && it.op === '*'),
      apply: multiplyAcross,
      refuse: () => 'Nothing here is two fractions multiplied together.',
    },
    common: {
      label: 'Same bottom first',
      can: (items) => fractionCount(items) >= 2 && items.every((it) => it.k === 'f' || it.k === 't') &&
                      items.filter((it) => it.k === 'f').every((f) => asTerm(f.den)),
      apply: commonDenominator,
      refuse: (items) => fractionCount(items) >= 2
        ? 'These bottoms are not plain numbers, so this one needs a different route.'
        : 'There is only one fraction here — nothing to put over a common bottom.',
    },
  };

  /* ================= predict the result =================
     Before the line advances, offer what the move gives alongside what the classic
     mistakes give. A refused button teaches nothing about a mistake she never made;
     seeing x² + 25 and having to reject it is the whole point. Each wrong option is
     one of the named traps from the wall chart. */

  const asLine = (items) => render(items);

  function predictions(key, items) {
    const correct = MOVES[key].apply(items).next;
    const wrong = [];
    const add = (list, why) => { if (list) wrong.push({ items: list, why }); };

    if (key === 'open') {
      const at = find(items, 'p') !== -1 ? find(items, 'p') : find(items, 'b');
      const it = items[at];
      const rest = (mid) => [...items.slice(0, at), ...mid, ...items.slice(at + 1)];

      if (it.k === 'p') {
        // (x + 5)² = x² + 25 — the cross terms forgotten
        const ends = [mulTerm(it.a[0], it.b[0]), mulTerm(it.a[it.a.length - 1], it.b[it.b.length - 1])];
        add(rest(scale(collect(ends), it.m)),
            'Only the ends were multiplied. Every term in the first bracket has to meet ' +
            '<b>every</b> term in the second — the middle bit is what goes missing.');
      } else if (isConst(it.m) && it.m.c === -1) {
        // 7 - (2x - 5) = 7 - 2x - 5 — only the first sign flipped
        const half = it.ts.map((x, i) => (i === 0 ? T(-x.c, x.v) : cloneTerm(x)));
        add(rest(half), 'Only the first sign was flipped. A minus in front flips <b>every</b> term inside.');
      } else {
        // 3(x + 4) = 3x + 4 — the multiplier reached only the first term
        const half = it.ts.map((x, i) => (i === 0 ? mulTerm(x, it.m) : cloneTerm(x)));
        add(rest(half), 'The number outside only reached the first term. It touches <b>everything</b> inside.');
      }
    }

    if (key === 'join') {
      const terms = items.filter((x) => x.k === 't');
      const others = items.filter((x) => x.k !== 't');
      const at = new Map();
      const bumped = [];
      for (const x of terms) {
        const s = sig(x);
        if (at.has(s)) {
          const slot = at.get(s);
          const v = {};
          for (const k of Object.keys(bumped[slot].v)) v[k] = bumped[slot].v[k] * 2;
          bumped[slot] = T(bumped[slot].c + x.c, v);          // 3x² + 4x² = 7x⁴
        } else { at.set(s, bumped.length); bumped.push(cloneTerm(x)); }
      }
      add([...bumped.filter((x) => x.c !== 0), ...others],
          'Adding never changes the power. You are counting shapes: 3 squares and 4 squares ' +
          'are 7 squares, not 7 of something else.');
    }

    if (key === 'power') {
      const at = items.findIndex((x) => POWER_KINDS.includes(x.k));
      const it = items[at];
      const rest = (one) => [...items.slice(0, at), one, ...items.slice(at + 1)];

      if (it.k === 'm') {
        const merged = mulAll(it.fs);
        // 3x² · 4x³ = 7x⁵ — the numbers in front added instead of multiplied
        const added = T(it.fs.reduce((c, f) => c + f.c, 0), { ...merged.v });
        if (added.c !== merged.c) add(rest(added), 'The numbers in front <b>multiply</b>. Only the small numbers add.');
        // x² · x³ = x⁶ — exponents multiplied instead of added
        const v = {};
        for (const k of Object.keys(merged.v)) v[k] = it.fs.reduce((a, f) => a * (f.v[k] || 1), 1);
        const times = T(merged.c, v);
        if (asLine([times]) !== asLine([merged])) add(rest(times),
          'Multiplying powers <b>adds</b> the small numbers. Multiplying them is the rule for a power of a power.');
      } else if (it.k === 'd') {
        const merged = divTerm(it.a, it.b);
        const v = {};
        for (const k of Object.keys(it.a.v)) {
          const q = (it.a.v[k] || 0) / (it.b.v[k] || 1);
          if (Number.isInteger(q) && q !== 0) v[k] = q;
        }
        const divided = T(merged.c, v);
        if (asLine([divided]) !== asLine([merged])) add(rest(divided),
          'Dividing <b>subtracts</b> the small numbers. It never divides them.');
      } else {
        const merged = powTerm(it.base, it.n);
        const v = {};
        for (const k of Object.keys(it.base.v)) v[k] = it.base.v[k] + it.n;
        const added = T(merged.c, v);
        if (asLine([added]) !== asLine([merged])) add(rest(added),
          'A power of a power <b>multiplies</b> the small numbers. Adding is the rule for multiplying.');
      }
    }

    const correctLine = asLine(correct);
    const seen = new Set([correctLine]);
    const options = [{ text: correctLine, ok: true }];
    for (const w of wrong) {
      const line = asLine(w.items);
      if (seen.has(line)) continue;
      seen.add(line);
      options.push({ text: line, ok: false, why: w.why });
    }

    return options.length >= 2 ? { correct, options } : null;
  }

  /* ================= goals ================= */

  function isSimplified(items) {
    if (hasKind(items, 'x')) return false;
    const fracs = fractionCount(items);
    if (fracs > 1) return false;
    if (fracs === 1) {
      if (items.length > 1) return false;
      const f = items[0];
      return !cancellable(f) && !negatedPair(f) &&
             !factorisation(f.num) && !factorisation(f.den) &&
             !joinableIn(f.num) && !joinableIn(f.den);
    }
    return !hasKind(items, 'b') && !hasKind(items, 'p') && !hasPower(items) && !joinableIn(items);
  }

  const isProduct = (items) => items.length === 1 && (items[0].k === 'b' || items[0].k === 'p');

  /** A product is only finished when none of its brackets can be broken down further. */
  function fullyFactored(items) {
    if (!isProduct(items)) return false;
    const it = items[0];
    if (it.k === 'b') return !factorisation(it.ts);
    return !factorisation(it.a) && !factorisation(it.b);
  }

  const reachedGoal = (goal, items) => (goal === 'factor' ? fullyFactored(items) : isSimplified(items));

  const PALETTE = {
    simplify: ['open', 'power', 'join'],
    factor: ['factor', 'join'],
    fraction: ['factor', 'flip', 'cancel'],
    fracarith: ['flipmul', 'across', 'common', 'join', 'cancel'],
  };

  const DONE_LABEL = {
    simplify: "It's simplest now",
    factor: "It's in brackets now",
    fraction: "It's cancelled now",
    fracarith: "It's one fraction now",
  };

  function notYet(goal, items) {
    if (goal === 'factor') return 'Not yet — this one wants a product, so it has to end up inside brackets.';
    if (hasKind(items, 'x')) return 'Not yet — that is still two fractions, not one.';
    if (fractionCount(items) > 1) return 'Not yet — put them over the same bottom first.';
    const f = theFraction(items);
    if (f) {
      if (factorisation(f.num) || factorisation(f.den)) return 'Not yet — the top or the bottom can still be written as a product.';
      if (negatedPair(f)) return 'Not yet — those two brackets are opposites. Turn one round.';
      if (joinableIn(f.num) || joinableIn(f.den)) return 'Not yet — blocks inside the top or bottom still match.';
      return 'Not yet — there is still a block on both sides to cancel.';
    }
    if (hasKind(items, 'b') || hasKind(items, 'p')) return 'Not yet — there is still a bracket sitting there.';
    if (hasPower(items)) return 'Not yet — those powers are still waiting for the power rule.';
    return 'Not yet — two blocks out there are still the same shape.';
  }

  function suggest(goal, items) {
    if (reachedGoal(goal, items)) return null;
    for (const key of PALETTE[goal]) if (MOVES[key].can(items)) return key;
    return null;
  }

  /* ================= banned values =================
     The denominator may never be zero, and the values come from the ORIGINAL bottom —
     the whole point being that they survive cancelling. Found by scanning, which is
     enough because every generated denominator has whole-number roots. */

  function bannedValues(items) {
    const vars = varsUsed(items);
    if (vars.length !== 1) return [];

    const dens = [];
    const walk = (it) => {
      if (it.k === 'f') { dens.push(it.den); it.num.forEach(walk); it.den.forEach(walk); }
      else if (it.k === 'x') { walk(it.a); walk(it.b); }
    };
    items.forEach(walk);
    if (!dens.length) return [];

    const bad = new Set();
    for (const den of dens) {
      for (let x = -30; x <= 30; x++) {
        let value;
        try { value = evaluate(den, { [vars[0]]: x }); } catch { continue; }
        if (Number.isFinite(value) && Math.abs(value) < 1e-9) bad.add(x);
      }
    }
    return { letter: vars[0], values: [...bad].sort((a, b) => a - b) };
  }

  /* ================= evaluation ================= */

  function evaluate(items, vals) {
    const termVal = (t) =>
      Object.keys(t.v).reduce((acc, k) => acc * Math.pow(vals[k], t.v[k]), t.c);

    const itemVal = (it) => {
      switch (it.k) {
        case 't': return termVal(it);
        case 'm': return it.fs.reduce((acc, f) => acc * termVal(f), 1);
        case 'd': return termVal(it.a) / termVal(it.b);
        case 'e': return Math.pow(termVal(it.base), it.n);
        case 'b': return termVal(it.m) * sumVal(it.ts);
        case 'p': return termVal(it.m) * sumVal(it.a) * sumVal(it.b);
        case 'f': return sumVal(it.num) / sumVal(it.den);
        case 'x': return it.op === '*' ? itemVal(it.a) * itemVal(it.b) : itemVal(it.a) / itemVal(it.b);
        default: throw new Error('unknown item ' + it.k);
      }
    };

    const sumVal = (list) => list.reduce((acc, it) => acc + itemVal(it), 0);
    return sumVal(items);
  }

  function varsUsed(items) {
    const out = new Set();
    const fromTerm = (t) => Object.keys(t.v).forEach((k) => out.add(k));
    const walk = (it) => {
      if (it.k === 't') fromTerm(it);
      else if (it.k === 'm') it.fs.forEach(fromTerm);
      else if (it.k === 'd') { fromTerm(it.a); fromTerm(it.b); }
      else if (it.k === 'e') fromTerm(it.base);
      else if (it.k === 'b') { fromTerm(it.m); it.ts.forEach(fromTerm); }
      else if (it.k === 'p') { fromTerm(it.m); it.a.forEach(fromTerm); it.b.forEach(fromTerm); }
      else if (it.k === 'f') { it.num.forEach(walk); it.den.forEach(walk); }
      else if (it.k === 'x') { walk(it.a); walk(it.b); }
    };
    items.forEach(walk);
    return [...out];
  }

  return {
    T, cloneAll, mulTerm, divTerm, powTerm, mulSums, collect, sig, isConst, gcdAll, lcm,
    render, renderItemAbs, fmt, fmtSum,
    MOVES, predictions, isSimplified, suggest, factorisation, theFraction, negatedPair, cancellable,
    isProduct, fullyFactored, reachedGoal, PALETTE, DONE_LABEL, notYet, bannedValues,
    evaluate, varsUsed,
  };
})();
