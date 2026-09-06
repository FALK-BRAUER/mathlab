/**
 * Bundle every app into one self-contained page: dist/mathlab.html
 *
 *   node tools/bundle.mjs
 *
 * ARCHITECTURE.md keeps the theme and engine shared rather than copied into each app.
 * That costs the ability to hand someone a single file, which is exactly what publishing
 * as an Artifact needs — so this inlines them instead of forking them. The apps stay the
 * source of truth: each registers itself with MathLab.app(), and this script only lifts
 * that registration out of its standalone page and adds a router around the set.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => readFileSync(join(root, ...p), 'utf8');

const css = read('shared', 'theme.css');
const engine = read('shared', 'engine.js');
const algebra = read('shared', 'algebra.js');
const problems = read('shared', 'problems.js');

/** Pull the `MathLab.app(...)` registration out of a standalone app page. */
function registration(file) {
  const html = read('apps', file);
  const block = html
    .split(/<script(?![^>]*\bsrc=)[^>]*>/)
    .find((chunk) => chunk.includes('MathLab.app('));
  if (!block) throw new Error(`no MathLab.app() registration found in apps/${file}`);
  return block.slice(0, block.indexOf('</script>')).trim();
}

// Teaching order, not alphabetical — substitution is what the rest builds on.
const ORDER = ['step-builder.html', 'like-terms.html', 'substitution.html'];
const rank = (f) => (ORDER.indexOf(f) === -1 ? ORDER.length : ORDER.indexOf(f));

const appFiles = readdirSync(join(root, 'apps'))
  .filter((f) => f.endsWith('.html'))
  .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
const registrations = appFiles.map(registration).join('\n\n');

// Topics the worksheets cover that do not have a game yet.
const planned = [
  ['✖️', 'Product Builder', 'Multiply terms: 5s × st, 6x × y − 5x × 2y.'],
  ['➗', 'Quotient Cruncher', 'Cancel and simplify fractions like 9pq ÷ 3q².'],
  ['🔍', 'HCF Detective', 'Find the highest common factor of two terms.'],
  ['🍫', 'Chocolate Box', 'Turn word problems into expressions, then solve them.'],
];

const plannedHTML = planned
  .map(([emoji, title, blurb]) => `
      <li class="tile soon">
        <span class="emoji">${emoji}</span>
        <h3>${title}</h3>
        <p>${blurb}</p>
      </li>`)
  .join('');

const page = `<title>mathlab</title>
<style>
${css}
/* ---------- bundle-only: hub tiles as buttons, and view switching ---------- */

.grid { list-style: none; padding: 0; margin: 0; }

button.tile {
  display: block;
  width: 100%;
  text-align: left;
  font: inherit;
  background: var(--card);
  color: var(--ink);
  border: none;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
  cursor: pointer;
}

button.tile:hover { filter: none; transform: translateY(-2px); }
button.tile .emoji { font-size: 2rem; display: block; }
button.tile h3 { font-size: 1.1rem; margin: 8px 0 4px; }
button.tile p { margin: 0; color: var(--muted); font-size: .9rem; }

li.tile {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
  opacity: .5;
}

li.tile .emoji { font-size: 2rem; display: block; }
li.tile h3 { font-size: 1.1rem; margin: 8px 0 4px; }
li.tile p { margin: 0; color: var(--muted); font-size: .9rem; }

li.tile::after {
  content: "coming soon";
  display: inline-block;
  margin-top: 10px;
  font-size: .7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--muted);
}

:focus-visible { outline: 3px solid var(--brand); outline-offset: 2px; }

.hub-note {
  color: var(--muted);
  font-size: .9rem;
  margin: 22px 0 10px;
  font-weight: 700;
}
</style>

<main class="wrap">
  <section id="view-hub">
    <div class="topbar">
      <h1>🧪 mathlab</h1>
      <p class="tagline">Little games for the algebra chapter. Pick one and start.</p>
    </div>
    <div class="idea">
      <b>The one idea</b>
      <p>A block is a <em>thing</em>. <span class="op">+</span> and <span class="op">−</span> are the
      joints between blocks — they are not instructions telling you to do something.</p>
      <p>Blocks of the same shape can join. Different shapes never join, no matter how much
      the <span class="op">+</span> looks like it wants you to. Almost every mistake in this
      whole topic is that one thing.</p>
    </div>

    <ul class="grid" id="hub-grid"></ul>
    <p class="hub-note">Still being built:</p>
    <ul class="grid">${plannedHTML}
    </ul>
  </section>

  <section id="view-app" hidden>
    <div class="topbar">
      <button class="back" type="button" id="back">← All apps</button>
      <h1 id="app-title"></h1>
      <p class="tagline" id="app-tagline"></p>
    </div>
    <div id="game"></div>
  </section>
</main>

<script>
${engine}
</script>

<script>
${algebra}
</script>

<script>
${problems}
</script>

<script>
${registrations}
</script>

<script>
(() => {
  const hub = document.getElementById('view-hub');
  const view = document.getElementById('view-app');
  const grid = document.getElementById('hub-grid');
  const started = new Set();

  const apps = MathLab.listApps();

  for (const a of apps) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.innerHTML =
      '<span class="emoji">' + a.emoji + '</span>' +
      '<h3>' + a.title + '</h3>' +
      '<p>' + a.blurb + '</p>';
    b.addEventListener('click', () => { location.hash = a.key; });
    li.appendChild(b);
    grid.appendChild(li);
  }

  function show() {
    const key = location.hash.replace(/^#/, '');
    const a = apps.find((x) => x.key === key);

    if (!a) {
      hub.hidden = false;
      view.hidden = true;
      document.title = 'mathlab';
      return;
    }

    hub.hidden = true;
    view.hidden = false;
    document.getElementById('app-title').textContent = a.emoji + ' ' + a.title;
    document.getElementById('app-tagline').textContent = a.tagline;
    document.title = a.title + ' · mathlab';

    // Restart on every visit so the kid gets a fresh question, but only build once.
    if (!started.has(a.key)) started.add(a.key);
    MathLab.run(a.key, '#game');
    window.scrollTo(0, 0);
  }

  document.getElementById('back').addEventListener('click', () => { location.hash = ''; });
  window.addEventListener('hashchange', show);
  show();
})();
</script>
`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'mathlab.html'), page);

console.log(`dist/mathlab.html  ${(page.length / 1024).toFixed(1)} KB`);
console.log(`apps bundled: ${appFiles.join(', ')}`);
