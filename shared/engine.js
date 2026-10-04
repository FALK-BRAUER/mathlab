/* mathlab engine — shared quiz shell, algebra helpers, progress. Vanilla JS, no build. */

const MathLab = (() => {
  /* ---------------- random helpers ---------------- */

  const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const rndNonZero = (min, max) => {
    let v;
    do { v = rnd(min, max); } while (v === 0);
    return v;
  };

  const pick = (arr) => arr[rnd(0, arr.length - 1)];

  const sample = (arr, n) => shuffle(arr.slice()).slice(0, n);

  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rnd(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  /* ---------------- algebra term model ----------------
     A term is { coeff: Number, vars: { x: 2, y: 1 } }.
     canonical(term) -> "6|p1q1" so 6pq and 6qp compare equal. */

  const TERM_RE = /^([+-]?\d*)((?:[a-z](?:\^-?\d+)?)*)$/;
  const VAR_RE = /([a-z])(?:\^(-?\d+))?/g;

  /** Parse one term string ("−2x^2y") into { coeff, vars }, or null if malformed. */
  function parseTerm(raw) {
    const s = String(raw)
      .replace(/\s+/g, '')
      .replace(/[−–—]/g, '-')     // unicode minus variants
      .replace(/\*/g, '')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .toLowerCase();

    const m = TERM_RE.exec(s);
    if (!m) return null;

    const [, coeffRaw, varsRaw] = m;
    if (coeffRaw === '' && varsRaw === '') return null;

    let coeff;
    if (coeffRaw === '' || coeffRaw === '+') coeff = 1;
    else if (coeffRaw === '-') coeff = -1;
    else coeff = Number(coeffRaw);

    const vars = {};
    let v;
    VAR_RE.lastIndex = 0;
    while ((v = VAR_RE.exec(varsRaw)) !== null) {
      const power = v[2] === undefined ? 1 : Number(v[2]);
      vars[v[1]] = (vars[v[1]] || 0) + power;   // "xx" folds into x^2
    }
    for (const k of Object.keys(vars)) if (vars[k] === 0) delete vars[k];

    return { coeff, vars };
  }

  /** Variable signature only — 3pq and -7pq share one, which is what "like terms" means. */
  function signature(term) {
    return Object.keys(term.vars).sort().map((k) => k + term.vars[k]).join('');
  }

  function canonicalTerm(term) {
    if (term.coeff === 0) return null;
    return term.coeff + '|' + signature(term);
  }

  /** Split "2x^2-3x+1" into ["+2x^2", "-3x", "+1"] without breaking on "^-1". */
  function splitTerms(expr) {
    const s = String(expr).replace(/\s+/g, '').replace(/[−–—]/g, '-');
    const out = [];
    let buf = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const isSign = ch === '+' || ch === '-';
      const afterCaret = i > 0 && s[i - 1] === '^';
      if (isSign && buf !== '' && !afterCaret) {
        out.push(buf);
        buf = ch;
      } else {
        buf += ch;
      }
    }
    if (buf !== '') out.push(buf);
    return out;
  }

  /**
   * Canonical form of a whole expression: like terms collected, terms sorted.
   * Returns null when the input cannot be parsed (so callers can say "I can't read that").
   * "3pq+4pq-pq" and "6qp" both -> "6|p1q1".
   */
  function canon(expr) {
    const parts = splitTerms(expr);
    if (!parts.length) return null;

    const buckets = new Map();
    for (const part of parts) {
      const term = parseTerm(part);
      if (!term) return null;
      const sig = signature(term);
      buckets.set(sig, (buckets.get(sig) || 0) + term.coeff);
    }

    const terms = [...buckets.entries()]
      .filter(([, coeff]) => coeff !== 0)
      .map(([sig, coeff]) => coeff + '|' + sig)
      .sort();

    return terms.length ? terms.join('+') : '0';
  }

  /** True when both sides parse and mean the same thing. */
  function sameExpression(a, b) {
    const ca = canon(a);
    const cb = canon(b);
    return ca !== null && cb !== null && ca === cb;
  }

  /* ---------------- rendering ---------------- */

  /** { coeff, vars } -> "-2x²y" for display. */
  function formatTerm(term, { leadingPlus = false } = {}) {
    const sig = Object.keys(term.vars).sort();
    const body = sig
      .map((k) => k + (term.vars[k] === 1 ? '' : sup(term.vars[k])))
      .join('');

    let coeff = String(Math.abs(term.coeff));
    if (body && Math.abs(term.coeff) === 1) coeff = '';

    const sign = term.coeff < 0 ? '-' : leadingPlus ? '+' : '';
    return sign + coeff + body;
  }

  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (n) => String(n).split('').map((c) => SUP[c] || c).join('');

  /** Join terms into "2x² - 3x + 1" with spaced operators. */
  function formatSum(terms) {
    return terms
      .map((t, i) => formatTerm(t, { leadingPlus: i > 0 }))
      .join(' ')
      .replace(/ ([+-])/g, ' $1 ');
  }

  /**
   * Italicise single letters so 2xy reads like a textbook.
   * Skips anything inside a tag — fraction rendering hands us real markup, and
   * italicising the letters in `<span class="frac">` destroys it.
   */
  function mathHTML(text) {
    return String(text).replace(/<[^>]*>|[a-z]/g, (m) =>
      m.length > 1 ? m : '<i class="var">' + m + '</i>');
  }

  /* ---------------- progress ---------------- */

  const store = {
    read(key) {
      try { return JSON.parse(localStorage.getItem('mathlab:' + key) || '{}'); }
      catch { return {}; }
    },
    write(key, value) {
      try { localStorage.setItem('mathlab:' + key, JSON.stringify(value)); }
      catch { /* private browsing — scores just don't persist */ }
    },
  };

  /* ---------------- learning log ----------------
     What the parent report reads: every round (first try right or not), every trap she
     picked, every time she tried to stop before the question was answered. Kept on the
     device only, capped so it never grows without bound. */

  const LOG_MAX = 1500;
  let context = { app: '', level: '' };

  function note(kind, detail = {}) {
    const log = store.read('log');
    const list = Array.isArray(log.events) ? log.events : [];
    list.push({ t: Date.now(), app: context.app, level: context.level, kind, ...detail });
    store.write('log', { events: list.slice(-LOG_MAX) });
  }

  const readLog = () => {
    const log = store.read('log');
    return Array.isArray(log.events) ? log.events : [];
  };

  /* ---------------- quiz shell ----------------
     A game supplies levels; each level's make() returns a round:
       { question, given?, hint, solution, mount(stage, submit) }
     mount() renders the answer UI and calls submit(isCorrect) when the kid answers. */

  function createGame(config) {
    const root = document.querySelector(config.mount || '#game');
    const saved = store.read(config.key);

    let level = 0;
    let score = 0;
    let streak = 0;
    let best = saved.best || 0;
    let round = null;
    let answered = false;

    root.innerHTML = `
      <div class="levels" role="group" aria-label="Difficulty"></div>
      <div class="scoreboard">
        <div class="stat"><b data-score>0</b><span>Score</span></div>
        <div class="stat"><b data-streak>0</b><span>Streak</span></div>
        <div class="stat"><b data-best>0</b><span>Best</span></div>
      </div>
      <div class="feedback" data-feedback hidden></div>
      <div class="hint" data-hint hidden></div>
      <div class="card">
        <p class="prompt" data-prompt></p>
        <p class="question" data-question></p>
        <ul class="given" data-given></ul>
        <div data-stage></div>
      </div>
      <div class="answer-row">
        <button data-next hidden>Next question →</button>
        <button class="ghost" data-hint-btn${config.ownHints ? ' hidden' : ''}>Need a hint?</button>
      </div>
    `;

    const el = {
      levels: root.querySelector('.levels'),
      score: root.querySelector('[data-score]'),
      streak: root.querySelector('[data-streak]'),
      best: root.querySelector('[data-best]'),
      feedback: root.querySelector('[data-feedback]'),
      hint: root.querySelector('[data-hint]'),
      prompt: root.querySelector('[data-prompt]'),
      question: root.querySelector('[data-question]'),
      given: root.querySelector('[data-given]'),
      stage: root.querySelector('[data-stage]'),
      next: root.querySelector('[data-next]'),
      hintBtn: root.querySelector('[data-hint-btn]'),
    };

    config.levels.forEach((lv, i) => {
      const btn = document.createElement('button');
      btn.textContent = lv.name;
      btn.setAttribute('aria-pressed', String(i === 0));
      btn.addEventListener('click', () => {
        level = i;
        [...el.levels.children].forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
        streak = 0;
        newRound();
      });
      el.levels.appendChild(btn);
    });

    function paintScores() {
      el.score.textContent = score;
      el.streak.textContent = streak;
      el.best.textContent = best;
    }

    /**
     * submit(correct) — or submit(correct, points) when the app scores its own process,
     * or submit(correct, points, why) to say WHAT went wrong, not just that it did.
     * Naming the error is worth more than showing the answer (Van der Kleij et al. 2015).
     */
    function submit(correct, points, why) {
      if (answered) return;
      answered = true;
      if (round.noScore) { el.next.hidden = false; return; }   // a summary screen, not a question
      note('round', { ok: !!correct, firstTry: round.firstTry !== false && !!correct });

      if (correct) {
        streak += 1;
        score += typeof points === 'number' ? points : 10 + Math.min(streak, 10) * 2;
        if (streak > best) {
          best = streak;
          store.write(config.key, { best });
        }
        el.feedback.className = 'feedback good';
        el.feedback.innerHTML = pick(['Nice one! 🎉', 'Correct! ⭐️', 'Got it! 🚀', 'Spot on! 💡']) +
          (why ? '<span class="why">' + why + '</span>' : '');
      } else {
        streak = 0;
        el.feedback.className = 'feedback bad';
        el.feedback.innerHTML = 'Not quite.' +
          (why ? '<span class="why">' + why + '</span>' : '') +
          (round.solution ? '<span class="why">Answer: <b>' + round.solution + '</b></span>' : '');
      }

      el.feedback.hidden = false;
      el.next.hidden = false;
      el.next.focus();
      paintScores();
    }

    function newRound() {
      answered = false;
      context = { app: config.key, level: config.levels[level].name };
      round = config.levels[level].make();
      if (round.origin) context = { ...round.origin };
      el.hintBtn.hidden = !!config.ownHints || !!round.noHint;

      el.feedback.hidden = true;
      el.hint.hidden = true;
      el.next.hidden = true;
      el.prompt.innerHTML = round.prompt || config.prompt || '';
      el.question.innerHTML = round.question || '';
      el.stage.innerHTML = '';

      el.given.innerHTML = (round.given || [])
        .map((g) => '<li>' + mathHTML(g) + '</li>')
        .join('');

      round.mount(el.stage, submit);
    }

    el.next.addEventListener('click', newRound);
    el.hintBtn.addEventListener('click', () => {
      el.hint.innerHTML = '<b>Hint:</b> ' + (round.hint || 'Take it one step at a time.');
      el.hint.hidden = !el.hint.hidden;
    });

    paintScores();
    newRound();
  }

  /* ---------------- reusable answer UIs ---------------- */

  /** Free-text answer judged by `check`. Enter submits. */
  function textAnswer(stage, submit, { check, placeholder = 'your answer' }) {
    const row = document.createElement('div');
    row.className = 'answer-row';
    row.innerHTML = `
      <input type="text" placeholder="${placeholder}" autocomplete="off"
             autocapitalize="off" autocorrect="off" spellcheck="false">
      <button type="button">Check</button>
    `;

    const input = row.querySelector('input');
    const btn = row.querySelector('button');

    const go = () => {
      const raw = input.value.trim();
      if (!raw) return;
      input.disabled = true;
      btn.disabled = true;
      submit(check(raw));
    };

    btn.addEventListener('click', go);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

    stage.appendChild(row);
    input.focus();
  }

  /**
   * Multiple choice where a wrong pick is not the end of the round: that option turns red,
   * the reason it is wrong is named, the trap is logged, and she picks again.
   *   options: [{ html, ok, why, trap }]   (caller shuffles)
   *   onDone(misses, box) when the right one is picked
   */
  function choice(host, { title, options, onDone, onMiss }) {
    const box = document.createElement('div');
    box.className = 'predict';
    box.innerHTML = (title ? '<b>' + title + '</b>' : '') +
      '<div class="options"></div><p class="why-line" aria-live="polite"> </p>';
    const holder = box.querySelector('.options');
    const why = box.querySelector('.why-line');
    let misses = 0;
    let settled = false;

    const buttons = options.map((opt) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option';
      // one wrapper: whatever display the button gets, its contents flow as normal text
      b.innerHTML = '<span class="opt-body">' + opt.html + '</span>';
      b.addEventListener('click', () => {
        if (settled) return;
        if (opt.ok) {
          settled = true;
          b.classList.add('hit');
          buttons.forEach((x) => { x.disabled = true; });
          why.className = 'why-line good';
          why.innerHTML = opt.why || ' ';
          setTimeout(() => onDone(misses, box), 380);
        } else {
          misses += 1;
          b.classList.add('miss');
          b.disabled = true;
          why.className = 'why-line bad';
          why.innerHTML = opt.why || 'Not that one — look again.';
          if (opt.trap) note('trap', { trap: opt.trap });
          if (onMiss) onMiss(opt, misses);
        }
      });
      holder.appendChild(b);
      return b;
    });

    host.appendChild(box);
    return {
      box,
      /** Reveal the right answer (the "stuck" button). */
      reveal() {
        const i = options.findIndex((o) => o.ok);
        if (i >= 0 && !settled) { misses += 1; buttons[i].click(); }
      },
    };
  }

  /**
   * Typed answers with an on-screen keypad. On a phone the system keyboard covers half the
   * screen and hides the minus sign behind a mode switch — a sign-error machine. The keypad
   * puts − and / one tap away and keeps the question visible. A real keyboard still works.
   *
   *   fields: [{ key, label, unit, long }]
   *   keys:   extra keys, e.g. ['x', 'y', '(', ')', '=', '+']
   *   onSubmit(values) -> { ok, why, wrong: [keys], right: [keys] } — return nothing to ignore
   */
  function fields(host, { fields: list, keys = [], submitLabel = 'Check', onSubmit }) {
    const box = document.createElement('div');
    box.className = 'answer-box';
    box.innerHTML = '<div class="fields"></div><div class="keypad"></div>' +
      '<div class="answer-row"><button type="button" data-go>' + submitLabel + '</button></div>' +
      '<p class="why-line" aria-live="polite"> </p>';
    const fieldsEl = box.querySelector('.fields');
    const pad = box.querySelector('.keypad');
    const go = box.querySelector('[data-go]');
    const why = box.querySelector('.why-line');
    const inputs = {};
    let target = null;

    const focus = (inp) => {
      target = inp;
      Object.values(inputs).forEach((i) => i.classList.toggle('on', i === inp));
    };

    for (const f of list) {
      const row = document.createElement('div');
      row.className = 'field';
      const id = 'f' + Math.random().toString(36).slice(2, 8);
      row.innerHTML = '<label for="' + id + '"' + (f.long ? ' class="long"' : '') + '>' + f.label + '</label>' +
        '<input type="text" id="' + id + '" inputmode="none" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">' +
        (f.unit ? '<span class="unit">' + f.unit + '</span>' : '');
      const inp = row.querySelector('input');
      inp.addEventListener('focus', () => focus(inp));
      inp.addEventListener('pointerdown', () => focus(inp));
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitNow(); } });
      inp.addEventListener('input', () => { inp.classList.remove('wrong'); why.innerHTML = ' '; });
      inputs[f.key] = inp;
      fieldsEl.appendChild(row);
    }

    // a number pad for numbers; letters and brackets only when an equation is being written
    const letters = keys.filter((k) => /^[a-z]$/.test(k));
    const KEYS = letters.length
      ? ['7', '8', '9', '−', '+', '⌫', '4', '5', '6', '=', '(', ')', '1', '2', '3', '0', '.', '/', ...letters]
      : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '−', '/', '.', '⌫'];
    // numbers: two slim rows, so the question stays on screen above the keys
    pad.style.gridTemplateColumns = 'repeat(' + (letters.length ? 6 : 7) + ', 1fr)';
    for (const k of KEYS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = k;
      if (/^[a-z]$/.test(k)) b.className = 'k-var';
      if (k === '⌫') b.className = 'k-del';
      b.setAttribute('aria-label', k === '⌫' ? 'delete' : k === '−' ? 'minus' : k);
      b.addEventListener('pointerdown', (e) => e.preventDefault());   // keep the input focused
      b.addEventListener('click', () => press(k));
      pad.appendChild(b);
    }

    function press(k) {
      const inp = target || Object.values(inputs)[0];
      if (!inp || inp.disabled) return;
      if (k === '⌫') inp.value = inp.value.slice(0, -1);
      else inp.value += k;
      inp.classList.remove('wrong');
      why.innerHTML = ' ';                                // an old complaint must not sit under a new answer
      focus(inp);
    }

    function submitNow() {
      const values = {};
      for (const [k, inp] of Object.entries(inputs)) values[k] = inp.value.trim();
      const res = onSubmit(values);
      if (!res) return;
      for (const [k, inp] of Object.entries(inputs)) {
        inp.classList.toggle('wrong', !!(res.wrong && res.wrong.includes(k)));
        inp.classList.toggle('right', !!(res.right && res.right.includes(k)));
      }
      why.className = 'why-line ' + (res.ok ? 'good' : 'bad');
      why.innerHTML = res.why || ' ';
      if (res.ok || res.lock) {
        Object.values(inputs).forEach((i) => { i.disabled = true; });
        go.disabled = true;
        pad.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      }
    }

    go.addEventListener('click', submitNow);
    host.appendChild(box);
    focus(Object.values(inputs)[0]);
    return { box, inputs, why };
  }

  /* ---------------- app registry ----------------
     Each app registers itself instead of starting on load, so the same source can run
     as a standalone page or as one view inside the bundled single-file build. */

  const apps = new Map();

  /** def: { emoji, title, tagline, blurb, build() -> levels[] } */
  const app = (key, def) => { apps.set(key, def); };

  const listApps = () => [...apps.entries()].map(([key, def]) => ({ key, ...def }));

  function run(key, mount) {
    const def = apps.get(key);
    if (!def) throw new Error('unknown app: ' + key);
    createGame({ key, mount: mount || '#game', levels: def.build(), ownHints: def.ownHints });
  }

  return {
    rnd, rndNonZero, pick, sample, shuffle,
    parseTerm, signature, canon, sameExpression, splitTerms,
    formatTerm, formatSum, mathHTML, sup,
    createGame, textAnswer, choice, fields,
    app, run, listApps,
    note, readLog, store,
  };
})();
