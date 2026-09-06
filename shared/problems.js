/**
 * problems.js — the question repertoire for Step Builder.
 *
 * Kept out of the app file so it can be exercised head-first by tools/check-algebra.mjs.
 * Generators live here; the app only picks from the pools and renders.
 *
 * Every generator returns { type, goal, items }:
 *   goal 'simplify' — end with no brackets and nothing left to join
 *   goal 'factor'   — the other direction: end as a product
 *   goal 'fraction' — build brackets, then cancel
 *
 * Numbers are random, so each generator is a family, not a question.
 */

const Problems = (() => {
  const { rnd, rndNonZero, pick, shuffle } = MathLab;
  const { T } = Algebra;

  const LETTERS = ['x', 'y', 'a', 'b', 'm', 'n', 'p', 'q', 's', 't'];
  const V = () => pick(LETTERS);

  const twoLetters = () => {
    const x = V();
    let y = V();
    while (y === x) y = V();
    return [x, y];
  };

  /* ---------------- brackets ---------------- */

  const expandSimple = () => {
    const x = V();
    return { type: 'Open it up', goal: 'simplify',
             items: [{ k: 'b', m: T(rnd(2, 7)), ts: [T(rnd(1, 5), { [x]: 1 }), T(rndNonZero(-9, 9))] }] };
  };

  const expandTermMultiplier = () => {
    const x = V();
    return { type: 'Open it up', goal: 'simplify',
             items: [{ k: 'b', m: T(rnd(2, 5), { [x]: 1 }),
                       ts: [T(rnd(2, 6), { [x]: 1 }), T(rndNonZero(-8, 8))] }] };
  };

  const minusBracket = () => {
    const x = V();
    return { type: 'Mind the minus', goal: 'simplify',
             items: [T(rnd(3, 14)),
                     { k: 'b', m: T(-1), ts: [T(rnd(2, 7), { [x]: 1 }), T(rndNonZero(-9, 9))] }] };
  };

  const minusBracketBoth = () => {
    const x = V();
    return { type: 'Mind the minus', goal: 'simplify',
             items: [T(rnd(2, 6), { [x]: 1 }),
                     { k: 'b', m: T(-1), ts: [T(rnd(2, 5), { [x]: 1 }), T(rndNonZero(-8, 8))] },
                     T(rndNonZero(-7, 7))] };
  };

  const twoBrackets = () => {
    const x = V();
    return { type: 'Two brackets', goal: 'simplify',
             items: [{ k: 'p', m: T(1),
                       a: [T(1, { [x]: 1 }), T(rndNonZero(-7, 7))],
                       b: [T(1, { [x]: 1 }), T(rndNonZero(-7, 7))] }] };
  };

  const squareBracket = () => {
    const x = V();
    const n = rndNonZero(-8, 8);
    return { type: 'Square a bracket', goal: 'simplify',
             items: [{ k: 'p', m: T(1),
                       a: [T(1, { [x]: 1 }), T(n)],
                       b: [T(1, { [x]: 1 }), T(n)] }] };
  };

  const sumTimesDifference = () => {
    const x = V();
    const n = rnd(2, 9);
    return { type: 'Sum times difference', goal: 'simplify',
             items: [{ k: 'p', m: T(1),
                       a: [T(1, { [x]: 1 }), T(n)],
                       b: [T(1, { [x]: 1 }), T(-n)] }] };
  };

  const expandThenCollect = () => {
    const x = V();
    return { type: 'Two steps', goal: 'simplify',
             items: [{ k: 'b', m: T(rnd(2, 6)), ts: [T(1, { [x]: 1 }), T(rndNonZero(-8, 8))] },
                     T(rndNonZero(-9, 9), { [x]: 1 })] };
  };

  const twoBracketsThenCollect = () => {
    const x = V();
    return { type: 'Two steps', goal: 'simplify',
             items: [{ k: 'p', m: T(1),
                       a: [T(1, { [x]: 1 }), T(rndNonZero(-6, 6))],
                       b: [T(1, { [x]: 1 }), T(rndNonZero(-6, 6))] },
                     T(rndNonZero(-8, 8), { [x]: 1 })] };
  };

  /* ---------------- powers ---------------- */

  const powerMultiply = () => {
    const x = V();
    return { type: 'Power rule', goal: 'simplify',
             items: [{ k: 'm', fs: [T(1, { [x]: rnd(2, 4) }), T(1, { [x]: rnd(2, 4) })] }] };
  };

  const powerMultiplyCoeffs = () => {
    const x = V();
    return { type: 'Power rule', goal: 'simplify',
             items: [{ k: 'm', fs: [T(rnd(2, 6), { [x]: rnd(1, 3) }), T(rnd(2, 6), { [x]: rnd(1, 3) })] }] };
  };

  const powerTwoLetters = () => {
    const [x, y] = twoLetters();
    return { type: 'Power rule', goal: 'simplify',
             items: [{ k: 'm', fs: [T(rnd(2, 5), { [x]: rnd(1, 3), [y]: 1 }),
                                    T(rnd(2, 5), { [x]: rnd(1, 2), [y]: rnd(1, 2) })] }] };
  };

  const powerThenCollect = () => {
    const x = V();
    const p = rnd(1, 2), q = rnd(1, 2);
    return { type: 'Two steps', goal: 'simplify',
             items: [{ k: 'm', fs: [T(rnd(2, 5), { [x]: p }), T(rnd(2, 5), { [x]: q })] },
                     T(rndNonZero(-9, 9), { [x]: p + q })] };
  };

  /* ---------------- collecting ---------------- */

  const collectOnly = () => {
    const x = V();
    const shapes = shuffle([{ [x]: 2 }, { [x]: 1 }, {}]).slice(0, rnd(2, 3));
    const items = [];
    for (const v of shapes) for (let i = 0; i < 2; i++) items.push(T(rndNonZero(-8, 9), v));
    return { type: 'Just collect', goal: 'simplify', items: shuffle(items) };
  };

  const collectTwoLetters = () => {
    const [x, y] = twoLetters();
    const shapes = shuffle([{ [x]: 1 }, { [y]: 1 }, { [x]: 1, [y]: 1 }]).slice(0, rnd(2, 3));
    const items = [];
    for (const v of shapes) for (let i = 0; i < 2; i++) items.push(T(rndNonZero(-7, 8), v));
    return { type: 'Just collect', goal: 'simplify', items: shuffle(items) };
  };

  /* ---------------- factorising ---------------- */

  const factorCommon = () => {
    const x = V();
    const g = rnd(2, 6);
    return { type: 'Build a bracket', goal: 'factor',
             items: [T(g * rnd(1, 4), { [x]: 2 }), T(g * rndNonZero(-5, 5), { [x]: 1 })] };
  };

  const factorCommonNumber = () => {
    const x = V();
    const g = rnd(2, 7);
    // the inside must not itself share a factor, or one "build a bracket" is not enough
    let a, b;
    do { a = rnd(2, 5); b = rndNonZero(-6, 6); } while (Algebra.gcdAll([a, b]) !== 1);
    return { type: 'Build a bracket', goal: 'factor',
             items: [T(g * a, { [x]: 1 }), T(g * b)] };
  };

  const factorDifferenceOfSquares = () => {
    const x = V();
    const n = rnd(2, 10);
    return { type: 'Square minus square', goal: 'factor',
             items: [T(1, { [x]: 2 }), T(-(n * n))] };
  };

  const factorTrinomial = () => {
    const x = V();
    let m, n;
    do { m = rndNonZero(-7, 7); n = rndNonZero(-7, 7); } while (m + n === 0);
    return { type: 'Split the middle', goal: 'factor',
             items: [T(1, { [x]: 2 }), T(m + n, { [x]: 1 }), T(m * n)] };
  };

  /* ---------------- fractions ---------------- */

  /** (g·a·x² + g·b·x) / (c·g·x) — cancels the x block. */
  const fracCommonFactor = () => {
    const x = V();
    const g = rnd(2, 5);
    let a, b;
    do { a = rnd(2, 4); b = rndNonZero(-5, 5); } while (Algebra.gcdAll([a, b]) !== 1);
    return { type: 'Cancel it down', goal: 'fraction',
             items: [{ k: 'f',
                       num: [T(g * a, { [x]: 2 }), T(g * b, { [x]: 1 })],
                       den: [T(g, { [x]: 1 })] }] };
  };

  /** (x + n)² over (x − n)(x + n) — the wall chart's worked example. */
  const fracTrinomialOverSquares = () => {
    const x = V();
    const n = rnd(2, 8);
    return { type: 'Cancel it down', goal: 'fraction',
             items: [{ k: 'f',
                       num: [T(1, { [x]: 2 }), T(2 * n, { [x]: 1 }), T(n * n)],
                       den: [T(1, { [x]: 2 }), T(-(n * n))] }] };
  };

  /** (x + m)(x + n) over k(x + n) — a trinomial on top, a common factor below. */
  const fracTrinomialOverCommon = () => {
    const x = V();
    let m, n, k;
    do { m = rndNonZero(-6, 6); n = rndNonZero(-6, 6); k = rnd(2, 5); }
    while (m + n === 0 || m === n);
    return { type: 'Cancel it down', goal: 'fraction',
             items: [{ k: 'f',
                       num: [T(1, { [x]: 2 }), T(m + n, { [x]: 1 }), T(m * n)],
                       den: [T(k, { [x]: 1 }), T(k * n)] }] };
  };

  /* ---------------- pools ---------------- */

  const BRACKETS = [expandSimple, expandTermMultiplier, minusBracket, minusBracketBoth,
                    twoBrackets, squareBracket, sumTimesDifference,
                    expandThenCollect, twoBracketsThenCollect];
  const POWERS = [powerMultiply, powerMultiplyCoeffs, powerTwoLetters, powerThenCollect];
  const COLLECT = [collectOnly, collectTwoLetters];
  const FACTOR = [factorCommon, factorCommonNumber, factorDifferenceOfSquares, factorTrinomial];
  const FRACTIONS = [fracCommonFactor, fracTrinomialOverSquares, fracTrinomialOverCommon];
  const EVERYTHING = [...BRACKETS, ...POWERS, ...COLLECT, ...FACTOR, ...FRACTIONS];

  // named, so the test report can say which family broke
  const ALL = {
    expandSimple, expandTermMultiplier, minusBracket, minusBracketBoth, twoBrackets,
    squareBracket, sumTimesDifference, expandThenCollect, twoBracketsThenCollect,
    powerMultiply, powerMultiplyCoeffs, powerTwoLetters, powerThenCollect,
    collectOnly, collectTwoLetters,
    factorCommon, factorCommonNumber, factorDifferenceOfSquares, factorTrinomial,
    fracCommonFactor, fracTrinomialOverSquares, fracTrinomialOverCommon,
  };

  return { BRACKETS, POWERS, COLLECT, FACTOR, FRACTIONS, EVERYTHING, ALL };
})();
