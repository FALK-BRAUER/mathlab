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
const linear = read('shared', 'linear.js');
const grid = read('shared', 'grid.js');
const stories = read('shared', 'stories.js');

/** Read an app's identity straight out of its registration, so nothing is typed twice. */
function identity(file) {
  const html = read('apps', file);
  const grab = (key) => {
    const m = new RegExp(key + ": '((?:[^'\\\\]|\\\\.)*)'").exec(html);
    return m ? m[1].replace(/\\'/g, "'") : '';
  };
  return { file, emoji: grab('emoji'), title: grab('title'), blurb: grab('blurb') };
}

/** Pull the `MathLab.app(...)` registration out of a standalone app page. */
function registration(file) {
  const html = read('apps', file);
  const block = html
    .split(/<script(?![^>]*\bsrc=)[^>]*>/)
    .find((chunk) => chunk.includes('MathLab.app('));
  if (!block) throw new Error(`no MathLab.app() registration found in apps/${file}`);
  return block.slice(0, block.indexOf('</script>')).trim();
}

// Teaching order, not alphabetical. The daily mix first: it is the thing to open every day.
// Then the current chapter (lines and pairs of equations), then the earlier algebra chapter.
const ORDER = ['daily-mix.html',
               'line-lab.html', 'crossing.html', 'two-equations.html', 'story-solver.html',
               'step-builder.html', 'like-terms.html', 'substitution.html',
               'hcf-detective.html', 'chocolate-box.html'];
const rank = (f) => (ORDER.indexOf(f) === -1 ? ORDER.length : ORDER.indexOf(f));

const appFiles = readdirSync(join(root, 'apps'))
  .filter((f) => f.endsWith('.html'))
  .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
const registrations = appFiles.map(registration).join('\n\n');

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
${linear}
</script>

<script>
${grid}
</script>

<script>
${stories}
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

/*
 * Two outputs, because they are consumed differently:
 *
 *  dist/mathlab.html   headless — the Artifact publisher wraps it in its own
 *                      <html><head> with charset and viewport.
 *  dist/index.html     a whole document, for serving over the LAN or Tailscale.
 *
 * Without the second one a phone loading the LAN URL gets no viewport meta, falls back
 * to a 980px layout viewport, and every mobile media query silently fails to fire — the
 * page renders as a shrunken desktop. Same bytes, different envelope.
 */
const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="apple-mobile-web-app-capable" content="yes">
</head>
<body>
${page}
</body>
</html>
`;

writeFileSync(join(root, 'dist', 'index.html'), standalone);

/*
 * The project-root hub, generated from the same registrations as the bundle. It used to
 * be hand-written, drifted three apps behind, and anyone opening the site root got a page
 * advertising games that had been built and tiles for games that never would be.
 */
const apps = appFiles.map(identity);

const rootHub = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>mathlab — algebra, but fun</title>
<link rel="stylesheet" href="shared/theme.css">
</head>
<body>
<!-- GENERATED by tools/bundle.mjs from the apps' own registrations. Do not edit by hand. -->
<main class="wrap">
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

  <div class="grid">
${apps.map((a) => `    <a class="tile" href="apps/${a.file}">
      <span class="emoji">${a.emoji}</span>
      <h2>${a.title}</h2>
      <p>${a.blurb}</p>
    </a>`).join('\n')}
  </div>
</main>
</body>
</html>
`;

writeFileSync(join(root, 'index.html'), rootHub);

/*
 * The daily mix draws rounds from every other app. As a standalone page it cannot load
 * their HTML files, so the same registrations the bundle inlines are written to one
 * script it can load. Generated, like the hub — never edit it by hand.
 */
const others = appFiles.filter((f) => f !== 'daily-mix.html');
writeFileSync(join(root, 'shared', 'all-apps.js'),
  '/* GENERATED by tools/bundle.mjs from apps/*.html — do not edit. Rebuild after changing any app.\n' +
  '   Every app\'s MathLab.app() registration, so the daily mix can draw rounds from all of them. */\n\n' +
  others.map(registration).join('\n\n') + '\n');

console.log(`index.html         ${apps.length} apps   (project-root hub, generated)`);
console.log(`dist/mathlab.html  ${(page.length / 1024).toFixed(1)} KB   (for publishing)`);
console.log(`dist/index.html    ${(standalone.length / 1024).toFixed(1)} KB   (for serving)`);
console.log(`shared/all-apps.js ${others.length} apps   (for the daily mix, generated)`);
console.log(`apps bundled: ${appFiles.join(', ')}`);
