/* mathlab stories — word problems that become a pair of equations.

   Nine families, many skins each. Every problem is built backwards: the answer is chosen
   first (whole counts, sensible prices, real angles), then the totals in the story are
   computed from it. So the numbers always work, and no two rounds read the same.

   Each family offers the right equation next to the equations the classic mistakes
   produce: total used as a count, prices swapped, cents mixed with dollars, the age shift
   given to one person only, x + 1 for consecutive odd numbers. Depends on MathLab and
   Linear. Pure — no DOM. */

const Stories = (() => {
  const { rnd, pick, shuffle } = MathLab;
  const { Q, E, add, sub, mul, div, eq, num, isInt, money, qNice, T, equivalent, MINUS } = Linear;

  const NAMES = ['Wei Ling', 'Arjun', 'Siti', 'Marcus', 'Mei', 'Ravi', 'Hui Min', 'Daniel', 'Aisha',
    'Jun Jie', 'Priya', 'Ethan', 'Nurul', 'Kai', 'Zara', 'Hafiz', 'Chloe', 'Rahul', 'Sofia', 'Ben',
    'Amir', 'Li Ting', 'Noah', 'Farah', 'Ryan', 'Ananya', 'Isaac', 'Yu Xuan', 'Leo', 'Divya'];

  const times = (k) => ({ 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times' }[k] || k + ' times');
  const twoNames = () => { const [a, b] = shuffle(NAMES.slice()).slice(0, 2); return [a, b]; };
  const cents = (c) => money(Q(c, 100));
  const step = (lo, hi, by) => lo + by * rnd(0, Math.floor((hi - lo) / by));

  /** A term shown as k(inner): the bracket is kept so the equation reads like the story. */
  function B(c, inner) {
    c = Q(c);
    const mag = Linear.abs(c);
    return { c, v: '()', raw: (eq(mag, 1) ? '' : qNice(mag)) + '(' + Linear.sideNice(inner) + ')' };
  }

  /** One right equation plus distinct wrong ones (a wrong one equal to the right one is dropped). */
  function options(right, traps) {
    const out = [{ ...right, ok: true }];
    for (const t of traps) {
      if (out.length >= 4) break;
      if (!t || !t.eq) continue;
      if (out.some((o) => equivalent(o.eq, t.eq))) continue;
      out.push({ ...t, ok: false });
    }
    return out;
  }

  const KINDS = {
    'count-value': { label: 'Count and value', blurb: 'How many things altogether, and what they are worth altogether.' },
    'two-baskets': { label: 'Two shopping lists', blurb: 'Same two prices, two different baskets.' },
    relation: { label: '“More than” or “times as many”', blurb: 'One amount is described using another.' },
    'break-even': { label: 'Which deal is cheaper?', blurb: 'A fixed fee plus a cost for each one.' },
    shape: { label: 'Shape facts', blurb: 'Sides or angles that must be equal, or add up to something.' },
    age: { label: 'Ages', blurb: 'Everyone gets older by the same number of years.' },
    number: { label: 'Number puzzle', blurb: 'Sums, differences, averages of unknown numbers.' },
    mixture: { label: 'Mixture', blurb: 'Two strengths mixed to make a third.' },
    fraction: { label: 'Fraction puzzle', blurb: 'Top and bottom of a fraction change together.' },
  };

  /* ================= count and value =================
     a + b = N  and  p·a + q·b = V. Tickets, coins, legs, wheels, marks, litres. */

  const COUNT_SKINS = [
    () => {
      const adult = step(12, 36, 2), child = step(6, adult - 4, 2);
      return { A: ['a', 'adult tickets', adult, '$'], B: ['c', 'child tickets', child, '$'], money: true,
        text: (n, v, who) => `${who} buys <b>${n}</b> tickets for the school musical. Adult tickets cost <b>$${adult}</b> and child tickets cost <b>$${child}</b>. Altogether the tickets cost <b>$${v}</b>.`,
        ask: 'How many of each ticket?' };
    },
    () => {
      const [lo, hi] = pick([[10, 50], [20, 50], [5, 20], [50, 100], [10, 20], [20, 100]]);
      const nm = (c) => (c === 100 ? '$1' : c + '-cent');
      return { A: ['t', nm(lo) + ' coins', lo, 'c'], B: ['f', nm(hi) + ' coins', hi, 'c'], coins: true,
        text: (n, v, who) => `${who}'s money tin holds <b>${n}</b> coins, all ${nm(lo)} and ${nm(hi)} coins. They are worth <b>${cents(v)}</b> altogether.`,
        ask: 'How many of each coin?' };
    },
    () => {
      const [a, b] = pick([['chickens', 'goats'], ['ducks', 'cows'], ['chickens', 'rabbits'], ['geese', 'sheep']]);
      return { A: ['h', a, 2, ''], B: ['g', b, 4, ''], unit: 'legs',
        text: (n, v) => `A farm has only ${a} and ${b}. Between them there are <b>${n}</b> heads and <b>${v}</b> legs.`,
        ask: `How many ${a} and how many ${b}?` };
    },
    () => ({ A: ['b', 'beetles', 6, ''], B: ['s', 'spiders', 8, ''], unit: 'legs',
      text: (n, v) => `A science class keeps beetles (6 legs) and spiders (8 legs) in one tank. There are <b>${n}</b> creatures with <b>${v}</b> legs in total.`,
      ask: 'How many beetles and how many spiders?' }),
    () => {
      const [a, pa, b, pb] = pick([['bicycles', 2, 'tricycles', 3], ['motorbikes', 2, 'cars', 4], ['cars', 4, 'lorries', 6]]);
      return { A: ['m', a, pa, ''], B: ['k', b, pb, ''], unit: 'wheels',
        text: (n, v) => `A car park has <b>${n}</b> vehicles, all ${a} and ${b}. Together they have <b>${v}</b> wheels.`,
        ask: `How many ${a} and how many ${b}?` };
    },
    () => {
      const [lo, hi] = pick([[2, 5], [1, 3], [2, 3], [3, 5]]);
      return { A: ['s', lo + '-mark questions', lo, ''], B: ['l', hi + '-mark questions', hi, ''], unit: 'marks',
        text: (n, v) => `A maths quiz has <b>${n}</b> questions worth <b>${v}</b> marks in total. Each question is worth either ${lo} or ${hi} marks.`,
        ask: `How many ${lo}-mark and how many ${hi}-mark questions?` };
    },
    () => ({ A: ['t', 'two-pointers', 2, ''], B: ['h', 'three-pointers', 3, ''], unit: 'points',
      text: (n, v, who) => `${who} scored <b>${v}</b> points in a basketball game from <b>${n}</b> baskets — only two-pointers and three-pointers.`,
      ask: 'How many of each kind of basket?' }),
    () => {
      const small = pick([280, 320, 350, 390]), large = small + pick([80, 100, 120, 150]);
      return { A: ['r', 'regular cups', small, '$c'], B: ['l', 'large cups', large, '$c'], moneyCents: true,
        text: (n, v) => `A bubble tea stall sold <b>${n}</b> drinks before lunch. Regular cups cost <b>${cents(small)}</b> and large cups <b>${cents(large)}</b>. It took <b>${cents(v)}</b>.`,
        ask: 'How many regular and how many large cups?' };
    },
    () => {
      const [a, b] = pick([[1, 2], [1, 3], [2, 5]]);
      return { A: ['p', a + '-litre cartons', a, ''], B: ['q', b + '-litre cartons', b, ''], unit: 'litres',
        text: (n, v) => `Milk comes in ${a}-litre and ${b}-litre cartons. A shop receives <b>${n}</b> cartons holding <b>${v}</b> litres.`,
        ask: 'How many of each carton?' };
    },
    () => {
      const p1 = step(4, 6, 1), p2 = p1 + rnd(1, 2);
      return { A: ['r', 'chicken rice', p1, '$'], B: ['n', 'nasi lemak', p2, '$'], money: true,
        text: (n, v) => `A class orders <b>${n}</b> hawker lunches: chicken rice at <b>$${p1}</b> and nasi lemak at <b>$${p2}</b>. The bill is <b>$${v}</b>.`,
        ask: 'How many of each lunch?' };
    },
  ];

  function countValue() {
    const skin = pick(COUNT_SKINS)();
    const [la, na, pa] = skin.A;
    const [lb, nb, pb] = skin.B;
    const a = rnd(3, 24);
    const b = pick([...Array(22).keys()].map((i) => i + 3).filter((n) => n !== a));   // a ≠ b: else swapping prices changes nothing
    const N = a + b;
    const V = pa * a + pb * b;
    const who = pick(NAMES);
    const text = skin.text(N, V, who);
    const order = [la, lb];
    const countEq = E({ [la]: 1, [lb]: 1 }, N);
    const valEq = E({ [la]: pa, [lb]: pb }, V);
    const valUnits = skin.coins || skin.moneyCents ? 'cents' : skin.money ? 'dollars' : skin.unit;

    const countOpts = options({ eq: countEq }, [
      { eq: E({ [la]: 1, [lb]: 1 }, V), trap: 'count-is-value', why: `${N} is the number of ${skin.coins ? 'coins' : 'things'}; ${V} ${valUnits} is what they are worth. Count with the count.` },
      { eq: E({ [la]: pa, [lb]: pb }, N), trap: 'value-is-count', why: `That multiplies by the ${skin.unit || 'price'}, so it measures ${valUnits}, but ${N} is a count.` },
    ]);
    const valOpts = options({ eq: valEq }, [
      { eq: E({ [la]: pb, [lb]: pa }, V), trap: 'swap-values', why: `Each ${na.replace(/s$/, '')} is worth ${pa}, so ${pa} goes with ${la}.` },
      skin.coins || skin.moneyCents
        ? { eq: E({ [la]: pa, [lb]: pb }, Q(V, 100)), trap: 'units-mix', why: 'Mixed units: the coin values are in cents, so the total must be in cents too.' }
        : { eq: E({ [lb]: pb }, V - pa), disp: { L: [T(pa), T(pb, lb)], R: [T(V)] }, trap: 'dropped-letter', why: `${pa}${la} means ${pa} for each one — the letter ${la} must stay.` },
      { eq: E({ [la]: 1, [lb]: 1 }, V), trap: 'count-is-value', why: `Every ${na.replace(/s$/, '')} counts ${pa}, not 1.` },
    ]);

    return {
      family: 'count-value',
      text: text + ' ' + skin.ask,
      letters: [{ v: la, means: 'the number of ' + na }, { v: lb, means: 'the number of ' + nb }],
      order,
      eqs: [
        { because: `Every one of the ${N} is either ${na.replace(/s$/, '')} or ${nb.replace(/s$/, '')}, so the two counts add up to ${N}.`, prompt: 'Which equation counts them?', eq: countEq, options: countOpts },
        { because: `Each ${na.replace(/s$/, '')} is worth ${pa} and each ${nb.replace(/s$/, '')} ${pb}: ${pa} × ${la} plus ${pb} × ${lb} gives the total, ${V} ${valUnits}.`, prompt: `Which equation adds up the ${valUnits}?`, eq: valEq, options: valOpts },
      ],
      sol: { [la]: Q(a), [lb]: Q(b) },
      whole: [la, lb],
      units: { [la]: na, [lb]: nb },
      sentence: `${a} ${na} and ${b} ${nb}.`,
    };
  }

  /* ================= two baskets =================
     x1·a + y1·b = T1 and x2·a + y2·b = T2: same prices, different shopping. */

  const BASKET_SKINS = [
    { a: ['h', 'hammer', 'hammers', [900, 1800]], b: ['s', 'screwdriver', 'screwdrivers', [300, 800]], where: 'at the hardware shop' },
    { a: ['p', 'pen', 'pens', [120, 350]], b: ['n', 'notebook', 'notebooks', [180, 450]], where: 'at the bookshop' },
    { a: ['k', 'kaya toast set', 'kaya toast sets', [180, 320]], b: ['t', 'teh', 'tehs', [120, 200]], where: 'at the kopitiam' },
    { a: ['a', 'adult ticket', 'adult tickets', [1800, 3200]], b: ['c', 'child ticket', 'child tickets', [800, 1600]], where: 'for the same show' },
    { a: ['n', 'nectarine', 'nectarines', [40, 90]], b: ['p', 'peach', 'peaches', [20, 70]], where: 'at the market' },
    { a: ['c', 'comic', 'comics', [400, 900]], b: ['m', 'magazine', 'magazines', [300, 700]], where: 'at the second-hand stall' },
    { a: ['f', 'fern', 'ferns', [500, 1200]], b: ['k', 'cactus', 'cacti', [300, 900]], where: 'at the plant nursery' },
    { a: ['b', 'burger', 'burgers', [450, 750]], b: ['f', 'portion of fries', 'portions of fries', [200, 350]], where: 'at the burger place' },
  ];

  function twoBaskets() {
    const s = pick(BASKET_SKINS);
    const [la, one_a, many_a, [loA, hiA]] = s.a;
    const [lb, one_b, many_b, [loB, hiB]] = s.b;
    const pa = step(loA, hiA, 10);
    let pb = step(loB, hiB, 10);
    if (pb === pa) pb += 10;                             // equal prices would make a swapped basket look right
    // every pair of baskets that pins the prices down (not proportional), then pick one
    const baskets = [];
    for (let x1 = 1; x1 <= 5; x1++) for (let y1 = 1; y1 <= 5; y1++)
      for (let x2 = 1; x2 <= 5; x2++) for (let y2 = 1; y2 <= 5; y2++)
        if (x1 * y2 - x2 * y1 !== 0) baskets.push([x1, y1, x2, y2]);
    const [x1, y1, x2, y2] = pick(baskets);
    const t1 = x1 * pa + y1 * pb, t2 = x2 * pa + y2 * pb;
    const [w1, w2] = twoNames();
    const qty = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    const text = `${w1} buys ${qty(x1, one_a, many_a)} and ${qty(y1, one_b, many_b)} ${s.where} for <b>${cents(t1)}</b>. ` +
      `${w2} buys ${qty(x2, one_a, many_a)} and ${qty(y2, one_b, many_b)} for <b>${cents(t2)}</b>. Find the price of one ${one_a} and one ${one_b}.`;
    const dollars = (c) => Q(c, 100);
    const e1 = E({ [la]: x1, [lb]: y1 }, dollars(t1));
    const e2 = E({ [la]: x2, [lb]: y2 }, dollars(t2));
    const opts = (e, x, y, t, tOther, w) => options({ eq: e }, [
      { eq: E({ [la]: y, [lb]: x }, dollars(t)), trap: 'swap-quantities', why: `${w} bought ${qty(x, one_a, many_a)}, so ${x} goes with ${la}.` },
      { eq: E({ [la]: x, [lb]: y }, dollars(tOther)), trap: 'wrong-total', why: `That total belongs to the other shopper.` },
      { eq: E({ [la]: 1, [lb]: 1 }, dollars(t)), trap: 'count-is-value', why: `${la} is the price of one ${one_a}; ${w} bought ${x} of them, so ${x}${la}.` },
    ]);
    return {
      family: 'two-baskets',
      text,
      letters: [{ v: la, means: `the price of one ${one_a} in dollars` }, { v: lb, means: `the price of one ${one_b} in dollars` }],
      order: [la, lb],
      eqs: [
        { because: `${w1}'s basket: ${x1} × ${la} plus ${y1} × ${lb} costs ${cents(t1)}.`, prompt: `Which equation is ${w1}'s shopping?`, eq: e1, options: opts(e1, x1, y1, t1, t2, w1) },
        { because: `${w2}'s basket: ${x2} × ${la} plus ${y2} × ${lb} costs ${cents(t2)}. Same prices, different basket — that is the second equation.`, prompt: `Which equation is ${w2}'s shopping?`, eq: e2, options: opts(e2, x2, y2, t2, t1, w2) },
      ],
      sol: { [la]: Q(pa, 100), [lb]: Q(pb, 100) },
      whole: [],
      positive: [la, lb],
      money: [la, lb],
      cents2: true,
      sentence: `One ${one_a} costs ${cents(pa)} and one ${one_b} costs ${cents(pb)}.`,
    };
  }

  /* ================= relations =================
     "k more than", "twice as many" — and the three-unknown chains that collapse to one. */

  function relation() {
    const variant = pick(['more-value', 'more-value', 'times-total', 'chain']);
    const who = pick(NAMES);

    if (variant === 'more-value') {
      const skin = pick([
        { A: ['s', 'sundaes', 2], B: ['b', 'banana splits', 3], unit: '$', place: 'The Frosty Ice-Cream Shop sells sundaes for $2 and banana splits for $3. On a hot day it sold' },
        { A: ['t', '10-cent coins', 10], B: ['w', '20-cent coins', 20], unit: 'c', place: `${who}'s jar holds only 10-cent and 20-cent coins. It has` },
        { A: ['m', 'muffins', 3], B: ['c', 'cookies', 2], unit: '$', place: 'At the bake sale, muffins cost $3 and cookies $2. The class sold' },
        { A: ['g', 'green stickers', 5], B: ['r', 'red stickers', 8], unit: 'pts', place: 'In a sticker game each green sticker is worth 5 points and each red sticker 8 points. Kim has' },
      ]);
      const [la, na, pa] = skin.A, [lb, nb, pb] = skin.B;
      const b = rnd(4, 30), k = rnd(3, 12), a = b + k;
      const V = pa * a + pb * b;
      const total = skin.unit === '$' ? '$' + V : skin.unit === 'c' ? cents(V) : V + ' points';
      const text = `${skin.place} <b>${k} more</b> ${na} than ${nb}, worth <b>${total}</b> altogether. How many of each?`;
      const unitsLabel = skin.unit === 'c' ? 'cents' : skin.unit === '$' ? 'dollars' : 'points';
      const rel = E({ [la]: 1, [lb]: -1 }, k);
      const val = E({ [la]: pa, [lb]: pb }, V);
      return {
        family: 'relation',
        text,
        letters: [{ v: la, means: 'the number of ' + na }, { v: lb, means: 'the number of ' + nb }],
        order: [la, lb],
        eqs: [
          { because: `${k} more ${na} than ${nb}: take the number of ${nb} and add ${k}.`, prompt: `Which equation says there are ${k} more ${na}?`, eq: rel, layout: () => ({ L: [T(1, la)], R: [T(1, lb), T(k)] }),
            options: options({ eq: rel, disp: { L: [T(1, la)], R: [T(1, lb), T(k)] } }, [
              { eq: E({ [lb]: 1, [la]: -1 }, k), disp: { L: [T(1, lb)], R: [T(1, la), T(k)] }, trap: 'more-reversed', why: `There are more ${na}, so ${la} is the bigger one: add ${k} to ${lb}.` },
              { eq: E({ [la]: 1, [lb]: -k }, 0), disp: { L: [T(1, la)], R: [T(k, lb)] }, trap: 'more-is-times', why: `“${k} more” means add ${k}, not multiply by ${k}.` },
            ]) },
          { because: `Count × value for each kind, added: ${pa}${la} + ${pb}${lb} = ${V}.`, prompt: `Which equation adds up the ${unitsLabel}?`, eq: val,
            options: options({ eq: val }, [
              { eq: E({ [la]: pb, [lb]: pa }, V), trap: 'swap-values', why: `${na} are worth ${pa} each, so ${pa}${la}.` },
              { eq: E({ [la]: 1, [lb]: 1 }, V), trap: 'count-is-value', why: `${V} is a value, not a count. Multiply each count by what one is worth.` },
            ]) },
        ],
        sol: { [la]: Q(a), [lb]: Q(b) },
        whole: [la, lb],
        sentence: `${a} ${na} and ${b} ${nb}.`,
      };
    }

    if (variant === 'times-total') {
      const skin = pick([
        { A: ['g', 'girls'], B: ['b', 'boys'], text: (k, n) => `A coding club has <b>${times(k)} as many girls as boys</b>. There are <b>${n}</b> members.` },
        { A: ['r', 'red marbles'], B: ['u', 'blue marbles'], text: (k, n) => `${who} has <b>${times(k)} as many red marbles as blue ones</b>, <b>${n}</b> marbles in all.` },
        { A: ['f', 'fiction books'], B: ['n', 'non-fiction books'], text: (k, n) => `A shelf holds <b>${n}</b> books, with <b>${times(k)} as many fiction as non-fiction</b>.` },
      ]);
      const [la, na] = skin.A, [lb, nb] = skin.B;
      const k = rnd(2, 5), b = rnd(3, 25), a = k * b, n = a + b;
      const rel = E({ [la]: 1, [lb]: -k }, 0);
      const tot = E({ [la]: 1, [lb]: 1 }, n);
      return {
        family: 'relation',
        text: skin.text(k, n) + ' How many of each?',
        letters: [{ v: la, means: 'the number of ' + na }, { v: lb, means: 'the number of ' + nb }],
        order: [la, lb],
        eqs: [
          { because: `For every one of the ${nb} there are ${k} ${na}, so ${la} is ${k} × ${lb}. Test: if ${lb} = 1, ${la} = ${k}.`, prompt: `Which equation says there are ${times(k)} as many ${na}?`, eq: rel,
            options: options({ eq: rel, disp: { L: [T(1, la)], R: [T(k, lb)] } }, [
              { eq: E({ [lb]: 1, [la]: -k }, 0), disp: { L: [T(k, la)], R: [T(1, lb)] }, trap: 'times-reversed',
                why: `Check with numbers: if there were 1 of the ${nb}, there would be ${k} ${na}. So ${la} = ${k}${lb}. (This is the famous “6S = P” trap.)` },
              { eq: E({ [la]: 1, [lb]: -1 }, k), disp: { L: [T(1, la)], R: [T(1, lb), T(k)] }, trap: 'times-is-more', why: `“${k} times as many” multiplies — it is not “${k} more”.` },
            ]) },
          { because: `Every member is one or the other, so the two counts add up to ${n}.`, prompt: 'Which equation is the total?', eq: tot,
            options: options({ eq: tot }, [
              { eq: E({ [la]: k, [lb]: 1 }, n), trap: 'times-in-total', why: `${la} already counts every one of the ${na}. Just add the two counts.` },
            ]) },
        ],
        sol: { [la]: Q(a), [lb]: Q(b) },
        whole: [la, lb],
        sentence: `${a} ${na} and ${b} ${nb}.`,
      };
    }

    // chain: three unknowns, described from one of them, collapse to a single equation
    const skin = pick([
      { kinds: [['$2 notes', 2], ['$5 notes', 5], ['$10 notes', 10]], intro: 'A cashier puts', end: 'in notes into the drawer', money: true },
      { kinds: [['10-cent coins', 10], ['20-cent coins', 20], ['50-cent coins', 50]], intro: `${who}'s piggy bank holds`, end: 'in coins', cents: true },
      { kinds: [['$8 tickets', 8], ['$15 tickets', 15], ['$20 tickets', 20]], intro: 'A football club sold tickets worth', end: 'in total', money: true },
    ]);
    const [[nA, vA], [nB, vB], [nC, vC]] = skin.kinds;
    const k = pick([2, 3]);
    const d = rnd(1, 6);
    const n = rnd(d + 2, 14);
    const cA = k * n, cB = n, cC = n - d;            // A: k times B, C: d fewer than B
    const V = vA * cA + vB * cB + vC * cC;
    const total = skin.cents ? cents(V) : '$' + V;
    const text = `${skin.intro} <b>${total}</b> ${skin.end}: only ${nA}, ${nB} and ${nC}. There are <b>${k === 2 ? 'twice' : 'three times'} as many ${nA} as ${nB}</b>, and <b>${d} fewer ${nC} than ${nB}</b>. How many of each?`;
    const right = E({ n: vA * k + vB + vC }, V + vC * d);
    const disp = { L: [B(vA, [T(k, 'n')]), T(vB, 'n'), B(vC, [T(1, 'n'), T(-d)])], R: [T(V)] };
    return {
      family: 'relation',
      text,
      letters: [{ v: 'n', means: 'the number of ' + nB }],
      derived: [
        { label: nA, html: (k === 2 ? '2' : '3') + '<i class="var">n</i>', value: (s) => mul(k, s.n) },
        { label: nB, html: '<i class="var">n</i>', value: (s) => s.n },
        { label: nC, html: '<i class="var">n</i> ' + MINUS + ' ' + d, value: (s) => sub(s.n, d) },
      ],
      order: ['n'],
      eqs: [
        { because: `Each kind's count × its value, all added: the ${nA} are ${k}n, the ${nB} n, the ${nC} n − ${d}.`, prompt: 'Which equation adds up the money?', eq: right,
          options: options({ eq: right, disp }, [
            { eq: E({ n: vA * k + vB + vC }, V - vC * d), disp: { L: [B(vA, [T(k, 'n')]), T(vB, 'n'), B(vC, [T(1, 'n'), T(d)])], R: [T(V)] }, trap: 'fewer-reversed',
              why: `${d} fewer means take ${d} away: n ${MINUS} ${d}.` },
            { eq: E({ n: k + 1 + 1 }, V + d), disp: { L: [T(k, 'n'), T(1, 'n'), T(1, 'n'), T(-d)], R: [T(V)] }, trap: 'count-is-value',
              why: `That adds up how many there are, but ${total} is what they are worth. Multiply each count by its value.` },
            { eq: E({ n: vA + vB + vC }, V + vC * d), disp: { L: [T(vA, 'n'), T(vB, 'n'), B(vC, [T(1, 'n'), T(-d)])], R: [T(V)] }, trap: 'times-dropped',
              why: `There are ${k === 2 ? 'twice' : 'three times'} as many ${nA}: that count is ${k}n, worth ${vA} × ${k}n.` },
          ]) },
      ],
      sol: { n: Q(n) },
      whole: ['n'],
      sentence: `${cA} ${nA}, ${cB} ${nB} and ${cC} ${nC}.`,
      finalCounts: true,
    };
  }

  /* ================= break-even =================
     c = f1 + r1·n  vs  c = f2 + r2·n. The answer is a decision, in whole units. */

  const DEALS = [
    { unit: ['day', 'days'], L: 'd', things: ['FastCar', 'CityRent'], intro: 'Two companies hire out cars.', fee: 'a flat fee of', rate: 'per day', rates: [[40, 60], [25, 45]], fees: true },
    { unit: ['month', 'months'], L: 'm', things: ['the Basic phone plan', 'the Plus plan'], intro: 'A phone shop offers two plans.', fee: 'a sign-up fee of', rate: 'a month', rates: [[25, 40], [10, 22]] },
    { unit: ['visit', 'visits'], L: 'v', things: ['GymGo', 'FitHub'], intro: 'Two gyms charge differently.', fee: 'a joining fee of', rate: 'per visit', rates: [[8, 15], [2, 6]] },
    { unit: ['movie', 'movies'], L: 'm', things: ['the Basic plan', 'the Deluxe plan'], intro: 'A streaming site has two plans.', fee: 'an access charge of', rate: 'per movie', rates: [[2, 4], [0.25, 1]], cents: true },
    { unit: ['km', 'km'], L: 'k', things: ['the taxi', 'the ride-share'], intro: 'Two ways to get home.', fee: 'a starting fare of', rate: 'per km', rates: [[0.6, 1], [0.3, 0.55]], cents: true },
    { unit: ['person', 'people'], L: 'p', things: ['the Grand Ballroom', 'the Palace Ballroom'], intro: 'Two halls for a party.', fee: 'a room fee of', rate: 'per guest', rates: [[1.5, 3], [0.5, 1.25]], cents: true, big: true },
    { unit: ['lesson', 'lessons'], L: 'l', things: ['the music school', 'the private teacher'], intro: 'Guitar lessons, two ways.', fee: 'a registration fee of', rate: 'per lesson', rates: [[35, 50], [20, 32]] },
    { unit: ['page', 'pages'], L: 'p', things: ['PrintPro', 'CopyKing'], intro: 'Printing a class magazine.', fee: 'a set-up charge of', rate: 'per page', rates: [[0.2, 0.4], [0.05, 0.15]], cents: true, big: true },
  ];

  function breakEven() {
    const s = pick(DEALS);
    const L = s.L;
    // rates in cents, multiples of 5
    const [r1lo, r1hi] = s.rates[0], [r2lo, r2hi] = s.rates[1];
    const toC = (v) => Math.round(v * 100);
    // whole-dollar deals stay in whole dollars; only the per-km / per-page kind needs cents
    const by = s.cents ? 5 : 100;
    const r1 = step(toC(r1lo), toC(r1hi), by);
    let r2 = step(toC(r2lo), Math.min(toC(r2hi), r1 - by), by);
    if (r2 >= r1) r2 = r1 - by;
    const nStar = s.big ? step(40, 300, 10) : rnd(4, 30);
    const f1 = Math.random() < 0.35 ? 0 : step(0, 6000, 500);
    const f2 = f1 + (r1 - r2) * nStar;                  // equal at nStar
    if (f2 > (s.big ? 200000 : 50000)) return breakEven();
    const cStar = f1 + r1 * nStar;
    const [A, Bn] = s.things;
    const pr = (c) => cents(c);
    const desc = (f, r) => (f === 0 ? `${pr(r)} ${s.rate}, no fee` : `${s.fee} ${pr(f)} plus ${pr(r)} ${s.rate}`);
    const text = `${s.intro} <b>${A[0].toUpperCase() + A.slice(1)}</b> charges ${desc(f1, r1)}. <b>${Bn[0].toUpperCase() + Bn.slice(1)}</b> charges ${desc(f2, r2)}.`;
    const Qd = (c) => Q(c, 100);
    const e1 = E({ c: 1, [L]: Qd(-r1) }, Qd(f1));
    const e2 = E({ c: 1, [L]: Qd(-r2) }, Qd(f2));
    const lay = (e) => Linear.layoutFor(e, 'c', true);
    const optsFor = (e, f, r, name) => options({ eq: e }, [
      { eq: E({ c: 1 }, Qd(f + r)), disp: { L: [T(1, 'c')], R: [T(Qd(f)), T(Qd(r))] }, trap: 'dropped-letter', why: `${pr(r)} ${s.rate} depends on how many ${s.unit[1]}: it is ${qNice(Qd(r))}${L}, with the letter.` },
      f === 0 ? null : { eq: E({ c: 1, [L]: Qd(-f) }, Qd(r)), trap: 'fee-rate-swapped', why: `The fee is paid once; the ${pr(r)} is paid every ${s.unit[0]}, so it goes with ${L}.` },
      { eq: E({ c: 1, [L]: Qd(-(r === r1 ? r2 : r1)) }, Qd(f)), trap: 'wrong-rate', why: `${name} charges ${pr(r)} ${s.rate}.` },
    ]);
    const ask = pick(['after', 'choose', 'equal']);
    const unitN = (n) => n + ' ' + (n === 1 ? s.unit[0] : s.unit[1]);
    let final;
    if (ask === 'after') {
      final = {
        prompt: `So when is <b>${Bn}</b> the cheaper choice?`,
        options: shuffle([
          { label: `From ${unitN(nStar + 1)} on`, ok: true, why: `They are equal at ${unitN(nStar)}. After that ${Bn}'s lower rate keeps it cheaper — and it has to be whole ${s.unit[1]}.` },
          { label: `From ${unitN(nStar)} on`, ok: false, trap: 'break-even-equal', why: `At ${unitN(nStar)} they cost exactly the same — not cheaper yet.` },
          { label: `Up to ${unitN(nStar - 1)}`, ok: false, trap: 'break-even-direction', why: `${Bn} costs more to start with. It only wins once enough ${s.unit[1]} pile up at its lower rate.` },
          { label: 'Never', ok: false, trap: 'break-even-never', why: `Its rate is lower (${pr(r2)} vs ${pr(r1)}), so it always catches up eventually.` },
        ]),
      };
    } else if (ask === 'choose') {
      const big = pick([true, false]);
      const n = big ? nStar + (s.big ? step(20, 80, 10) : rnd(3, 12)) : Math.max(1, nStar - (s.big ? step(20, 30, 10) : rnd(2, Math.min(6, nStar - 1))));
      const cA = f1 + r1 * n, cB = f2 + r2 * n;
      const better = cA < cB ? A : Bn;
      final = {
        prompt: `${pick(NAMES)} needs it for <b>${unitN(n)}</b>. Which is cheaper?`,
        options: [
          { label: A[0].toUpperCase() + A.slice(1), ok: better === A, trap: 'break-even-side', why: `At ${unitN(n)}: ${A} costs ${pr(cA)} and ${Bn} costs ${pr(cB)}.` },
          { label: Bn[0].toUpperCase() + Bn.slice(1), ok: better === Bn, trap: 'break-even-side', why: `At ${unitN(n)}: ${A} costs ${pr(cA)} and ${Bn} costs ${pr(cB)}.` },
        ],
      };
    } else {
      final = null;    // the solve step already asks for n and c
    }
    return {
      family: 'break-even',
      text: text + (ask === 'equal' ? ` For how many ${s.unit[1]} do they cost the same, and what is that cost?` : ''),
      letters: [{ v: L, means: 'the number of ' + s.unit[1] }, { v: 'c', means: 'the total cost in dollars' }],
      order: [L, 'c'],
      eqs: [
        { because: `${A}: the fee once, plus the rate for every one of the ${s.unit[1]}.`, prompt: `Which equation is the cost with ${A}?`, eq: e1, layout: lay, options: optsFor(e1, f1, r1, A) },
        { because: `${Bn}: same pattern — fee once, plus rate × ${L}.`, prompt: `Which equation is the cost with ${Bn}?`, eq: e2, layout: lay, options: optsFor(e2, f2, r2, Bn) },
      ],
      layout: lay,
      cents2: true,
      sol: { [L]: Q(nStar), c: Qd(cStar) },
      whole: [L],
      money: ['c'],
      solvePrompt: 'Where are the two costs equal?',
      final,
      sentence: `They cost the same at ${unitN(nStar)} (${pr(cStar)} each). Below that ${f1 <= f2 ? A : Bn} is cheaper; above it ${f1 <= f2 ? Bn : A} is.`,
      graph: { L, lines: [{ f: Qd(f1), r: Qd(r1), name: A }, { f: Qd(f2), r: Qd(r2), name: Bn }], nStar, cStar: Qd(cStar), unit: s.unit[1] },
    };
  }

  /* ================= shapes ================= */

  function shape() {
    const v = pick(['rect-perimeter', 'rect-sides', 'rect-sides', 'triangle-angles', 'isosceles', 'equilateral', 'scaled-rect']);

    if (v === 'rect-perimeter') {
      const W = rnd(2, 20), k = rnd(2, 15), Lg = W + k, P = 2 * (Lg + W);
      const askArea = Math.random() < 0.5;
      const rel = E({ l: 1, w: -1 }, k), per = E({ l: 2, w: 2 }, P);
      return {
        family: 'shape',
        text: `A rectangle is <b>${k} cm longer than it is wide</b>. Its perimeter is <b>${P} cm</b>. Find its length and width${askArea ? ', and then its area' : ''}.`,
        figure: { type: 'rect', top: 'l', right: 'w', bottom: 'l', left: 'w' },
        letters: [{ v: 'l', means: 'the length in cm' }, { v: 'w', means: 'the width in cm' }],
        order: ['l', 'w'],
        eqs: [
          { because: `${k} cm longer: the length is the width plus ${k}.`, prompt: 'Which equation compares length and width?', eq: rel,
            options: options({ eq: rel, disp: { L: [T(1, 'l')], R: [T(1, 'w'), T(k)] } }, [
              { eq: E({ w: 1, l: -1 }, k), disp: { L: [T(1, 'w')], R: [T(1, 'l'), T(k)] }, trap: 'more-reversed', why: 'The length is the longer side, so add to w to get l.' },
              { eq: E({ l: 1, w: -k }, 0), disp: { L: [T(1, 'l')], R: [T(k, 'w')] }, trap: 'more-is-times', why: `“${k} cm longer” means add ${k}.` },
            ]) },
          { because: 'All the way round: two lengths and two widths.', prompt: 'Which equation is the perimeter?', eq: per,
            options: options({ eq: per }, [
              { eq: E({ l: 1, w: 1 }, P), trap: 'half-perimeter', why: 'The perimeter goes all the way round: two lengths and two widths.' },
              { eq: E({ l: 1, w: 1 }, P * 2), trap: 'perimeter-doubled', why: `The perimeter is ${P}; l + w is only half of it.` },
              { eq: E({ l: 4, w: 0 }, P), trap: 'square', why: 'Only a square has four equal sides.' },
            ]) },
        ],
        sol: { l: Q(Lg), w: Q(W) },
        positive: ['l', 'w'],
        final: askArea ? { because: `Area = length × width = ${Lg} × ${W}.`, prompt: 'Hence, what is its area?', value: Q(Lg * W), unit: 'cm²',
          traps: [{ value: Q(2 * (Lg + W)), why: 'That is the perimeter. Area is length × width.' }, { value: Q(Lg + W), why: 'Area multiplies: length × width.' }] } : null,
        sentence: `Length ${Lg} cm, width ${W} cm${askArea ? `, area ${Lg * W} cm²` : ''}.`,
      };
    }

    if (v === 'rect-sides') {
      // opposite sides of a rectangle (or parallelogram) are equal
      const x = rnd(2, 9), y = rnd(2, 12);
      const p = rnd(1, 4), q = rnd(-6, 8), r = rnd(1, 3);
      const sTop = p * x + q;
      if (sTop <= 0) return shape();
      const s2 = sTop - r * y;                          // bottom r·y + s2 equals the top
      // left/right must not be a multiple of top/bottom, or the pair has no single answer
      const ac = [];
      for (const a_ of [1, 2, 3]) for (const c_ of [1, 2]) if (a_ * r !== p * c_) ac.push([a_, c_]);
      const [a, c] = pick(ac);
      const b = rnd(-4, 6);
      const sLeft = a * x + b;
      if (sLeft <= 0) return shape();
      const dd = sLeft - c * y;
      const kind = pick(['rectangle', 'parallelogram']);
      const lin = (co, v1, k0) => Linear.sideNice([T(co, v1), T(k0)]);
      const top = lin(p, 'x', q), bot = lin(r, 'y', s2), left = lin(a, 'x', b), right = lin(c, 'y', dd);
      const e1 = Linear.tidy(E({ x: p, y: -r }, s2 - q));
      const e2 = Linear.tidy(E({ x: a, y: -c }, dd - b));
      const askP = kind === 'parallelogram' || Math.random() < 0.5;
      const per = 2 * (sTop + sLeft), area = sTop * sLeft;
      const d1 = { L: [T(p, 'x'), T(q)], R: [T(r, 'y'), T(s2)] };
      const d2 = { L: [T(a, 'x'), T(b)], R: [T(c, 'y'), T(dd)] };
      return {
        family: 'shape',
        text: `The figure is a <b>${kind}</b>. Its sides, in cm, are written as expressions. Find <i class="var">x</i> and <i class="var">y</i>, then the ${askP ? 'perimeter' : 'area'}.`,
        figure: { type: kind === 'rectangle' ? 'rect' : 'para', top, bottom: bot, left, right },
        letters: [{ v: 'x', means: 'as in the figure' }, { v: 'y', means: 'as in the figure' }],
        order: ['x', 'y'],
        eqs: [
          { because: 'Opposite sides of a ' + kind + ' are equal, so the top expression equals the bottom one.', prompt: 'Top and bottom are opposite sides. Which equation?', eq: e1,
            options: options({ eq: e1, disp: d1 }, [
              { eq: Linear.tidy(E({ x: p + a, y: 0 }, -q - b)), disp: { L: [T(p, 'x'), T(q)], R: [T(-a, 'x'), T(-b)] }, trap: 'adjacent-sides', why: 'Equal sides are opposite each other — top with bottom, left with right.' },
            ]) },
          { because: 'Left and right are the other pair of opposite sides — also equal.', prompt: 'And left and right?', eq: e2,
            options: options({ eq: e2, disp: d2 }, [
              { eq: Linear.tidy(E({ x: a, y: c }, -dd - b)), disp: { L: [T(a, 'x'), T(b)], R: [T(-c, 'y'), T(-dd)] }, trap: 'sign-copy', why: 'Copy each side exactly as it is written in the figure.' },
              { eq: Linear.tidy(E({ x: a, y: -r }, s2 - b)), disp: { L: [T(a, 'x'), T(b)], R: [T(r, 'y'), T(s2)] }, trap: 'adjacent-sides', why: 'Left pairs with right, not with the bottom.' },
            ]) },
        ],
        sol: { x: Q(x), y: Q(y) },
        final: askP
          ? { because: `Sides ${sTop} and ${sLeft}: perimeter = 2 × (${sTop} + ${sLeft}).`, prompt: 'Hence, the perimeter?', value: Q(per), unit: 'cm', traps: [{ value: Q(sTop + sLeft), why: 'All four sides: two of each.' }, { value: Q(area), why: 'That is the area.' }] }
          : { because: `Put x and y back into the sides: ${sTop} cm and ${sLeft} cm, so area = ${sTop} × ${sLeft}.`, prompt: 'Hence, the area?', value: Q(area), unit: 'cm²', traps: [{ value: Q(per), why: 'That is the perimeter. Area is length × width.' }, { value: Q(x * y), why: `Area uses the side lengths (${sTop} and ${sLeft}), not x and y.` }] },
        sentence: `x = ${x}, y = ${y}: the sides are ${sTop} cm and ${sLeft} cm, ${askP ? `perimeter ${per} cm` : `area ${area} cm²`}.`,
      };
    }

    if (v === 'triangle-angles') {
      // first = k·second, first = third + d, angles add to 180
      const k = pick([2, 3]);
      const options_ = [];
      for (let y = 10; y <= 60; y++) {
        const d = (2 * k + 1) * y - 180;
        const third = k * y - d;
        if (d > 0 && d <= 40 && third > 5) options_.push([y, d]);
      }
      const [y, d] = pick(options_);
      const x = k * y, z = x - d;
      const rel1 = E({ x: 1, y: -k }, 0);
      const sum = E({ x: 2, y: 1 }, 180 + d);
      return {
        family: 'shape',
        text: `In a triangle, the first angle is <b>${k === 2 ? 'twice' : 'three times'}</b> the second, and <b>${d}° larger</b> than the third. Find all three angles.`,
        figure: { type: 'tri', a: 'x', b: 'y', c: `x ${MINUS} ${d}` },
        letters: [{ v: 'x', means: 'the first angle in degrees' }, { v: 'y', means: 'the second angle in degrees' }],
        derived: [
          { label: 'first angle', html: '<i class="var">x</i>', value: (s) => s.x },
          { label: 'second angle', html: '<i class="var">y</i>', value: (s) => s.y },
          { label: 'third angle', html: '<i class="var">x</i> ' + MINUS + ' ' + d, value: (s) => sub(s.x, d) },
        ],
        order: ['x', 'y'],
        eqs: [
          { because: `The first is ${k === 2 ? 'twice' : 'three times'} the second: x = ${k}y.`, prompt: 'Which equation links the first and second angles?', eq: rel1,
            options: options({ eq: rel1, disp: { L: [T(1, 'x')], R: [T(k, 'y')] } }, [
              { eq: E({ y: 1, x: -k }, 0), disp: { L: [T(1, 'y')], R: [T(k, 'x')] }, trap: 'times-reversed', why: `The first is the bigger one: x = ${k}y. Test it: if y = 10, x is ${10 * k}.` },
            ]) },
          { because: 'Angles in a triangle add to 180°. Put all three in, the third as x − ' + d + '.', prompt: 'Which equation uses the angle sum? (The third angle is x − ' + d + '.)', eq: sum,
            options: options({ eq: sum, disp: { L: [T(1, 'x'), T(1, 'y'), B(1, [T(1, 'x'), T(-d)])], R: [T(180)] } }, [
              { eq: E({ x: 2, y: 1 }, 360 + d), disp: { L: [T(1, 'x'), T(1, 'y'), B(1, [T(1, 'x'), T(-d)])], R: [T(360)] }, trap: 'angle-sum-360', why: 'Angles in a triangle add to 180°. 360° is for a full turn or a quadrilateral.' },
              { eq: E({ x: 2, y: 1 }, 180 - d), disp: { L: [T(1, 'x'), T(1, 'y'), B(1, [T(1, 'x'), T(d)])], R: [T(180)] }, trap: 'more-reversed', why: `The first is ${d}° larger than the third, so the third is x − ${d}.` },
            ]) },
        ],
        sol: { x: Q(x), y: Q(y) },
        positive: ['x', 'y'],
        finalCounts: true,
        sentence: `The angles are ${x}°, ${y}° and ${z}°.`,
      };
    }

    if (v === 'isosceles') {
      const base = pick([40, 44, 48, 50, 52, 55, 58, 60, 62, 65, 68, 70, 72, 75]);
      const apex = 180 - 2 * base;
      const x = rnd(10, Math.max(11, base - 5)), y = rnd(10, Math.max(11, base + 20));
      const p = base - x, q = base - y, r = apex - x - y;
      const lin = (terms) => Linear.sideNice(terms);
      const angK = lin([T(1, 'x'), T(1, 'y'), T(r)]), angL = lin([T(1, 'x'), T(p)]), angM = lin([T(1, 'y'), T(q)]);
      const e1 = E({ x: 1, y: -1 }, q - p);
      const e2 = E({ x: 2, y: 2 }, 180 - p - q - r);
      return {
        family: 'shape',
        text: `KLM is an <b>isosceles</b> triangle with KL = KM. Its angles are ∠K = ${angK}°, ∠L = ${angL}° and ∠M = ${angM}°. Find <i class="var">x</i> and <i class="var">y</i>, then the size of ∠K.`,
        figure: { type: 'tri', a: angK, b: angL, c: angM, names: ['K', 'L', 'M'], equalSides: true },
        letters: [{ v: 'x', means: 'as in the angles' }, { v: 'y', means: 'as in the angles' }],
        order: ['x', 'y'],
        eqs: [
          { because: 'KL = KM, so the angles opposite them, ∠L and ∠M, are equal.', prompt: 'The base angles are equal. Which equation?', eq: e1,
            options: options({ eq: e1, disp: { L: [T(1, 'x'), T(p)], R: [T(1, 'y'), T(q)] } }, [
              { eq: E({ x: 1, y: -1 }, -q - p), disp: { L: [T(1, 'x'), T(p)], R: [T(1, 'y'), T(-q)] }, trap: 'sign-copy', why: 'Copy ∠M exactly: it is ' + angM + '.' },
              { eq: E({ y: 1 }, p - r), disp: { L: [T(1, 'x'), T(1, 'y'), T(r)], R: [T(1, 'x'), T(p)] }, trap: 'apex-equals-base', why: 'With KL = KM, the equal angles are opposite the equal sides: ∠L and ∠M.' },
            ]) },
          { because: 'All three angles of the triangle add up to 180°.', prompt: 'Which equation adds the angles?', eq: e2,
            options: options({ eq: e2, disp: { L: [B(1, [T(1, 'x'), T(1, 'y'), T(r)]), B(1, [T(1, 'x'), T(p)]), B(1, [T(1, 'y'), T(q)])], R: [T(180)] } }, [
              { eq: E({ x: 2, y: 2 }, 360 - p - q - r), disp: { L: [B(1, [T(1, 'x'), T(1, 'y'), T(r)]), B(1, [T(1, 'x'), T(p)]), B(1, [T(1, 'y'), T(q)])], R: [T(360)] }, trap: 'angle-sum-360', why: 'A triangle\'s angles add to 180°.' },
            ]) },
        ],
        sol: { x: Q(x), y: Q(y) },
        final: { because: `∠K = x + y ${r < 0 ? MINUS + ' ' + -r : '+ ' + r} = ${x} + ${y} ${r < 0 ? MINUS + ' ' + -r : '+ ' + r} = ${apex}.`, prompt: 'Hence, how big is ∠K?', value: Q(apex), unit: '°', traps: [{ value: Q(base), why: 'That is a base angle. ∠K is the one between the equal sides.' }, { value: Q(x + y), why: `∠K = x + y ${r < 0 ? MINUS + ' ' + -r : '+ ' + r}.` }] },
        sentence: `x = ${x}, y = ${y}, so ∠K = ${apex}°.`,
      };
    }

    if (v === 'equilateral') {
      const S = pick([9, 12, 15, 18, 20, 24, 30]);
      const x = rnd(1, 4), y = rnd(1, 5);
      const a1 = rnd(1, 4), b1 = rnd(1, 3);
      const k1 = S - a1 * x - b1 * y;
      const a2 = pick([1, 2, 3, 4].filter((n) => n !== a1)), k2 = S - a2 * x;   // a2 ≠ a1, or x vanishes at once
      const b3 = pick([1, 2, 3].filter((n) => (a1 - a2) * n !== a2 * b1)), k3 = S + b3 * y;   // keep the pair solvable
      if (k1 < 0 || k2 <= 0) return shape();
      const s1 = Linear.sideNice([T(a1, 'x'), T(b1, 'y'), T(k1)]);
      const s2 = Linear.sideNice([T(a2, 'x'), T(k2)]);
      const s3 = Linear.sideNice([T(k3), T(-b3, 'y')]);
      const e1 = E({ x: a1 - a2, y: b1 }, k2 - k1);
      const e2 = E({ x: a2, y: b3 }, k3 - k2);
      return {
        family: 'shape',
        text: `This triangle is <b>equilateral</b>. Its sides, in cm, are ${s1}, ${s2} and ${s3}. Find <i class="var">x</i> and <i class="var">y</i>, then the perimeter.`,
        figure: { type: 'tri-sides', sides: [s1, s2, s3] },
        letters: [{ v: 'x', means: 'as in the sides' }, { v: 'y', means: 'as in the sides' }],
        order: ['x', 'y'],
        eqs: [
          { because: 'Equilateral: all three sides are the same length, so any two are equal.', prompt: 'First side = second side. Which equation?', eq: e1,
            options: options({ eq: e1, disp: { L: [T(a1, 'x'), T(b1, 'y'), T(k1)], R: [T(a2, 'x'), T(k2)] } }, [
              { eq: E({ x: a1 - a2, y: b1 }, -k2 - k1), disp: { L: [T(a1, 'x'), T(b1, 'y'), T(k1)], R: [T(a2, 'x'), T(-k2)] }, trap: 'sign-copy', why: `Copy each side exactly: the second side is ${a2 === 1 ? '' : a2}x + ${k2}.` },
            ]) },
          { because: 'And the second equals the third — that gives the second equation.', prompt: 'Second side = third side. Which equation?', eq: e2,
            options: options({ eq: e2, disp: { L: [T(a2, 'x'), T(k2)], R: [T(k3), T(-b3, 'y')] } }, [
              { eq: E({ x: a2, y: -b3 }, k3 - k2), disp: { L: [T(a2, 'x'), T(k2)], R: [T(k3), T(b3, 'y')] }, trap: 'sign-copy', why: `Copy the side exactly: it is ${k3} ${MINUS} ${b3 === 1 ? '' : b3}y.` },
            ]) },
        ],
        sol: { x: Q(x), y: Q(y) },
        final: { because: `Each side is ${S} cm (put x and y into any side), so the perimeter is 3 × ${S}.`, prompt: 'Hence, the perimeter?', value: Q(3 * S), unit: 'cm', traps: [{ value: Q(S), why: 'That is one side. The perimeter is all three.' }] },
        sentence: `x = ${x}, y = ${y}: each side is ${S} cm, so the perimeter is ${3 * S} cm.`,
      };
    }

    // scaled rectangle: length is 1.5 / 1.75 / 2.5 times the width
    const [f, fd] = pick([[3, 2], [7, 4], [5, 2], [5, 4]]);
    const W = fd * rnd(4, 40), Lg = (W / fd) * f;
    const P = 2 * (Lg + W);
    const fq = Q(f, fd);
    const e1 = E({ l: 1, w: Linear.neg(fq) }, 0), e2 = E({ l: 2, w: 2 }, P);
    return {
      family: 'shape',
      text: `${pick(NAMES)} bakes a giant rectangular cake whose length is <b>${qNice(fq)} times its width</b>. Its perimeter is <b>${P} cm</b>. Find the length and the width.`,
      figure: { type: 'rect', top: 'l', right: 'w', bottom: 'l', left: 'w' },
      letters: [{ v: 'l', means: 'the length in cm' }, { v: 'w', means: 'the width in cm' }],
      order: ['l', 'w'],
      eqs: [
        { because: '“Times” multiplies: the length is ' + qNice(fq) + ' × the width.', prompt: 'Which equation compares length and width?', eq: e1,
          options: options({ eq: e1, disp: { L: [T(1, 'l')], R: [T(fq, 'w')] } }, [
            { eq: E({ w: 1, l: Linear.neg(fq) }, 0), disp: { L: [T(1, 'w')], R: [T(fq, 'l')] }, trap: 'times-reversed', why: 'The length is the bigger one: l = ' + qNice(fq) + 'w.' },
            { eq: E({ l: 1, w: -1 }, fq), disp: { L: [T(1, 'l')], R: [T(1, 'w'), T(fq)] }, trap: 'times-is-more', why: '“Times” multiplies.' },
          ]) },
        { because: 'All the way round: two lengths and two widths.', prompt: 'Which equation is the perimeter?', eq: e2,
          options: options({ eq: e2 }, [
            { eq: E({ l: 1, w: 1 }, P), trap: 'half-perimeter', why: 'All the way round: two lengths and two widths.' },
          ]) },
      ],
      sol: { l: Q(Lg), w: Q(W) },
      positive: ['l', 'w'],
      sentence: `Length ${Lg} cm, width ${W} cm.`,
    };
  }

  /* ================= ages ================= */

  function age() {
    const v = pick(['sum-diff', 'future', 'past']);
    const pair = pick([
      ['Ben', 'his brother', 'b', 'r', false], ['Mrs Tan', 'her daughter', 'm', 'd', true], ['Arjun', 'his sister', 'a', 's', false],
      ['Grandpa Lim', 'his grandson', 'g', 's', true], ['Aisha', 'her cousin', 'a', 'c', false], ['Mr Kumar', 'his son', 'k', 's', true],
    ]);
    const [A, Bname, la, lb, generation] = pair;
    const Bcap = Bname.replace(/^(his|her) /, '');

    if (v === 'sum-diff') {
      const b = generation ? rnd(4, 16) : rnd(5, 20);
      const d = generation ? rnd(22, 40) : rnd(2, 9);
      const a = b + d, S = a + b;
      const e1 = E({ [la]: 1, [lb]: 1 }, S), e2 = E({ [la]: 1, [lb]: -1 }, d);
      return {
        family: 'age',
        text: `The ages of ${A} and ${Bname} add up to <b>${S}</b>. ${A} is <b>${d} years older</b>. How old is each?`,
        letters: [{ v: la, means: `${A}'s age now` }, { v: lb, means: `the ${Bcap}'s age now` }],
        order: [la, lb],
        eqs: [
          { because: `Add the two ages: ${S}.`, prompt: 'Which equation is the sum?', eq: e1, options: options({ eq: e1 }, [
            { eq: E({ [la]: 1, [lb]: 1 }, d), trap: 'sum-is-difference', why: `${d} is how much older; ${S} is the sum.` }]) },
          { because: `${A} is older, so ${A}'s age is the other one plus ${d}.`, prompt: `Which equation says ${A} is ${d} years older?`, eq: e2,
            options: options({ eq: e2, disp: { L: [T(1, la)], R: [T(1, lb), T(d)] } }, [
              { eq: E({ [lb]: 1, [la]: -1 }, d), disp: { L: [T(1, lb)], R: [T(1, la), T(d)] }, trap: 'more-reversed', why: `${A} is older, so ${A}'s age is the bigger one.` },
              { eq: E({ [la]: 1, [lb]: -d }, 0), disp: { L: [T(1, la)], R: [T(d, lb)] }, trap: 'more-is-times', why: `“${d} years older” adds ${d}.` },
            ]) },
        ],
        sol: { [la]: Q(a), [lb]: Q(b) },
        whole: [la, lb],
        sentence: `${A} is ${a} and the ${Bcap} is ${b}.`,
      };
    }

    const k = pick([2, 3]);
    const n = rnd(2, 10);
    if (v === 'future') {
      const b = rnd(3, generation ? 14 : 12);
      const a = k * (b + n) - n;
      if (a > 70 || a <= b) return age();
      const S = a + b;
      const e1 = E({ [la]: 1, [lb]: -k }, k * n - n);
      const e2 = E({ [la]: 1, [lb]: 1 }, S);
      const right = { L: [T(1, la), T(n)], R: [B(k, [T(1, lb), T(n)])] };
      return {
        family: 'age',
        text: `In <b>${n} years</b>, ${A} will be <b>${k === 2 ? 'twice' : 'three times'}</b> as old as ${Bname}. Right now their ages add up to <b>${S}</b>. How old are they now?`,
        letters: [{ v: la, means: `${A}'s age now` }, { v: lb, means: `the ${Bcap}'s age now` }],
        order: [la, lb],
        eqs: [
          { because: `In ${n} years BOTH are ${n} older: ${la} + ${n} and ${lb} + ${n}. Then ${times(k)} the younger one's future age — the bracket keeps the + ${n}.`, prompt: `Which equation is “in ${n} years”?`, eq: e1, options: options({ eq: e1, disp: right }, [
            { eq: E({ [la]: 1, [lb]: -k }, -n), disp: { L: [T(1, la), T(n)], R: [T(k, lb)] }, trap: 'age-shift-one', why: `In ${n} years BOTH of them are ${n} years older.` },
            { eq: E({ [la]: 1, [lb]: -k }, 0), disp: { L: [T(1, la), T(n)], R: [T(k, lb), T(n)] }, trap: 'age-bracket', why: `Twice their future age is ${k}(${lb} + ${n}) — the bracket doubles the ${n} too.` },
            { eq: E({ [lb]: 1, [la]: -k }, k * n - n), disp: { L: [T(1, lb), T(n)], R: [B(k, [T(1, la), T(n)])] }, trap: 'times-reversed', why: `${A} is the older one, so ${A}'s age is the one that is ${k} times as big.` },
          ]) },
          { because: `Right now the two ages add up to ${S}.`, prompt: 'Which equation is about their ages now?', eq: e2, options: options({ eq: e2 }, [
            { eq: E({ [la]: 1, [lb]: 1 }, S + 2 * n), trap: 'age-shift-now', why: 'That sum is about now — no years added.' }]) },
        ],
        sol: { [la]: Q(a), [lb]: Q(b) },
        whole: [la, lb],
        sentence: `${A} is ${a} and the ${Bcap} is ${b}. (Check: in ${n} years, ${a + n} = ${k} × ${b + n}.)`,
      };
    }

    // past
    const b = rnd(n + 2, n + 14);
    const a = k * (b - n) + n;
    const d = a - b;
    if (d <= 0 || a > 75) return age();
    const e1 = E({ [la]: 1, [lb]: -k }, n - k * n);
    const e2 = E({ [la]: 1, [lb]: -1 }, d);
    return {
      family: 'age',
      text: `<b>${n} years ago</b>, ${A} was <b>${k === 2 ? 'twice' : 'three times'}</b> as old as ${Bname}. ${A} is <b>${d} years older</b>. How old are they now?`,
      letters: [{ v: la, means: `${A}'s age now` }, { v: lb, means: `the ${Bcap}'s age now` }],
      order: [la, lb],
      eqs: [
        { because: `${n} years ago BOTH were ${n} younger: ${la} − ${n} and ${lb} − ${n}, and one was ${times(k)} the other.`, prompt: `Which equation is “${n} years ago”?`, eq: e1, options: options({ eq: e1, disp: { L: [T(1, la), T(-n)], R: [B(k, [T(1, lb), T(-n)])] } }, [
          { eq: E({ [la]: 1, [lb]: -k }, n), disp: { L: [T(1, la), T(-n)], R: [T(k, lb)] }, trap: 'age-shift-one', why: `${n} years ago BOTH were ${n} years younger.` },
          { eq: E({ [la]: 1, [lb]: -k }, k * n + n), disp: { L: [T(1, la), T(-n)], R: [B(k, [T(1, lb), T(n)])] }, trap: 'age-direction', why: '“Ago” means younger: subtract the years.' },
        ]) },
        { because: `The difference in age never changes: ${A} is always ${d} older.`, prompt: `Which equation says ${A} is ${d} years older?`, eq: e2, options: options({ eq: e2, disp: { L: [T(1, la)], R: [T(1, lb), T(d)] } }, [
          { eq: E({ [lb]: 1, [la]: -1 }, d), disp: { L: [T(1, lb)], R: [T(1, la), T(d)] }, trap: 'more-reversed', why: `${A} is older, so ${la} is the bigger number.` }]) },
      ],
      sol: { [la]: Q(a), [lb]: Q(b) },
      whole: [la, lb],
      sentence: `${A} is ${a} and the ${Bcap} is ${b}. (${n} years ago: ${a - n} = ${k} × ${b - n}.)`,
    };
  }

  /* ================= number puzzles ================= */

  function number() {
    const v = pick(['sum-diff', 'times-sum', 'average', 'consecutive', 'greater', 'mixed']);

    if (v === 'sum-diff' || v === 'greater') {
      const y = rnd(4, 120), d = rnd(3, 60), x = y + d, S = x + y;
      const text = v === 'sum-diff'
        ? `Two numbers add up to <b>${S}</b> and their difference is <b>${d}</b>. Find them.`
        : `The sum of two numbers is <b>${S}</b>. The first is <b>${d} greater</b> than the second. Find them.`;
      const e1 = E({ x: 1, y: 1 }, S), e2 = E({ x: 1, y: -1 }, d);
      return {
        family: 'number', text,
        letters: [{ v: 'x', means: 'the larger number' }, { v: 'y', means: 'the smaller number' }],
        order: ['x', 'y'],
        eqs: [
          { because: 'Sum means add: x + y.', prompt: 'Which equation is the sum?', eq: e1, options: options({ eq: e1 }, [{ eq: E({ x: 1, y: -1 }, S), trap: 'sum-is-difference', why: 'Sum means add.' }]) },
          { because: 'Difference is big minus small: x − y.', prompt: 'Which equation is the difference?', eq: e2, options: options({ eq: e2 }, [
            { eq: E({ y: 1, x: -1 }, d), trap: 'difference-order', why: 'Big minus small gives a positive difference: x − y.' },
            { eq: E({ x: 1, y: -d }, 0), trap: 'more-is-times', why: 'A difference subtracts.' }]) },
        ],
        sol: { x: Q(x), y: Q(y) },
        sentence: `The numbers are ${x} and ${y}.`,
      };
    }

    if (v === 'times-sum') {
      const k = rnd(2, 6), y = rnd(3, 30), x = k * y, S = x + y;
      const e1 = E({ x: 1, y: -k }, 0), e2 = E({ x: 1, y: 1 }, S);
      return {
        family: 'number',
        text: `One number is <b>${k} times</b> another, and together they add up to <b>${S}</b>. Find both.`,
        letters: [{ v: 'x', means: 'the bigger number' }, { v: 'y', means: 'the smaller number' }],
        order: ['x', 'y'],
        eqs: [
          { because: `The bigger is ${k} × the smaller: x = ${k}y.`, prompt: `Which equation says one is ${k} times the other?`, eq: e1, options: options({ eq: e1, disp: { L: [T(1, 'x')], R: [T(k, 'y')] } }, [
            { eq: E({ y: 1, x: -k }, 0), disp: { L: [T(1, 'y')], R: [T(k, 'x')] }, trap: 'times-reversed', why: `x is the bigger one, so x = ${k}y. Try y = 1: then x = ${k}.` }]) },
          { because: 'The two numbers added give the total.', prompt: 'Which equation is the sum?', eq: e2, options: options({ eq: e2 }, [{ eq: E({ x: k, y: 1 }, S), trap: 'times-in-total', why: 'x already is the bigger number — just add x and y.' }]) },
        ],
        sol: { x: Q(x), y: Q(y) },
        sentence: `The numbers are ${x} and ${y}.`,
      };
    }

    if (v === 'average') {
      const y = rnd(2, 40), d = 2 * rnd(1, 10), x = y + d, A = (x + y) / 2;
      const e1 = E({ x: 1, y: -1 }, d), e2 = E({ x: 1, y: 1 }, 2 * A);
      return {
        family: 'number',
        text: `Find two numbers whose difference is <b>${d}</b> and whose average is <b>${A}</b>.`,
        letters: [{ v: 'x', means: 'the larger number' }, { v: 'y', means: 'the smaller number' }],
        order: ['x', 'y'],
        eqs: [
          { because: 'Difference is big minus small: x − y.', prompt: 'Which equation is the difference?', eq: e1, options: options({ eq: e1 }, [{ eq: E({ y: 1, x: -1 }, d), trap: 'difference-order', why: 'Big minus small: x − y.' }]) },
          { because: 'Average = sum ÷ 2, so (x + y) ÷ 2 equals the average.', prompt: 'Which equation is the average?', eq: e2, options: options({ eq: e2, disp: { L: [{ c: Q(1), v: 'avg', raw: Linear.fracHTML('x + y', 2) }], R: [T(A)] } }, [
            { eq: E({ x: 1, y: 1 }, A), trap: 'average-is-sum', why: `The average is the sum divided by 2, so the sum is 2 × ${A}.` },
            { eq: E({ x: 1, y: 1 }, Q(A, 2)), disp: { L: [T(1, 'x'), T(1, 'y')], R: [{ c: Q(1), v: 'avg', raw: Linear.fracHTML(A, 2) }] }, trap: 'average-halved', why: `Undo the ÷ 2 by multiplying: x + y = 2 × ${A}.` }]) },
        ],
        sol: { x: Q(x), y: Q(y) },
        sentence: `The numbers are ${x} and ${y}.`,
      };
    }

    if (v === 'consecutive') {
      const kind = pick(['odd', 'even', 'whole']);
      let n = rnd(5, 60);
      if (kind === 'odd' && n % 2 === 0) n += 1;
      if (kind === 'even' && n % 2) n += 1;
      const gap = kind === 'whole' ? 1 : 2;
      const S = 2 * n + gap;
      const e = E({ n: 2 }, S - gap);
      const words = kind === 'whole' ? 'consecutive whole numbers' : `consecutive ${kind} numbers`;
      return {
        family: 'number',
        text: `The sum of two <b>${words}</b> is <b>${S}</b>. Find them.`,
        letters: [{ v: 'n', means: 'the smaller number' }],
        derived: [
          { label: 'smaller', html: '<i class="var">n</i>', value: (s) => s.n },
          { label: 'larger', html: '<i class="var">n</i> + ' + gap, value: (s) => add(s.n, gap) },
        ],
        order: ['n'],
        eqs: [
          { because: `The next ${kind === 'whole' ? 'whole' : kind} number is ${gap} more: n + (n + ${gap}).`, prompt: 'Which equation?', eq: e, options: options({ eq: e, disp: { L: [T(1, 'n'), B(1, [T(1, 'n'), T(gap)])], R: [T(S)] } }, [
            gap === 2 ? { eq: E({ n: 2 }, S - 1), disp: { L: [T(1, 'n'), B(1, [T(1, 'n'), T(1)])], R: [T(S)] }, trap: 'consecutive-odd', why: `Consecutive ${kind} numbers are 2 apart: 7 and 9, not 7 and 8.` }
              : { eq: E({ n: 2 }, S - 2), disp: { L: [T(1, 'n'), B(1, [T(1, 'n'), T(2)])], R: [T(S)] }, trap: 'consecutive-odd', why: 'Consecutive whole numbers are 1 apart.' },
            { eq: E({ n: 1 }, S - gap), disp: { L: [T(1, 'n'), T(gap)], R: [T(S)] }, trap: 'consecutive-one', why: 'There are two numbers: n and the next one, n + ' + gap + '.' },
          ]) },
        ],
        sol: { n: Q(n) },
        finalCounts: true,
        sentence: `The numbers are ${n} and ${n + gap}.`,
      };
    }

    // twice the first plus the second... a general pair
    const x = rnd(2, 20), y = pick([...Array(19).keys()].map((i) => i + 2).filter((n) => n !== x)), a = rnd(2, 4), b = rnd(2, 3);
    const S = a * x + y, D = x - b * y;
    const e1 = E({ x: a, y: 1 }, S), e2 = E({ x: 1, y: -b }, D);
    const word = (k) => ({ 2: 'twice', 3: 'three times', 4: 'four times' }[k]);
    return {
      family: 'number',
      text: `<b>${word(a)[0].toUpperCase() + word(a).slice(1)}</b> a number plus a second number is <b>${S}</b>. The first number minus <b>${word(b)}</b> the second is <b>${D}</b>. Find both numbers.`,
      letters: [{ v: 'x', means: 'the first number' }, { v: 'y', means: 'the second number' }],
      order: ['x', 'y'],
      eqs: [
        { because: `“${word(a)} a number” is ${a}x; add the second number, y.`, prompt: 'Which equation is the first sentence?', eq: e1, options: options({ eq: e1 }, [{ eq: E({ x: 1, y: a }, S), trap: 'times-wrong-letter', why: `“${word(a)} a number” is ${a}x — the first number.` }]) },
        { because: `The first number minus ${word(b)} the second: x − ${b}y.`, prompt: 'Which equation is the second sentence?', eq: e2, options: options({ eq: e2 }, [
          { eq: E({ x: b, y: -1 }, D), trap: 'times-wrong-letter', why: `It is the second number that is multiplied: x − ${b}y.` },
          { eq: E({ y: b, x: -1 }, D), trap: 'difference-order', why: 'The first number comes first: x − …' }]) },
      ],
      sol: { x: Q(x), y: Q(y) },
      sentence: `The numbers are ${x} and ${y}.`,
    };
  }

  /* ================= mixtures ================= */

  function mixture() {
    const skin = pick([
      { what: 'juice drink', unit: 'litres', a: 'weak', b: 'strong', make: (T_, c) => `A café wants <b>${T_} litres</b> of <b>${c}% juice</b>` },
      { what: 'syrup', unit: 'litres', a: 'thin', b: 'thick', make: (T_, c) => `A dessert stall needs <b>${T_} litres</b> of <b>${c}% sugar syrup</b>` },
      { what: 'alcohol solution', unit: 'gallons', a: 'weak', b: 'strong', make: (T_, c) => `A lab needs <b>${T_} gallons</b> of a <b>${c}% alcohol solution</b>` },
      { what: 'paint', unit: 'litres', a: 'light', b: 'dark', make: (T_, c) => `A painter needs <b>${T_} litres</b> of paint that is <b>${c}% blue</b>` },
    ]);
    const [pa, pb] = pick([[10, 40], [20, 50], [30, 60], [10, 50], [20, 80], [25, 75], [40, 90], [15, 45]]);
    const Tot = pick([10, 12, 15, 18, 20, 24, 30, 40, 50, 60]);
    const opts = [];
    for (let x = 1; x < Tot; x++) {
      const c = (pa * x + pb * (Tot - x)) / Tot;
      if (Number.isInteger(c) && 2 * x !== Tot) opts.push([x, c]);   // equal amounts hide a swapped percentage
    }
    if (!opts.length) return mixture();
    const [x, c] = pick(opts);
    const y = Tot - x;
    const u = skin.unit;
    const text = `${skin.make(Tot, c)}. They mix a <b>${pa}%</b> one with a <b>${pb}%</b> one. How many ${u} of each?`;
    const e1 = E({ a: 1, b: 1 }, Tot);
    const e2 = E({ a: Q(pa, 100), b: Q(pb, 100) }, Q(c * Tot, 100));
    return {
      family: 'mixture',
      text,
      letters: [{ v: 'a', means: `${u} of the ${pa}% one` }, { v: 'b', means: `${u} of the ${pb}% one` }],
      order: ['a', 'b'],
      eqs: [
        { because: `The two amounts make the whole mix: ${Tot} ${u}.`, prompt: `Which equation counts the ${u}?`, eq: e1, options: options({ eq: e1 }, [
          { eq: E({ a: 1, b: 1 }, c), trap: 'percent-is-amount', why: `${c}% is a strength, not an amount. ${Tot} ${u} is the amount.` },
          { eq: E({ a: 1, b: 1 }, pa + pb), trap: 'percent-is-amount', why: `${pa} and ${pb} are strengths. Add up the ${u}: the whole mix is ${Tot} ${u}.` }]) },
        { because: `The pure part: ${pa}% of a plus ${pb}% of b must equal ${c}% of all ${Tot} ${u}.`, prompt: 'Which equation counts the pure stuff inside?', eq: e2, options: options({ eq: e2 }, [
          { eq: E({ a: Q(pa, 100), b: Q(pb, 100) }, Q(c, 100)), trap: 'mixture-no-total', why: `The pure part of the mix is ${c}% OF ${Tot} ${u}: 0.${String(c).padStart(2, '0')} × ${Tot}.` },
          { eq: E({ a: Q(pb, 100), b: Q(pa, 100) }, Q(c * Tot, 100)), trap: 'swap-values', why: `a is the ${pa}% one, so 0.${String(pa).padStart(2, '0')}a.` },
          { eq: E({ a: 1, b: 1 }, Q(c * Tot, 100)), trap: 'count-is-value', why: 'Only part of each litre is the pure stuff: multiply by its percentage.' },
        ]) },
      ],
      sol: { a: Q(x), b: Q(y) },
      between: { lo: 0, hi: Tot },
      positive: ['a', 'b'],
      sentence: `${x} ${u} of the ${pa}% one and ${y} ${u} of the ${pb}% one.`,
    };
  }

  /* ================= fraction puzzles ================= */

  function fraction() {
    const found = [];
    for (let d = 3; d <= 15; d++) for (let n = 1; n < d; n++) {
      if (Linear.gcd(n, d) !== 1) continue;
      const k1 = pick([1, 2]), k2 = pick([1, 2, 3]);
      if (n - k1 <= 0) continue;
      const f1 = Q(n - k1, d - k1), f2 = Q(n + k2, d + k2);
      if (f1.d > 9 || f2.d > 9 || f1.d === 1 || eq(f1, f2)) continue;
      found.push({ n, d, k1, k2, f1, f2 });
    }
    const { n, d, k1, k2, f1, f2 } = pick(found);
    const fr = (q) => Linear.fracHTML(q.n, q.d);
    const text = `If the top and bottom of a fraction are both <b>decreased by ${k1}</b>, it becomes ${fr(f1)}. If they are both <b>increased by ${k2}</b>, it becomes ${fr(f2)}. Find the fraction.`;
    // f1.d(n − k1) = f1.n(d − k1)  ->  f1.d·n − f1.n·d = f1.d·k1 − f1.n·k1
    const e1 = E({ n: f1.d, d: -f1.n }, k1 * (f1.d - f1.n));
    const e2 = E({ n: f2.d, d: -f2.n }, -k2 * (f2.d - f2.n));
    const disp1 = { L: [B(f1.d, [T(1, 'n'), T(-k1)])], R: [B(f1.n, [T(1, 'd'), T(-k1)])] };
    const disp2 = { L: [B(f2.d, [T(1, 'n'), T(k2)])], R: [B(f2.n, [T(1, 'd'), T(k2)])] };
    return {
      family: 'fraction',
      text,
      letters: [{ v: 'n', means: 'the top (numerator)' }, { v: 'd', means: 'the bottom (denominator)' }],
      order: ['n', 'd'],
      eqs: [
        { because: `Take ${k1} from top and bottom, then cross-multiply: top × the other bottom.`, prompt: `Cross-multiply the first clue. Which equation?`, eq: e1, options: options({ eq: e1, disp: disp1 }, [
          { eq: E({ n: f1.n, d: -f1.d }, k1 * (f1.n - f1.d)), disp: { L: [B(f1.n, [T(1, 'n'), T(-k1)])], R: [B(f1.d, [T(1, 'd'), T(-k1)])] }, trap: 'cross-multiply',
            why: `Cross-multiply means top of one × bottom of the other: ${f1.d} goes with the top n − ${k1}.` },
          { eq: E({ n: f1.d, d: -f1.n }, k1 * f1.d), disp: { L: [B(f1.d, [T(1, 'n'), T(-k1)])], R: [T(f1.n, 'd')] }, trap: 'change-one-part', why: 'Both the top AND the bottom are decreased.' },
        ]) },
        { because: `Add ${k2} to top and bottom, then cross-multiply the same way.`, prompt: 'And the second clue?', eq: e2, options: options({ eq: e2, disp: disp2 }, [
          { eq: E({ n: f2.d, d: -f2.n }, -k2 * f2.d), disp: { L: [B(f2.d, [T(1, 'n'), T(k2)])], R: [T(f2.n, 'd')] }, trap: 'change-one-part', why: 'Both the top AND the bottom are increased.' },
        ]) },
      ],
      sol: { n: Q(n), d: Q(d) },
      whole: ['n', 'd'],
      sentence: `The fraction is ${n}/${d}.`,
      answerHTML: fr(Q(n, d)),
    };
  }

  const FAMILY = {
    'count-value': countValue, 'two-baskets': twoBaskets, relation, 'break-even': breakEven,
    shape, age, number, mixture, fraction,
  };

  /** A problem from one family, or (no argument) from a random one. */
  function make(family) {
    const f = family || pick(Object.keys(FAMILY));
    const s = FAMILY[f]();
    for (const e of s.eqs) {
      const before = e.options.length;
      e.options = e.options.filter((o) => o.ok || !Linear.satisfies(o.eq, s.sol));
      pruned += before - e.options.length;
    }
    if (s.final && s.final.traps) s.final.traps = s.final.traps.filter((t) => !eq(t.value, s.final.value));
    return s;
  }
  let pruned = 0;
  const prunedCount = () => pruned;

  return { KINDS, FAMILY, make, NAMES, prunedCount };
})();
