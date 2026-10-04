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
    'count-value': { label: 'Count and value', blurb: 'How many things in all, and what they are worth in all.' },
    'two-baskets': { label: 'Two shopping lists', blurb: 'The same two prices. Two different baskets.' },
    relation: { label: '“More than” or “times as many”', blurb: 'One amount is given using another.' },
    'break-even': { label: 'Which deal is cheaper?', blurb: 'A fee you pay once, plus a cost for each one.' },
    shape: { label: 'Shape facts', blurb: 'Sides or angles that are equal, or add up to a total.' },
    age: { label: 'Ages', blurb: 'Everyone gets older by the same number of years.' },
    number: { label: 'Number puzzle', blurb: 'Sums, differences and averages of numbers you don’t know yet.' },
    mixture: { label: 'Mixture', blurb: 'Mix a weak one and a strong one to get one in between.' },
    fraction: { label: 'Fraction puzzle', blurb: 'The top and bottom of a fraction change by the same amount.' },
  };

  /* ================= count and value =================
     a + b = N  and  p·a + q·b = V. Tickets, coins, legs, wheels, marks, litres. */

  const COUNT_SKINS = [
    () => {
      const adult = step(12, 36, 2), child = step(6, adult - 4, 2);
      return { A: ['a', 'adult tickets', adult, '$'], B: ['c', 'child tickets', child, '$'], money: true,
        text: (n, v, who) => `${who} buys <b>${n}</b> tickets for the school musical. An adult ticket costs <b>$${adult}</b>. A child ticket costs <b>$${child}</b>. The total is <b>$${v}</b>.`,
        ask: 'How many adult tickets and how many child tickets?' };
    },
    () => {
      const [lo, hi] = pick([[10, 50], [20, 50], [5, 20], [50, 100], [10, 20], [20, 100]]);
      const nm = (c) => (c === 100 ? '$1' : c + '-cent');
      return { A: ['t', nm(lo) + ' coins', lo, 'c'], B: ['f', nm(hi) + ' coins', hi, 'c'], coins: true,
        text: (n, v, who) => `${who} has <b>${n}</b> coins in a money tin. They are all ${nm(lo)} or ${nm(hi)} coins. Together they are worth <b>${cents(v)}</b>.`,
        ask: 'How many of each coin are there?' };
    },
    () => {
      const [a, b] = pick([['chickens', 'goats'], ['ducks', 'cows'], ['chickens', 'rabbits'], ['geese', 'sheep']]);
      return { A: ['h', a, 2, ''], B: ['g', b, 4, ''], unit: 'legs',
        text: (n, v) => `A farm has only ${a} and ${b}. Together they have <b>${n}</b> heads. They have <b>${v}</b> legs.`,
        ask: `How many ${a} and how many ${b}?` };
    },
    () => ({ A: ['b', 'beetles', 6, ''], B: ['s', 'spiders', 8, ''], unit: 'legs',
      text: (n, v) => `A science class keeps beetles and spiders in a tank. A beetle has 6 legs. A spider has 8 legs. There are <b>${n}</b> animals in the tank. They have <b>${v}</b> legs in total.`,
      ask: 'How many beetles and how many spiders?' }),
    () => {
      const [a, pa, b, pb] = pick([['bicycles', 2, 'tricycles', 3], ['motorbikes', 2, 'cars', 4], ['cars', 4, 'lorries', 6]]);
      return { A: ['m', a, pa, ''], B: ['k', b, pb, ''], unit: 'wheels',
        text: (n, v) => `A car park has <b>${n}</b> vehicles. They are all ${a} or ${b}. Each of the ${a} has ${pa} wheels. Each of the ${b} has ${pb} wheels. Together they have <b>${v}</b> wheels.`,
        ask: `How many ${a} and how many ${b}?` };
    },
    () => {
      const [lo, hi] = pick([[2, 5], [1, 3], [2, 3], [3, 5]]);
      return { A: ['s', lo + '-mark questions', lo, ''], B: ['l', hi + '-mark questions', hi, ''], unit: 'marks',
        text: (n, v) => `A maths quiz has <b>${n}</b> questions. Each question is worth ${lo} or ${hi} marks. The whole quiz is worth <b>${v}</b> marks.`,
        ask: `How many ${lo}-mark and how many ${hi}-mark questions are there?` };
    },
    () => ({ A: ['t', 'two-pointers', 2, ''], B: ['h', 'three-pointers', 3, ''], unit: 'points',
      text: (n, v, who) => `${who} scored <b>${n}</b> baskets in a basketball game. Each basket was a two-pointer or a three-pointer. They made <b>${v}</b> points in total.`,
      ask: 'How many two-pointers and how many three-pointers?' }),
    () => {
      const small = pick([280, 320, 350, 390]), large = small + pick([80, 100, 120, 150]);
      return { A: ['r', 'regular cups', small, '$c'], B: ['l', 'large cups', large, '$c'], moneyCents: true,
        text: (n, v) => `A bubble tea stall sold <b>${n}</b> drinks before lunch. A regular cup costs <b>${cents(small)}</b>. A large cup costs <b>${cents(large)}</b>. The stall made <b>${cents(v)}</b> in total.`,
        ask: 'How many regular cups and how many large cups did it sell?' };
    },
    () => {
      const [a, b] = pick([[1, 2], [1, 3], [2, 5]]);
      return { A: ['p', a + '-litre cartons', a, ''], B: ['q', b + '-litre cartons', b, ''], unit: 'litres',
        text: (n, v) => `Milk comes in ${a}-litre and ${b}-litre cartons. A shop gets <b>${n}</b> cartons. They hold <b>${v}</b> litres in total.`,
        ask: 'How many of each carton are there?' };
    },
    () => {
      const p1 = step(4, 6, 1), p2 = p1 + rnd(1, 2);
      return { A: ['r', 'chicken rice', p1, '$'], B: ['n', 'nasi lemak', p2, '$'], money: true,
        text: (n, v) => `A class orders <b>${n}</b> hawker lunches. Chicken rice costs <b>$${p1}</b>. Nasi lemak costs <b>$${p2}</b>. The bill is <b>$${v}</b>.`,
        ask: 'How many of each lunch did they order?' };
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
      { eq: E({ [la]: 1, [lb]: 1 }, V), trap: 'count-is-value', why: `${V} ${valUnits} is the total, not how many ${skin.coins ? 'coins' : 'things'} there are. The count is ${N}.` },
      { eq: E({ [la]: pa, [lb]: pb }, N), trap: 'value-is-count', why: `That adds up ${valUnits}. But ${N} is how many there are.` },
    ]);
    const valOpts = options({ eq: valEq }, [
      { eq: E({ [la]: pb, [lb]: pa }, V), trap: 'swap-values', why: `Each ${na.replace(/s$/, '')} adds ${pa}. So ${pa} goes with ${la}.` },
      skin.coins || skin.moneyCents
        ? { eq: E({ [la]: pa, [lb]: pb }, Q(V, 100)), trap: 'units-mix', why: 'The prices are in cents. So the total must be in cents too.' }
        : { eq: E({ [lb]: pb }, V - pa), disp: { L: [T(pa), T(pb, lb)], R: [T(V)] }, trap: 'dropped-letter', why: `${pa}${la} means ${pa} for each one. Keep the letter ${la}.` },
      { eq: E({ [la]: 1, [lb]: 1 }, V), trap: 'count-is-value', why: `Each ${na.replace(/s$/, '')} adds ${pa}, not 1.` },
    ]);

    return {
      family: 'count-value',
      text: text + ' ' + skin.ask,
      letters: [{ v: la, means: 'the number of ' + na }, { v: lb, means: 'the number of ' + nb }],
      order,
      eqs: [
        { because: `There are ${N} in total. So the two counts add up to ${N}.`, prompt: 'Which equation counts them?', eq: countEq, options: countOpts },
        { because: `Each ${na.replace(/s$/, '')} adds ${pa}. Each ${nb.replace(/s$/, '')} adds ${pb}. So ${pa} × ${la} + ${pb} × ${lb} = ${V} ${valUnits}.`, prompt: `Which equation adds up the ${valUnits}?`, eq: valEq, options: valOpts },
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
    const text = `${w1} buys ${qty(x1, one_a, many_a)} and ${qty(y1, one_b, many_b)} ${s.where}. ${w1} pays <b>${cents(t1)}</b>. ` +
      `${w2} buys ${qty(x2, one_a, many_a)} and ${qty(y2, one_b, many_b)}. ${w2} pays <b>${cents(t2)}</b>. The prices are the same for both. What does one ${one_a} cost, and one ${one_b}?`;
    const dollars = (c) => Q(c, 100);
    const e1 = E({ [la]: x1, [lb]: y1 }, dollars(t1));
    const e2 = E({ [la]: x2, [lb]: y2 }, dollars(t2));
    const opts = (e, x, y, t, tOther, w) => options({ eq: e }, [
      { eq: E({ [la]: y, [lb]: x }, dollars(t)), trap: 'swap-quantities', why: `${w} bought ${qty(x, one_a, many_a)}. So ${x} goes with ${la}.` },
      { eq: E({ [la]: x, [lb]: y }, dollars(tOther)), trap: 'wrong-total', why: `That is what the other person paid. Use what ${w} paid.` },
      { eq: E({ [la]: 1, [lb]: 1 }, dollars(t)), trap: 'count-is-value', why: `${la} is the price of one ${one_a}. ${w} bought ${x}, so write ${x}${la}.` },
    ]);
    return {
      family: 'two-baskets',
      text,
      letters: [{ v: la, means: `the price of one ${one_a} in dollars` }, { v: lb, means: `the price of one ${one_b} in dollars` }],
      order: [la, lb],
      eqs: [
        { because: `${w1} pays ${x1} × ${la} plus ${y1} × ${lb}. That comes to ${cents(t1)}.`, prompt: `Which equation is ${w1}'s shopping?`, eq: e1, options: opts(e1, x1, y1, t1, t2, w1) },
        { because: `${w2} pays ${x2} × ${la} plus ${y2} × ${lb}. That comes to ${cents(t2)}. Same prices, new basket.`, prompt: `Which equation is ${w2}'s shopping?`, eq: e2, options: opts(e2, x2, y2, t2, t1, w2) },
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
        { A: ['s', 'sundaes', 2], B: ['b', 'banana splits', 3], unit: '$', place: 'An ice-cream shop sells sundaes for $2 each. Banana splits cost $3 each. One hot day, it sold' },
        { A: ['t', '10-cent coins', 10], B: ['w', '20-cent coins', 20], unit: 'c', place: `${who}'s jar holds only 10-cent and 20-cent coins. It has` },
        { A: ['m', 'muffins', 3], B: ['c', 'cookies', 2], unit: '$', place: 'At the bake sale, muffins cost $3 each. Cookies cost $2 each. The class sold' },
        { A: ['g', 'green stickers', 5], B: ['r', 'red stickers', 8], unit: 'pts', place: 'In a sticker game, a green sticker is worth 5 points. A red sticker is worth 8 points. Kim has' },
      ]);
      const [la, na, pa] = skin.A, [lb, nb, pb] = skin.B;
      const b = rnd(4, 30), k = rnd(3, 12), a = b + k;
      const V = pa * a + pb * b;
      const total = skin.unit === '$' ? '$' + V : skin.unit === 'c' ? cents(V) : V + ' points';
      const text = `${skin.place} <b>${k} more</b> ${na} than ${nb}. The total is <b>${total}</b>. How many of each are there?`;
      const unitsLabel = skin.unit === 'c' ? 'cents' : skin.unit === '$' ? 'dollars' : 'points';
      const rel = E({ [la]: 1, [lb]: -1 }, k);
      const val = E({ [la]: pa, [lb]: pb }, V);
      return {
        family: 'relation',
        text,
        letters: [{ v: la, means: 'the number of ' + na }, { v: lb, means: 'the number of ' + nb }],
        order: [la, lb],
        eqs: [
          { because: `There are ${k} more ${na}. So ${la} is ${lb} plus ${k}.`, prompt: `Which equation says there are ${k} more ${na}?`, eq: rel, layout: () => ({ L: [T(1, la)], R: [T(1, lb), T(k)] }),
            options: options({ eq: rel, disp: { L: [T(1, la)], R: [T(1, lb), T(k)] } }, [
              { eq: E({ [lb]: 1, [la]: -1 }, k), disp: { L: [T(1, lb)], R: [T(1, la), T(k)] }, trap: 'more-reversed', why: `There are more ${na}, so ${la} is bigger. Add ${k} to ${lb}.` },
              { eq: E({ [la]: 1, [lb]: -k }, 0), disp: { L: [T(1, la)], R: [T(k, lb)] }, trap: 'more-is-times', why: `“${k} more” means add ${k}. Don’t multiply by ${k}.` },
            ]) },
          { because: `Multiply each count by what one is worth. Then add: ${pa}${la} + ${pb}${lb} = ${V}.`, prompt: `Which equation adds up the ${unitsLabel}?`, eq: val,
            options: options({ eq: val }, [
              { eq: E({ [la]: pb, [lb]: pa }, V), trap: 'swap-values', why: `Each of the ${na} is worth ${pa}. So write ${pa}${la}.` },
              { eq: E({ [la]: 1, [lb]: 1 }, V), trap: 'count-is-value', why: `${V} is the total value, not a count. Multiply each count by what one is worth.` },
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
        { A: ['r', 'red marbles'], B: ['u', 'blue marbles'], text: (k, n) => `${who} has <b>${n}</b> marbles. They are all red or blue. There are <b>${times(k)} as many red marbles as blue ones</b>.` },
        { A: ['f', 'fiction books'], B: ['n', 'non-fiction books'], text: (k, n) => `A shelf holds <b>${n}</b> books. Each one is fiction or non-fiction. There are <b>${times(k)} as many fiction books as non-fiction</b>.` },
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
          { because: `For each one of the ${nb}, there are ${k} ${na}. So ${la} = ${k}${lb}. Test it: if ${lb} = 1, then ${la} = ${k}.`, prompt: `Which equation says there are ${times(k)} as many ${na}?`, eq: rel,
            options: options({ eq: rel, disp: { L: [T(1, la)], R: [T(k, lb)] } }, [
              { eq: E({ [lb]: 1, [la]: -k }, 0), disp: { L: [T(k, la)], R: [T(1, lb)] }, trap: 'times-reversed',
                why: `Test it with 1 of the ${nb}. Then there are ${k} ${na}. So ${la} = ${k}${lb}, not the other way round.` },
              { eq: E({ [la]: 1, [lb]: -1 }, k), disp: { L: [T(1, la)], R: [T(1, lb), T(k)] }, trap: 'times-is-more', why: `“${k} times as many” means multiply. It is not “${k} more”.` },
            ]) },
          { because: `Each one is one kind or the other. So the two counts add up to ${n}.`, prompt: 'Which equation is the total?', eq: tot,
            options: options({ eq: tot }, [
              { eq: E({ [la]: k, [lb]: 1 }, n), trap: 'times-in-total', why: `${la} already counts all the ${na}. Just add the two counts.` },
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
    const text = `${skin.intro} <b>${total}</b> ${skin.end}. They are all ${nA}, ${nB} or ${nC}. There are <b>${k === 2 ? 'twice' : 'three times'} as many ${nA} as ${nB}</b>. There are <b>${d} fewer ${nC} than ${nB}</b>. How many of each are there?`;
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
        { because: `The counts are ${k}n, n and n − ${d}. Multiply each count by its value. Then add them up.`, prompt: 'Which equation adds up the money?', eq: right,
          options: options({ eq: right, disp }, [
            { eq: E({ n: vA * k + vB + vC }, V - vC * d), disp: { L: [B(vA, [T(k, 'n')]), T(vB, 'n'), B(vC, [T(1, 'n'), T(d)])], R: [T(V)] }, trap: 'fewer-reversed',
              why: `“${d} fewer” means take ${d} away. So write n ${MINUS} ${d}.` },
            { eq: E({ n: k + 1 + 1 }, V + d), disp: { L: [T(k, 'n'), T(1, 'n'), T(1, 'n'), T(-d)], R: [T(V)] }, trap: 'count-is-value',
              why: `That adds up how many there are. But ${total} is what they are worth. Multiply each count by its value.` },
            { eq: E({ n: vA + vB + vC }, V + vC * d), disp: { L: [T(vA, 'n'), T(vB, 'n'), B(vC, [T(1, 'n'), T(-d)])], R: [T(V)] }, trap: 'times-dropped',
              why: `There are ${k === 2 ? 'twice' : 'three times'} as many ${nA}. So their count is ${k}n, worth ${vA} × ${k}n.` },
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
    { unit: ['day', 'days'], L: 'd', things: ['FastCar', 'CityRent'], intro: 'Two companies rent out cars.', fee: 'up front', rate: 'per day', rates: [[40, 60], [25, 45]], fees: true },
    { unit: ['month', 'months'], L: 'm', things: ['the Basic phone plan', 'the Plus plan'], intro: 'A phone shop has two plans.', fee: 'to sign up', rate: 'a month', rates: [[25, 40], [10, 22]] },
    { unit: ['visit', 'visits'], L: 'v', things: ['GymGo', 'FitHub'], intro: 'Two gyms charge in different ways.', fee: 'to join', rate: 'per visit', rates: [[8, 15], [2, 6]] },
    { unit: ['movie', 'movies'], L: 'm', things: ['the Basic plan', 'the Deluxe plan'], intro: 'A streaming site has two plans.', fee: 'to join', rate: 'per movie', rates: [[2, 4], [0.25, 1]], cents: true },
    { unit: ['km', 'km'], L: 'k', things: ['the taxi', 'the ride-share'], intro: 'You can get home two ways.', fee: 'to start', rate: 'per km', rates: [[0.6, 1], [0.3, 0.55]], cents: true },
    { unit: ['person', 'people'], L: 'p', things: ['the Grand Ballroom', 'the Palace Ballroom'], intro: 'Two halls can host a party.', fee: 'for the room', rate: 'per guest', rates: [[1.5, 3], [0.5, 1.25]], cents: true, big: true },
    { unit: ['lesson', 'lessons'], L: 'l', things: ['the music school', 'the private teacher'], intro: 'You can learn guitar two ways.', fee: 'to register', rate: 'per lesson', rates: [[35, 50], [20, 32]] },
    { unit: ['page', 'pages'], L: 'p', things: ['PrintPro', 'CopyKing'], intro: 'Two shops can print the class magazine.', fee: 'to set up', rate: 'per page', rates: [[0.2, 0.4], [0.05, 0.15]], cents: true, big: true },
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
    const desc = (f, r) => (f === 0 ? `${pr(r)} ${s.rate}, with no fee` : `${pr(f)} ${s.fee}, then ${pr(r)} ${s.rate}`);
    const text = `${s.intro} <b>${A[0].toUpperCase() + A.slice(1)}</b> charges ${desc(f1, r1)}. <b>${Bn[0].toUpperCase() + Bn.slice(1)}</b> charges ${desc(f2, r2)}.`;
    const Qd = (c) => Q(c, 100);
    const e1 = E({ c: 1, [L]: Qd(-r1) }, Qd(f1));
    const e2 = E({ c: 1, [L]: Qd(-r2) }, Qd(f2));
    const lay = (e) => Linear.layoutFor(e, 'c', true);
    const optsFor = (e, f, r, name) => options({ eq: e }, [
      { eq: E({ c: 1 }, Qd(f + r)), disp: { L: [T(1, 'c')], R: [T(Qd(f)), T(Qd(r))] }, trap: 'dropped-letter', why: `${pr(r)} ${s.rate} grows with the number of ${s.unit[1]}. Write it as ${qNice(Qd(r))}${L}, with the letter.` },
      f === 0 ? null : { eq: E({ c: 1, [L]: Qd(-f) }, Qd(r)), trap: 'fee-rate-swapped', why: `The fee is paid once. The ${pr(r)} is paid for every ${s.unit[0]}, so it goes with ${L}.` },
      { eq: E({ c: 1, [L]: Qd(-(r === r1 ? r2 : r1)) }, Qd(f)), trap: 'wrong-rate', why: `That is the other deal’s rate. The rate for ${name} is ${pr(r)} ${s.rate}.` },
    ]);
    const ask = pick(['after', 'choose', 'equal']);
    const unitN = (n) => n + ' ' + (n === 1 ? s.unit[0] : s.unit[1]);
    let final;
    if (ask === 'after') {
      final = {
        prompt: `When is <b>${Bn}</b> cheaper?`,
        options: shuffle([
          { label: `From ${unitN(nStar + 1)} on`, ok: true, why: `They cost the same at ${unitN(nStar)}. One more ${s.unit[0]}, and ${Bn} is cheaper.` },
          { label: `From ${unitN(nStar)} on`, ok: false, trap: 'break-even-equal', why: `At ${unitN(nStar)} they cost exactly the same. It is not cheaper yet.` },
          { label: `Up to ${unitN(nStar - 1)}`, ok: false, trap: 'break-even-direction', why: `At the start, ${Bn} costs more. Its lower rate only wins after enough ${s.unit[1]}.` },
          { label: 'Never', ok: false, trap: 'break-even-never', why: `Its rate is lower: ${pr(r2)} vs ${pr(r1)}. So it catches up in the end.` },
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
          { label: A[0].toUpperCase() + A.slice(1), ok: better === A, trap: 'break-even-side', why: `For ${unitN(n)}, ${A} costs ${pr(cA)} and ${Bn} costs ${pr(cB)}.` },
          { label: Bn[0].toUpperCase() + Bn.slice(1), ok: better === Bn, trap: 'break-even-side', why: `For ${unitN(n)}, ${A} costs ${pr(cA)} and ${Bn} costs ${pr(cB)}.` },
        ],
      };
    } else {
      final = null;    // the solve step already asks for n and c
    }
    return {
      family: 'break-even',
      text: text + (ask === 'equal' ? ` For how many ${s.unit[1]} do they cost the same? What is that cost?` : ''),
      letters: [{ v: L, means: 'the number of ' + s.unit[1] }, { v: 'c', means: 'the total cost in dollars' }],
      order: [L, 'c'],
      eqs: [
        { because: `For ${A}, you pay the fee once. Then you pay the rate for each ${s.unit[0]}.`, prompt: `Which equation is the cost with ${A}?`, eq: e1, layout: lay, options: optsFor(e1, f1, r1, A) },
        { because: `Same pattern for ${Bn}: the fee once, then the rate × ${L}.`, prompt: `Which equation is the cost with ${Bn}?`, eq: e2, layout: lay, options: optsFor(e2, f2, r2, Bn) },
      ],
      layout: lay,
      cents2: true,
      sol: { [L]: Q(nStar), c: Qd(cStar) },
      whole: [L],
      money: ['c'],
      solvePrompt: 'When do the two deals cost the same?',
      final,
      sentence: `They cost the same at ${unitN(nStar)}: ${pr(cStar)} each. Below that, ${f1 <= f2 ? A : Bn} is cheaper. Above it, ${f1 <= f2 ? Bn : A} is cheaper.`,
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
        text: `A rectangle is <b>${k} cm longer than it is wide</b>. Its perimeter (the distance all the way round) is <b>${P} cm</b>. Find its length and width${askArea ? ', and then its area' : ''}.`,
        figure: { type: 'rect', top: 'l', right: 'w', bottom: 'l', left: 'w' },
        letters: [{ v: 'l', means: 'the length in cm' }, { v: 'w', means: 'the width in cm' }],
        order: ['l', 'w'],
        eqs: [
          { because: `It is ${k} cm longer. So the length is the width + ${k}.`, prompt: 'Which equation compares length and width?', eq: rel,
            options: options({ eq: rel, disp: { L: [T(1, 'l')], R: [T(1, 'w'), T(k)] } }, [
              { eq: E({ w: 1, l: -1 }, k), disp: { L: [T(1, 'w')], R: [T(1, 'l'), T(k)] }, trap: 'more-reversed', why: 'The length is the longer side. Add to w to get l.' },
              { eq: E({ l: 1, w: -k }, 0), disp: { L: [T(1, 'l')], R: [T(k, 'w')] }, trap: 'more-is-times', why: `“${k} cm longer” means add ${k}. Don’t multiply.` },
            ]) },
          { because: 'All the way round: two lengths and two widths.', prompt: 'Which equation is the perimeter?', eq: per,
            options: options({ eq: per }, [
              { eq: E({ l: 1, w: 1 }, P), trap: 'half-perimeter', why: 'That only goes half way round. Count two lengths and two widths.' },
              { eq: E({ l: 1, w: 1 }, P * 2), trap: 'perimeter-doubled', why: `The perimeter is ${P}. l + w is only half of it.` },
              { eq: E({ l: 4, w: 0 }, P), trap: 'square', why: 'Only a square has four equal sides. Use l twice and w twice.' },
            ]) },
        ],
        sol: { l: Q(Lg), w: Q(W) },
        positive: ['l', 'w'],
        final: askArea ? { because: `Area = length × width = ${Lg} × ${W}.`, prompt: 'Now, what is its area?', value: Q(Lg * W), unit: 'cm²',
          traps: [{ value: Q(2 * (Lg + W)), why: 'That is the perimeter. Area is length × width.' }, { value: Q(Lg + W), why: 'That adds them. Area is length × width.' }] } : null,
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
        text: `The shape is a <b>${kind}</b>. Each side is shown in cm, using <i class="var">x</i> and <i class="var">y</i>. Find <i class="var">x</i> and <i class="var">y</i>. Then find the ${askP ? 'perimeter' : 'area'}.`,
        figure: { type: kind === 'rectangle' ? 'rect' : 'para', top, bottom: bot, left, right },
        letters: [{ v: 'x', means: 'as in the figure' }, { v: 'y', means: 'as in the figure' }],
        order: ['x', 'y'],
        eqs: [
          { because: 'In a ' + kind + ', opposite sides are equal. So top = bottom.', prompt: 'Top and bottom are opposite sides. Which equation?', eq: e1,
            options: options({ eq: e1, disp: d1 }, [
              { eq: Linear.tidy(E({ x: p + a, y: 0 }, -q - b)), disp: { L: [T(p, 'x'), T(q)], R: [T(-a, 'x'), T(-b)] }, trap: 'adjacent-sides', why: 'Equal sides are opposite each other. Top goes with bottom, left with right.' },
            ]) },
          { because: 'Left and right are opposite too. So left = right.', prompt: 'And left and right?', eq: e2,
            options: options({ eq: e2, disp: d2 }, [
              { eq: Linear.tidy(E({ x: a, y: c }, -dd - b)), disp: { L: [T(a, 'x'), T(b)], R: [T(-c, 'y'), T(-dd)] }, trap: 'sign-copy', why: 'Copy each side exactly as it is written in the figure.' },
              { eq: Linear.tidy(E({ x: a, y: -r }, s2 - b)), disp: { L: [T(a, 'x'), T(b)], R: [T(r, 'y'), T(s2)] }, trap: 'adjacent-sides', why: 'Left pairs with right, not with the bottom.' },
            ]) },
        ],
        sol: { x: Q(x), y: Q(y) },
        final: askP
          ? { because: `The sides are ${sTop} cm and ${sLeft} cm. Perimeter = 2 × (${sTop} + ${sLeft}).`, prompt: 'Now, what is the perimeter?', value: Q(per), unit: 'cm', traps: [{ value: Q(sTop + sLeft), why: 'That is only two sides. Add all four.' }, { value: Q(area), why: 'That is the area. The perimeter adds up the sides.' }] }
          : { because: `Put x and y into the sides: ${sTop} cm and ${sLeft} cm. Area = ${sTop} × ${sLeft}.`, prompt: 'Now, what is the area?', value: Q(area), unit: 'cm²', traps: [{ value: Q(per), why: 'That is the perimeter. Area is length × width.' }, { value: Q(x * y), why: `Area uses the sides, ${sTop} and ${sLeft}. Not x and y.` }] },
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
        text: `A triangle has three angles. The first angle is <b>${k === 2 ? 'twice' : 'three times'}</b> the second. The first angle is also <b>${d}° larger</b> than the third. Find all three angles.`,
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
              { eq: E({ y: 1, x: -k }, 0), disp: { L: [T(1, 'y')], R: [T(k, 'x')] }, trap: 'times-reversed', why: `The first is the bigger one, so x = ${k}y. Test it: if y = 10, then x = ${10 * k}.` },
            ]) },
          { because: 'The angles in a triangle add up to 180°. The third angle is x − ' + d + '.', prompt: 'Which equation adds the three angles? (The third angle is x − ' + d + '.)', eq: sum,
            options: options({ eq: sum, disp: { L: [T(1, 'x'), T(1, 'y'), B(1, [T(1, 'x'), T(-d)])], R: [T(180)] } }, [
              { eq: E({ x: 2, y: 1 }, 360 + d), disp: { L: [T(1, 'x'), T(1, 'y'), B(1, [T(1, 'x'), T(-d)])], R: [T(360)] }, trap: 'angle-sum-360', why: 'Angles in a triangle add up to 180°. 360° is for a full turn or a four-sided shape.' },
              { eq: E({ x: 2, y: 1 }, 180 - d), disp: { L: [T(1, 'x'), T(1, 'y'), B(1, [T(1, 'x'), T(d)])], R: [T(180)] }, trap: 'more-reversed', why: `The first is ${d}° larger than the third. So the third is x − ${d}.` },
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
        text: `KLM is an <b>isosceles</b> triangle. Two of its sides are equal: KL = KM. Its angles are ∠K = ${angK}°, ∠L = ${angL}° and ∠M = ${angM}°. Find <i class="var">x</i> and <i class="var">y</i>. Then find the size of ∠K.`,
        figure: { type: 'tri', a: angK, b: angL, c: angM, names: ['K', 'L', 'M'], equalSides: true },
        letters: [{ v: 'x', means: 'as in the angles' }, { v: 'y', means: 'as in the angles' }],
        order: ['x', 'y'],
        eqs: [
          { because: 'KL = KM. So the angles opposite them are equal: ∠L = ∠M.', prompt: 'The two base angles, ∠L and ∠M, are equal. Which equation?', eq: e1,
            options: options({ eq: e1, disp: { L: [T(1, 'x'), T(p)], R: [T(1, 'y'), T(q)] } }, [
              { eq: E({ x: 1, y: -1 }, -q - p), disp: { L: [T(1, 'x'), T(p)], R: [T(1, 'y'), T(-q)] }, trap: 'sign-copy', why: 'Copy ∠M exactly: it is ' + angM + '.' },
              { eq: E({ y: 1 }, p - r), disp: { L: [T(1, 'x'), T(1, 'y'), T(r)], R: [T(1, 'x'), T(p)] }, trap: 'apex-equals-base', why: 'The equal angles sit opposite the equal sides. Those are ∠L and ∠M.' },
            ]) },
          { because: 'All three angles of the triangle add up to 180°.', prompt: 'Which equation adds the angles?', eq: e2,
            options: options({ eq: e2, disp: { L: [B(1, [T(1, 'x'), T(1, 'y'), T(r)]), B(1, [T(1, 'x'), T(p)]), B(1, [T(1, 'y'), T(q)])], R: [T(180)] } }, [
              { eq: E({ x: 2, y: 2 }, 360 - p - q - r), disp: { L: [B(1, [T(1, 'x'), T(1, 'y'), T(r)]), B(1, [T(1, 'x'), T(p)]), B(1, [T(1, 'y'), T(q)])], R: [T(360)] }, trap: 'angle-sum-360', why: 'A triangle\'s angles add to 180°.' },
            ]) },
        ],
        sol: { x: Q(x), y: Q(y) },
        final: { because: `∠K = x + y ${r < 0 ? MINUS + ' ' + -r : '+ ' + r} = ${x} + ${y} ${r < 0 ? MINUS + ' ' + -r : '+ ' + r} = ${apex}.`, prompt: 'Now, how big is ∠K?', value: Q(apex), unit: '°', traps: [{ value: Q(base), why: 'That is a base angle. ∠K is the one between the equal sides.' }, { value: Q(x + y), why: `∠K = x + y ${r < 0 ? MINUS + ' ' + -r : '+ ' + r}.` }] },
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
        text: `This triangle is <b>equilateral</b>. That means all three sides are equal. The sides, in cm, are ${s1}, ${s2} and ${s3}. Find <i class="var">x</i> and <i class="var">y</i>. Then find the perimeter.`,
        figure: { type: 'tri-sides', sides: [s1, s2, s3] },
        letters: [{ v: 'x', means: 'as in the sides' }, { v: 'y', means: 'as in the sides' }],
        order: ['x', 'y'],
        eqs: [
          { because: 'All three sides are the same length. So the first side = the second side.', prompt: 'First side = second side. Which equation?', eq: e1,
            options: options({ eq: e1, disp: { L: [T(a1, 'x'), T(b1, 'y'), T(k1)], R: [T(a2, 'x'), T(k2)] } }, [
              { eq: E({ x: a1 - a2, y: b1 }, -k2 - k1), disp: { L: [T(a1, 'x'), T(b1, 'y'), T(k1)], R: [T(a2, 'x'), T(-k2)] }, trap: 'sign-copy', why: `Copy each side exactly: the second side is ${a2 === 1 ? '' : a2}x + ${k2}.` },
            ]) },
          { because: 'The second side = the third side too. That is the second equation.', prompt: 'Second side = third side. Which equation?', eq: e2,
            options: options({ eq: e2, disp: { L: [T(a2, 'x'), T(k2)], R: [T(k3), T(-b3, 'y')] } }, [
              { eq: E({ x: a2, y: -b3 }, k3 - k2), disp: { L: [T(a2, 'x'), T(k2)], R: [T(k3), T(b3, 'y')] }, trap: 'sign-copy', why: `Copy the side exactly: it is ${k3} ${MINUS} ${b3 === 1 ? '' : b3}y.` },
            ]) },
        ],
        sol: { x: Q(x), y: Q(y) },
        final: { because: `Put x and y into any side. Each side is ${S} cm. So the perimeter is 3 × ${S}.`, prompt: 'Now, what is the perimeter?', value: Q(3 * S), unit: 'cm', traps: [{ value: Q(S), why: 'That is one side. The perimeter adds all three.' }] },
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
      text: `${pick(NAMES)} bakes a giant rectangular cake. Its length is <b>${qNice(fq)} times its width</b>. Its perimeter (the distance all the way round) is <b>${P} cm</b>. Find the length and the width.`,
      figure: { type: 'rect', top: 'l', right: 'w', bottom: 'l', left: 'w' },
      letters: [{ v: 'l', means: 'the length in cm' }, { v: 'w', means: 'the width in cm' }],
      order: ['l', 'w'],
      eqs: [
        { because: '“Times” means multiply. So the length is ' + qNice(fq) + ' × the width.', prompt: 'Which equation compares length and width?', eq: e1,
          options: options({ eq: e1, disp: { L: [T(1, 'l')], R: [T(fq, 'w')] } }, [
            { eq: E({ w: 1, l: Linear.neg(fq) }, 0), disp: { L: [T(1, 'w')], R: [T(fq, 'l')] }, trap: 'times-reversed', why: 'The length is the bigger one. So l = ' + qNice(fq) + 'w.' },
            { eq: E({ l: 1, w: -1 }, fq), disp: { L: [T(1, 'l')], R: [T(1, 'w'), T(fq)] }, trap: 'times-is-more', why: '“Times” means multiply, not add.' },
          ]) },
        { because: 'All the way round: two lengths and two widths.', prompt: 'Which equation is the perimeter?', eq: e2,
          options: options({ eq: e2 }, [
            { eq: E({ l: 1, w: 1 }, P), trap: 'half-perimeter', why: 'That only goes half way round. Count two lengths and two widths.' },
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
        text: `The ages of ${A} and ${Bname} add up to <b>${S}</b>. ${A} is <b>${d} years older</b>. How old is each of them?`,
        letters: [{ v: la, means: `${A}'s age now` }, { v: lb, means: `the ${Bcap}'s age now` }],
        order: [la, lb],
        eqs: [
          { because: `Add the two ages. They make ${S}.`, prompt: 'Which equation is the sum?', eq: e1, options: options({ eq: e1 }, [
            { eq: E({ [la]: 1, [lb]: 1 }, d), trap: 'sum-is-difference', why: `${d} is how much older. The sum is ${S}.` }]) },
          { because: `${A} is older. So ${la} is ${lb} plus ${d}.`, prompt: `Which equation says ${A} is ${d} years older?`, eq: e2,
            options: options({ eq: e2, disp: { L: [T(1, la)], R: [T(1, lb), T(d)] } }, [
              { eq: E({ [lb]: 1, [la]: -1 }, d), disp: { L: [T(1, lb)], R: [T(1, la), T(d)] }, trap: 'more-reversed', why: `${A} is older. So ${A}'s age, ${la}, is the bigger one.` },
              { eq: E({ [la]: 1, [lb]: -d }, 0), disp: { L: [T(1, la)], R: [T(d, lb)] }, trap: 'more-is-times', why: `“${d} years older” means add ${d}. Don’t multiply.` },
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
        text: `Right now, the ages of ${A} and ${Bname} add up to <b>${S}</b>. In <b>${n} years</b>, ${A} will be <b>${k === 2 ? 'twice' : 'three times'}</b> as old as ${Bname}. How old are they now?`,
        letters: [{ v: la, means: `${A}'s age now` }, { v: lb, means: `the ${Bcap}'s age now` }],
        order: [la, lb],
        eqs: [
          { because: `In ${n} years, BOTH are ${n} years older: ${la} + ${n} and ${lb} + ${n}. ${A} will be ${times(k)} the other's age then. Keep the bracket: ${k}(${lb} + ${n}).`, prompt: `Which equation is “in ${n} years”?`, eq: e1, options: options({ eq: e1, disp: right }, [
            { eq: E({ [la]: 1, [lb]: -k }, -n), disp: { L: [T(1, la), T(n)], R: [T(k, lb)] }, trap: 'age-shift-one', why: `In ${n} years, BOTH of them are ${n} years older. Add ${n} to both ages.` },
            { eq: E({ [la]: 1, [lb]: -k }, 0), disp: { L: [T(1, la), T(n)], R: [T(k, lb), T(n)] }, trap: 'age-bracket', why: `${k} times the future age is ${k}(${lb} + ${n}). The bracket multiplies the ${n} too.` },
            { eq: E({ [lb]: 1, [la]: -k }, k * n - n), disp: { L: [T(1, lb), T(n)], R: [B(k, [T(1, la), T(n)])] }, trap: 'times-reversed', why: `${A} is the older one. So ${A}'s age is the one that is ${k} times as big.` },
          ]) },
          { because: `Right now, the two ages add up to ${S}.`, prompt: 'Which equation is about their ages now?', eq: e2, options: options({ eq: e2 }, [
            { eq: E({ [la]: 1, [lb]: 1 }, S + 2 * n), trap: 'age-shift-now', why: 'That sum is about now. Don’t add any years.' }]) },
        ],
        sol: { [la]: Q(a), [lb]: Q(b) },
        whole: [la, lb],
        sentence: `${A} is ${a} and the ${Bcap} is ${b}. (Check: in ${n} years, ${a + n} = ${k} × ${b + n}.)`,
      };
    }

    // past
    // a grandparent and grandchild are decades apart, not 3 years: their gap is (k − 1)(b − n)
    const b = generation ? n + pick(k === 2 ? [22, 25, 28, 30] : [12, 13, 14, 15]) : rnd(n + 2, n + 14);
    const a = k * (b - n) + n;
    const d = a - b;
    if (d <= 0 || a > 75) return age();
    const e1 = E({ [la]: 1, [lb]: -k }, n - k * n);
    const e2 = E({ [la]: 1, [lb]: -1 }, d);
    return {
      family: 'age',
      text: `${A} is <b>${d} years older</b> than ${Bname}. <b>${n} years ago</b>, ${A} was <b>${k === 2 ? 'twice' : 'three times'}</b> as old as ${Bname}. How old are they now?`,
      letters: [{ v: la, means: `${A}'s age now` }, { v: lb, means: `the ${Bcap}'s age now` }],
      order: [la, lb],
      eqs: [
        { because: `${n} years ago, BOTH were ${n} years younger: ${la} − ${n} and ${lb} − ${n}. Back then, ${A} was ${times(k)} the other's age.`, prompt: `Which equation is “${n} years ago”?`, eq: e1, options: options({ eq: e1, disp: { L: [T(1, la), T(-n)], R: [B(k, [T(1, lb), T(-n)])] } }, [
          { eq: E({ [la]: 1, [lb]: -k }, n), disp: { L: [T(1, la), T(-n)], R: [T(k, lb)] }, trap: 'age-shift-one', why: `${n} years ago, BOTH were ${n} years younger. Take ${n} from both ages.` },
          { eq: E({ [la]: 1, [lb]: -k }, k * n + n), disp: { L: [T(1, la), T(-n)], R: [B(k, [T(1, lb), T(n)])] }, trap: 'age-direction', why: '“Ago” means younger. Take the years away.' },
        ]) },
        { because: `The age gap never changes. ${A} is always ${d} years older.`, prompt: `Which equation says ${A} is ${d} years older?`, eq: e2, options: options({ eq: e2, disp: { L: [T(1, la)], R: [T(1, lb), T(d)] } }, [
          { eq: E({ [lb]: 1, [la]: -1 }, d), disp: { L: [T(1, lb)], R: [T(1, la), T(d)] }, trap: 'more-reversed', why: `${A} is older. So ${la} is the bigger number.` }]) },
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
        ? `Two numbers add up to <b>${S}</b>. Their difference is <b>${d}</b>. What are the two numbers?`
        : `Two numbers add up to <b>${S}</b>. The first is <b>${d} more</b> than the second. What are the two numbers?`;
      const e1 = E({ x: 1, y: 1 }, S), e2 = E({ x: 1, y: -1 }, d);
      return {
        family: 'number', text,
        letters: [{ v: 'x', means: 'the larger number' }, { v: 'y', means: 'the smaller number' }],
        order: ['x', 'y'],
        eqs: [
          { because: 'Sum means add: x + y.', prompt: 'Which equation is the sum?', eq: e1, options: options({ eq: e1 }, [{ eq: E({ x: 1, y: -1 }, S), trap: 'sum-is-difference', why: 'Sum means add, not take away.' }]) },
          { because: 'Difference is big minus small: x − y.', prompt: 'Which equation is the difference?', eq: e2, options: options({ eq: e2 }, [
            { eq: E({ y: 1, x: -1 }, d), trap: 'difference-order', why: 'Take the small one from the big one: x − y.' },
            { eq: E({ x: 1, y: -d }, 0), trap: 'more-is-times', why: 'A difference means take away. Don’t multiply.' }]) },
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
        text: `One number is <b>${k} times</b> another. Together they add up to <b>${S}</b>. What are the two numbers?`,
        letters: [{ v: 'x', means: 'the bigger number' }, { v: 'y', means: 'the smaller number' }],
        order: ['x', 'y'],
        eqs: [
          { because: `The bigger is ${k} × the smaller: x = ${k}y.`, prompt: `Which equation says one is ${k} times the other?`, eq: e1, options: options({ eq: e1, disp: { L: [T(1, 'x')], R: [T(k, 'y')] } }, [
            { eq: E({ y: 1, x: -k }, 0), disp: { L: [T(1, 'y')], R: [T(k, 'x')] }, trap: 'times-reversed', why: `x is the bigger one, so x = ${k}y. Test it: if y = 1, then x = ${k}.` }]) },
          { because: 'Add the two numbers to get the total.', prompt: 'Which equation is the sum?', eq: e2, options: options({ eq: e2 }, [{ eq: E({ x: k, y: 1 }, S), trap: 'times-in-total', why: 'x is already the bigger number. Just add x and y.' }]) },
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
        text: `Two numbers have a difference of <b>${d}</b>. Their average is <b>${A}</b>. What are the two numbers?`,
        letters: [{ v: 'x', means: 'the larger number' }, { v: 'y', means: 'the smaller number' }],
        order: ['x', 'y'],
        eqs: [
          { because: 'Difference is big minus small: x − y.', prompt: 'Which equation is the difference?', eq: e1, options: options({ eq: e1 }, [{ eq: E({ y: 1, x: -1 }, d), trap: 'difference-order', why: 'Big minus small: x − y.' }]) },
          { because: 'Average = sum ÷ 2. So (x + y) ÷ 2 = the average.', prompt: 'Which equation is the average?', eq: e2, options: options({ eq: e2, disp: { L: [{ c: Q(1), v: 'avg', raw: Linear.fracHTML('x + y', 2) }], R: [T(A)] } }, [
            { eq: E({ x: 1, y: 1 }, A), trap: 'average-is-sum', why: `The average is the sum ÷ 2. So the sum is 2 × ${A}.` },
            { eq: E({ x: 1, y: 1 }, Q(A, 2)), disp: { L: [T(1, 'x'), T(1, 'y')], R: [{ c: Q(1), v: 'avg', raw: Linear.fracHTML(A, 2) }] }, trap: 'average-halved', why: `To undo ÷ 2, multiply by 2. So x + y = 2 × ${A}.` }]) },
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
        text: `Two <b>${words}</b> add up to <b>${S}</b>. Consecutive means one comes straight after the other. What are the two numbers?`,
        letters: [{ v: 'n', means: 'the smaller number' }],
        derived: [
          { label: 'smaller', html: '<i class="var">n</i>', value: (s) => s.n },
          { label: 'larger', html: '<i class="var">n</i> + ' + gap, value: (s) => add(s.n, gap) },
        ],
        order: ['n'],
        eqs: [
          { because: `The next ${kind === 'whole' ? 'whole' : kind} number is ${gap} more. So add n + (n + ${gap}).`, prompt: 'Which equation adds the two numbers?', eq: e, options: options({ eq: e, disp: { L: [T(1, 'n'), B(1, [T(1, 'n'), T(gap)])], R: [T(S)] } }, [
            gap === 2 ? { eq: E({ n: 2 }, S - 1), disp: { L: [T(1, 'n'), B(1, [T(1, 'n'), T(1)])], R: [T(S)] }, trap: 'consecutive-odd', why: `Consecutive ${kind} numbers are 2 apart. Use n and n + 2.` }
              : { eq: E({ n: 2 }, S - 2), disp: { L: [T(1, 'n'), B(1, [T(1, 'n'), T(2)])], R: [T(S)] }, trap: 'consecutive-odd', why: 'Consecutive whole numbers are 1 apart. Use n and n + 1.' },
            { eq: E({ n: 1 }, S - gap), disp: { L: [T(1, 'n'), T(gap)], R: [T(S)] }, trap: 'consecutive-one', why: 'There are two numbers: n and the next one, n + ' + gap + '. Add both.' },
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
      text: `<b>${word(a)[0].toUpperCase() + word(a).slice(1)}</b> a number plus a second number is <b>${S}</b>. The first number minus <b>${word(b)}</b> the second is <b>${D}</b>. What are the two numbers?`,
      letters: [{ v: 'x', means: 'the first number' }, { v: 'y', means: 'the second number' }],
      order: ['x', 'y'],
      eqs: [
        { because: `“${word(a)} a number” is ${a}x. Then add the second number, y.`, prompt: 'Which equation is the first sentence?', eq: e1, options: options({ eq: e1 }, [{ eq: E({ x: 1, y: a }, S), trap: 'times-wrong-letter', why: `“${word(a)} a number” is ${a}x. It is the first number that is multiplied.` }]) },
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
      { what: 'juice', unit: 'litres', a: 'weak', b: 'strong', make: (T_, c) => `A café needs <b>${T_} litres</b> of drink that is <b>${c}% juice</b>` },
      { what: 'sugar', unit: 'litres', a: 'thin', b: 'thick', make: (T_, c) => `A dessert stall needs <b>${T_} litres</b> of syrup that is <b>${c}% sugar</b>` },
      { what: 'alcohol', unit: 'gallons', a: 'weak', b: 'strong', make: (T_, c) => `A lab needs <b>${T_} gallons</b> of a solution that is <b>${c}% alcohol</b>` },
      { what: 'blue', unit: 'litres', a: 'light', b: 'dark', make: (T_, c) => `A painter needs <b>${T_} litres</b> of paint that is <b>${c}% blue</b>` },
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
    const text = `${skin.make(Tot, c)}. They mix one that is <b>${pa}%</b> ${skin.what} with one that is <b>${pb}%</b> ${skin.what}. How many ${u} of each do they need?`;
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
          { eq: E({ a: 1, b: 1 }, pa + pb), trap: 'percent-is-amount', why: `${pa}% and ${pb}% are strengths, not amounts. The whole mix is ${Tot} ${u}.` }]) },
        { because: `Count only the pure part. ${pa}% of a plus ${pb}% of b = ${c}% of all ${Tot} ${u}.`, prompt: 'Which equation counts only the pure part?', eq: e2, options: options({ eq: e2 }, [
          { eq: E({ a: Q(pa, 100), b: Q(pb, 100) }, Q(c, 100)), trap: 'mixture-no-total', why: `The pure part is ${c}% OF all ${Tot} ${u}. That is 0.${String(c).padStart(2, '0')} × ${Tot}.` },
          { eq: E({ a: Q(pb, 100), b: Q(pa, 100) }, Q(c * Tot, 100)), trap: 'swap-values', why: `a is the ${pa}% one. So write 0.${String(pa).padStart(2, '0')}a.` },
          { eq: E({ a: 1, b: 1 }, Q(c * Tot, 100)), trap: 'count-is-value', why: 'Only part of each one is pure. Multiply each amount by its percentage.' },
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
    const text = `Think of a fraction. Take <b>${k1} away</b> from its top and its bottom. You get ${fr(f1)}. Start again. This time, <b>add ${k2}</b> to its top and its bottom. You get ${fr(f2)}. What is the fraction?`;
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
        { because: `Take ${k1} from the top and the bottom. Then cross-multiply: each top × the other bottom.`, prompt: `Cross-multiply the first clue. Which equation?`, eq: e1, options: options({ eq: e1, disp: disp1 }, [
          { eq: E({ n: f1.n, d: -f1.d }, k1 * (f1.n - f1.d)), disp: { L: [B(f1.n, [T(1, 'n'), T(-k1)])], R: [B(f1.d, [T(1, 'd'), T(-k1)])] }, trap: 'cross-multiply',
            why: `Cross-multiply means top of one × bottom of the other. So ${f1.d} goes with the top, n − ${k1}.` },
          { eq: E({ n: f1.d, d: -f1.n }, k1 * f1.d), disp: { L: [B(f1.d, [T(1, 'n'), T(-k1)])], R: [T(f1.n, 'd')] }, trap: 'change-one-part', why: 'Take it away from the top AND the bottom.' },
        ]) },
        { because: `Add ${k2} to the top and the bottom. Then cross-multiply the same way.`, prompt: 'And the second clue?', eq: e2, options: options({ eq: e2, disp: disp2 }, [
          { eq: E({ n: f2.d, d: -f2.n }, -k2 * f2.d), disp: { L: [B(f2.d, [T(1, 'n'), T(k2)])], R: [T(f2.n, 'd')] }, trap: 'change-one-part', why: 'Add it to the top AND the bottom.' },
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
