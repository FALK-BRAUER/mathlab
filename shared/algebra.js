/**
 * algebra.js — the small transformation engine behind Step Builder.
 *
 * An expression is a flat list of ITEMS that are added together. An item is one of:
 *
 *   { k: 't', c, v }                 a term:            -3x²y
 *   { k: 'm', fs: [term, ...] }      terms multiplied:  x² · x³   (power rule)
 *   { k: 'b', m: term, ts: [term] }  a bracket:         3x(2x + 3)
 *   { k: 'p', m: term, a: [], b: [] }two brackets:      2(x + 3)(x - 1)
 *   { k: 'f', num: [item], den: [item] }  a fraction, only ever alone at top level
 *
 * Every move is a pure function items -> { next, why }. Nothing mutates in place, so a
 * refused move cannot half-apply and corrupt the line.
 */

const Algebra = (() => {
  const { formatTerm, formatSum, signature } = MathLab;

  /* ---------------- term arithmetic ---------------- */

  const T = (c, v = {}) => ({ k: 't', c, v });

  const cloneVars = (v) => ({ ...v });
  const cloneTerm = (t) => ({ k: 't', c: t.c, v: cloneVars(t.v) });

  function cloneItem(it) {
    switch (it.k) {
      case 't': return cloneTerm(it);
      case 'm': return { k: 'm', fs: it.fs.map(cloneTerm) };
      case 'b': return { k: 'b', m: cloneTerm(it.m), ts: it.ts.map(cloneTerm) };
      case 'p': return { k: 'p', m: cloneTerm(it.m), a: it.a.map(cloneTerm), b: it.b.map(cloneTerm) };
      case 'f': return { k: 'f', num: it.num.map(cloneItem), den: it.den.map(cloneItem) };
      default: throw new Error('unknown item ' + it.k);
    }
  }

  const cloneAll = (items) => items.map(cloneItem);

  /** Multiply two terms: coefficients multiply, exponents add. */
  function mulTerm(a, b) {
    const v = cloneVars(a.v);
    for (const k of Object.keys(b.v)) {
      v[k] = (v[k] || 0) + b.v[k];
      if (v[k] === 0) delete v[k];
    }
    return T(a.c * b.c, v);
  }

  const mulAll = (terms) => terms.reduce(mulTerm, T(1));

  /** Every pairwise product of two sums. */
  const mulSums = (as, bs) => as.flatMap((a) => bs.map((b) => mulTerm(a, b)));

  const scale = (terms, m) => terms.map((t) => mulTerm(t, m));

  /** Add like terms, drop zeros, keep first-appearance order. */
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
  const sameShape = (a, b) => sig(a) === sig(b);
  const isConst = (t) => Object.keys(t.v).length === 0;

  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const gcdAll = (ns) => ns.reduce((g, n) => gcd(g, n), 0);

  const isSquareNumber = (n) => n > 0 && Number.isInteger(Math.sqrt(n));

  /** Is this term a perfect square, like 9x⁴? */
  const isSquareTerm = (t) =>
    isSquareNumber(t.c) && Object.values(t.v).every((p) => p % 2 === 0);

  const sqrtTerm = (t) => {
    const v = {};
    for (const k of Object.keys(t.v)) v[k] = t.v[k] / 2;
    return T(Math.sqrt(t.c), v);
  };

  /* ---------------- rendering ---------------- */

  const fmt = (t, lead) => formatTerm({ coeff: t.c, vars: t.v }, { leadingPlus: lead });
  const fmtSum = (ts) => formatSum(ts.map((t) => ({ coeff: t.c, vars: t.v })));

  /** The sign an item contributes when it sits in a sum. */
  function itemSign(it) {
    switch (it.k) {
      case 't': return Math.sign(it.c) || 1;
      case 'm': return Math.sign(it.fs.reduce((c, f) => c * f.c, 1)) || 1;
      case 'b':
      case 'p': return Math.sign(it.m.c) || 1;
      default: return 1;
    }
  }

  /** A multiplier of 1 or -1 disappears in front of a bracket. */
  const mulPrefix = (m) => {
    const bare = { ...m, c: Math.abs(m.c) };
    return Math.abs(m.c) === 1 && isConst(m) ? '' : fmt(bare, false);
  };

  function renderItemAbs(it) {
    switch (it.k) {
      case 't': return fmt({ ...it, c: Math.abs(it.c) }, false);
      case 'm': {
        const fs = it.fs.map((f, i) => fmt(i === 0 ? { ...f, c: Math.abs(f.c) } : f, false));
        return fs.join(' · ');
      }
      case 'b': return mulPrefix(it.m) + '(' + fmtSum(it.ts) + ')';
      case 'p': return mulPrefix(it.m) + '(' + fmtSum(it.a) + ')(' + fmtSum(it.b) + ')';
      case 'f': return renderFraction(it);
      default: throw new Error('unknown item ' + it.k);
    }
  }

  const renderFraction = (f) =>
    '<span class="frac"><span class="num">' + render(f.num) + '</span>' +
    '<span class="den">' + render(f.den) + '</span></span>';

  /**
   * Render a whole sum of items.
   * Joins with explicit operators rather than spacing them with a regex afterwards — the
   * regex approach double-spaces anything already rendered, e.g. the "s + 2" inside a bracket.
   */
  function render(items) {
    if (!items.length) return '0';
    if (items.length === 1 && items[0].k === 'f') return renderFraction(items[0]);

    return items
      .map((it, i) => {
        const neg = itemSign(it) < 0;
        const body = renderItemAbs(it);
        if (i === 0) return (neg ? '-' : '') + body;
        return (neg ? ' - ' : ' + ') + body;
      })
      .join('');
  }

  /* ---------------- what a line still allows ---------------- */

  const find = (items, k) => items.findIndex((it) => it.k === k);
  const hasKind = (items, k) => find(items, k) !== -1;

  const theFraction = (items) => (items.length === 1 && items[0].k === 'f' ? items[0] : null);

  function hasJoinable(items) {
    const seen = new Set();
    for (const it of items) {
      if (it.k !== 't') continue;
      const s = sig(it);
      if (seen.has(s)) return true;
      seen.add(s);
    }
    return false;
  }

  /** A sum of plain terms that could be pulled apart into a product. */
  function factorisation(terms) {
    if (terms.length < 2 || terms.some((t) => t.k !== 't')) return null;

    // 1 — something in every term
    const g = gcdAll(terms.map((t) => t.c));
    const shared = {};
    const first = terms[0].v;
    for (const k of Object.keys(first)) {
      const least = Math.min(...terms.map((t) => t.v[k] || 0));
      if (least > 0) shared[k] = least;
    }
    if (g > 1 || Object.keys(shared).length) {
      const common = T(g * (terms[0].c < 0 && g > 0 ? 1 : 1), shared);
      common.c = g;
      const inside = terms.map((t) => {
        const v = cloneVars(t.v);
        for (const k of Object.keys(shared)) {
          v[k] -= shared[k];
          if (v[k] === 0) delete v[k];
        }
        return T(t.c / g, v);
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

    // 3 — x² + px + q, split by two numbers that add to p and multiply to q
    if (terms.length === 3) {
      const [q2, q1, q0] = terms;
      const vs = Object.keys(q2.v);
      if (q2.c === 1 && vs.length === 1 && q2.v[vs[0]] === 2 &&
          q1.v[vs[0]] === 1 && isConst(q0)) {
        const p = q1.c, q = q0.c;
        for (let m = -Math.abs(q) - 1; m <= Math.abs(q) + 1; m++) {
          if (m === 0) continue;
          if (q % m !== 0) continue;
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

  /** Blocks shared between top and bottom of a fraction, as canonical strings. */
  const blockKey = (it) =>
    it.k === 't' ? 'T' + sig(it) : it.k === 'b' ? 'B' + fmtSum(it.ts) : 'P';

  function fractionBlocks(side) {
    // one item only: a term, a bracket, or a product of two brackets
    if (side.length !== 1) return null;
    const it = side[0];
    if (it.k === 't') return [{ kind: 't', term: it }];
    if (it.k === 'b') return [{ kind: 't', term: it.m }, { kind: 'br', ts: it.ts }];
    if (it.k === 'p') return [{ kind: 't', term: it.m }, { kind: 'br', ts: it.a }, { kind: 'br', ts: it.b }];
    return null;
  }

  const brKey = (ts) => fmtSum(ts);

  function cancellable(f) {
    const nb = fractionBlocks(f.num);
    const db = fractionBlocks(f.den);
    if (!nb || !db) return null;

    for (const n of nb) {
      if (n.kind !== 'br') continue;
      for (const d of db) {
        if (d.kind === 'br' && brKey(n.ts) === brKey(d.ts)) return { ts: n.ts };
      }
    }
    return null;
  }

  /* ---------------- the moves ---------------- */

  function openBracket(items) {
    let at = find(items, 'p');
    if (at !== -1) {
      const it = items[at];
      const opened = scale(mulSums(it.a, it.b), it.m);
      return {
        next: [...items.slice(0, at), ...opened.map(cloneTerm), ...items.slice(at + 1)],
        why: 'Every term in the first bracket multiplies every term in the second.',
      };
    }

    at = find(items, 'b');
    const it = items[at];
    const opened = scale(it.ts, it.m);
    const why = it.m.c === -1 && isConst(it.m)
      ? 'A minus in front flips the sign of <b>every</b> term inside — not just the first.'
      : 'The <b>' + fmt(it.m, false) + '</b> outside touches <b>every</b> term inside.';

    return { next: [...items.slice(0, at), ...opened.map(cloneTerm), ...items.slice(at + 1)], why };
  }

  function usePowerRule(items) {
    const at = find(items, 'm');
    const it = items[at];
    const merged = mulAll(it.fs);

    const shown = it.fs.map((f) => fmt(f, false)).join(' · ');
    return {
      next: [...items.slice(0, at), merged, ...items.slice(at + 1)],
      why: 'Multiplying powers of the same letter <b>adds</b> the small numbers: ' +
           shown + ' = ' + fmt(merged, false) + '.',
    };
  }

  function joinBlocks(items) {
    const terms = items.filter((it) => it.k === 't');
    const others = items.filter((it) => it.k !== 't');
    const before = terms.length;
    const joined = collect(terms);

    // narrate one real merge so the shape-does-not-change point lands
    let why = 'Collected the blocks that match.';
    const seen = new Map();
    for (const t of terms) {
      const s = sig(t);
      if (seen.has(s)) {
        const a = seen.get(s), b = t.c;
        why = a + ' and ' + b + ' make ' + (a + b) + ' of the same shape — ' +
              'the letters and powers do not change.';
        break;
      }
      seen.set(s, t.c);
    }
    if (before === joined.length + 0 && joined.length === before) why = 'Collected the blocks that match.';

    return { next: [...joined, ...others], why };
  }

  function factorOut(items) {
    const f = theFraction(items);
    if (f) {
      const nf = factorisation(f.num);
      if (nf) return { next: [{ k: 'f', num: [nf.item], den: cloneAll(f.den) }], why: 'Top: ' + nf.why };
      const df = factorisation(f.den);
      return { next: [{ k: 'f', num: cloneAll(f.num), den: [df.item] }], why: 'Bottom: ' + df.why };
    }
    const fa = factorisation(items);
    return { next: [fa.item], why: fa.why };
  }

  function cancelBlock(items) {
    const f = theFraction(items);
    const hit = cancellable(f);

    const strip = (side) => {
      const it = side[0];
      if (it.k === 'b') return [cloneTerm(it.m)];
      if (it.k === 'p') {
        const keep = brKey(it.a) === brKey(hit.ts) ? it.b : it.a;
        return [{ k: 'b', m: cloneTerm(it.m), ts: keep.map(cloneTerm) }];
      }
      return cloneAll(side);
    };

    const num = strip(f.num);
    const den = strip(f.den);

    // a bracket with multiplier 1 and nothing else is just 1
    const tidy = (side) => side;
    const denIsOne = den.length === 1 && den[0].k === 't' && den[0].c === 1 && isConst(den[0]);

    return {
      next: denIsOne ? tidy(num) : [{ k: 'f', num: tidy(num), den: tidy(den) }],
      why: 'The block (' + fmtSum(hit.ts) + ') is on the top <i>and</i> the bottom, so it cancels.',
    };
  }

  /* ---------------- move table ---------------- */

  const MOVES = {
    open: {
      label: 'Open the brackets',
      can: (items) => !theFraction(items) && (hasKind(items, 'b') || hasKind(items, 'p')),
      apply: openBracket,
      refuse: (items) =>
        theFraction(items)
          ? 'Not here. Brackets are what you <b>cancel</b> with — opening them throws away the thing you need.'
          : 'There is no bracket left to open.',
    },
    power: {
      label: 'Add the powers',
      can: (items) => hasKind(items, 'm'),
      apply: usePowerRule,
      refuse: () => 'Nothing here is being multiplied together. That rule is only for multiplying.',
    },
    join: {
      label: 'Join like blocks',
      can: (items) => !theFraction(items) && hasJoinable(items),
      apply: joinBlocks,
      refuse: (items) =>
        theFraction(items)
          ? 'You cannot collect across a fraction line. Factorise first.'
          : hasKind(items, 'b') || hasKind(items, 'p')
            ? 'Nothing matches out here yet. What is still inside a bracket cannot be joined — open it first.'
            : 'No two blocks have the same shape. Same letters <i>and</i> same powers, remember.',
    },
    factor: {
      label: 'Build a bracket',
      can: (items) => {
        const f = theFraction(items);
        if (f) return !!(factorisation(f.num) || factorisation(f.den));
        return !!factorisation(items);
      },
      apply: factorOut,
      refuse: () => 'Nothing here shares a factor, and it is not a square minus a square.',
    },
    cancel: {
      label: 'Cancel',
      can: (items) => {
        const f = theFraction(items);
        return !!(f && cancellable(f));
      },
      apply: cancelBlock,
      refuse: (items) =>
        theFraction(items)
          ? 'Top and bottom are not both single blocks yet — build the brackets first. ' +
            'You may never cancel across a + or a −.'
          : 'There is no fraction here to cancel.',
    },
  };

  /* ---------------- when is a line finished ---------------- */

  function isSimplified(items) {
    const f = theFraction(items);
    if (f) return !cancellable(f) && !factorisation(f.num) && !factorisation(f.den);
    return !hasKind(items, 'b') && !hasKind(items, 'p') && !hasKind(items, 'm') && !hasJoinable(items);
  }

  /* ---------------- goals ----------------
     "Finished" means something different when the task is to BUILD brackets rather than
     get rid of them, so the goal decides both the finish test and which moves are offered.
     Kept here rather than in the app so the checker can drive it head-first. */

  const isProduct = (items) => items.length === 1 && (items[0].k === 'b' || items[0].k === 'p');

  function reachedGoal(goal, items) {
    if (goal === 'factor') return isProduct(items);
    return isSimplified(items);
  }

  const PALETTE = {
    simplify: ['open', 'power', 'join'],
    factor: ['factor', 'join'],
    fraction: ['factor', 'cancel'],
  };

  const DONE_LABEL = {
    simplify: "It's simplest now",
    factor: "It's in brackets now",
    fraction: "It's cancelled now",
  };

  function notYet(goal, items) {
    if (goal === 'factor') {
      return 'Not yet — this one wants a product, so it has to end up inside brackets.';
    }
    if (goal === 'fraction') {
      const f = theFraction(items);
      if (!f) return 'Not yet.';
      if (factorisation(f.num) || factorisation(f.den)) {
        return 'Not yet — the top or the bottom can still be written as a product.';
      }
      return 'Not yet — there is still a block on both sides to cancel.';
    }
    if (theFraction(items)) return 'Not yet — this is still a fraction.';
    if (hasKind(items, 'b') || hasKind(items, 'p')) return 'Not yet — there is still a bracket sitting there.';
    if (hasKind(items, 'm')) return 'Not yet — those powers are still waiting to be multiplied.';
    return 'Not yet — two blocks out there are still the same shape.';
  }

  /** The right next move for this goal — the last rung of the hint ladder, and the checker's driver. */
  function suggest(goal, items) {
    if (reachedGoal(goal, items)) return null;
    for (const key of PALETTE[goal]) {
      if (MOVES[key].can(items)) return key;
    }
    return null;
  }

  /** Numeric value of a line, for tests and for guarding generators. */
  function evaluate(items, vals) {
    const termVal = (t) =>
      Object.keys(t.v).reduce((acc, k) => acc * Math.pow(vals[k], t.v[k]), t.c);

    const itemVal = (it) => {
      switch (it.k) {
        case 't': return termVal(it);
        case 'm': return it.fs.reduce((acc, f) => acc * termVal(f), 1);
        case 'b': return termVal(it.m) * it.ts.reduce((acc, t) => acc + termVal(t), 0);
        case 'p': return termVal(it.m) *
                         it.a.reduce((acc, t) => acc + termVal(t), 0) *
                         it.b.reduce((acc, t) => acc + termVal(t), 0);
        case 'f': return sumVal(it.num) / sumVal(it.den);
        default: throw new Error('unknown item ' + it.k);
      }
    };

    const sumVal = (list) => list.reduce((acc, it) => acc + itemVal(it), 0);
    return sumVal(items);
  }

  /** Every letter used anywhere in the line. */
  function varsUsed(items) {
    const out = new Set();
    const fromTerm = (t) => Object.keys(t.v).forEach((k) => out.add(k));
    const walk = (it) => {
      if (it.k === 't') fromTerm(it);
      else if (it.k === 'm') it.fs.forEach(fromTerm);
      else if (it.k === 'b') { fromTerm(it.m); it.ts.forEach(fromTerm); }
      else if (it.k === 'p') { fromTerm(it.m); it.a.forEach(fromTerm); it.b.forEach(fromTerm); }
      else if (it.k === 'f') { it.num.forEach(walk); it.den.forEach(walk); }
    };
    items.forEach(walk);
    return [...out];
  }

  return {
    T, cloneAll, mulTerm, mulSums, collect, sig, isConst, gcdAll,
    render, renderItemAbs, fmt, fmtSum,
    MOVES, isSimplified, suggest, factorisation, theFraction,
    isProduct, reachedGoal, PALETTE, DONE_LABEL, notYet,
    evaluate, varsUsed,
  };
})();
