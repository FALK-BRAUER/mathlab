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

    /** submit(correct) — or submit(correct, points) when the app scores its own process. */
    function submit(correct, points) {
      if (answered) return;
      answered = true;

      if (correct) {
        streak += 1;
        score += typeof points === 'number' ? points : 10 + Math.min(streak, 10) * 2;
        if (streak > best) {
          best = streak;
          store.write(config.key, { best });
        }
        el.feedback.className = 'feedback good';
        el.feedback.innerHTML = pick(['Nice one! 🎉', 'Correct! ⭐️', 'Got it! 🚀', 'Spot on! 💡']);
      } else {
        streak = 0;
        el.feedback.className = 'feedback bad';
        el.feedback.innerHTML =
          'Not quite. <span class="why">Answer: <b>' + round.solution + '</b></span>';
      }

      el.feedback.hidden = false;
      el.next.hidden = false;
      el.next.focus();
      paintScores();
    }

    function newRound() {
      answered = false;
      round = config.levels[level].make();

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
    createGame, textAnswer,
    app, run, listApps,
  };
})();
