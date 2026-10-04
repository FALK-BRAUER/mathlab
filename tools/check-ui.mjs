/**
 * Play every app in a real (headless) Chrome at iPhone size and look for breakage.
 *
 *   node tools/check-ui.mjs [rounds-per-level] [app ...] [--shots DIR]
 *
 * The node checkers prove the maths. They cannot see a button that is off-screen, a page
 * that scrolls sideways on a phone, or a click handler that throws. This drives the pages
 * the way a restless kid would — tapping options, keys, grid squares, "Next" — at
 * 390×844 with touch and a mobile viewport, and fails on:
 *
 *   - any uncaught exception or console error
 *   - horizontal page scroll (the page wider than the phone)
 *   - a visible tap target under 44 px tall
 *   - a level that never reaches "Next question" (a round she cannot finish)
 *
 * No dependencies: it speaks the Chrome DevTools Protocol over Node's built-in WebSocket.
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots');
const shots = shotsAt >= 0 ? args.splice(shotsAt, 2)[1] : null;
const ROUNDS = Number(args.find((a) => /^\d+$/.test(a)) || 6);
const only = args.filter((a) => !/^\d+$/.test(a));

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'mathlab-ui-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--allow-file-access-from-files', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(150);
  }
  throw new Error('Chrome did not start');
}

const ws = new WebSocket(await connect());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 1;
const pending = new Map();
const listeners = [];
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
  } else if (msg.method) listeners.forEach((fn) => fn(msg));
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

const errors = [];
listeners.push((msg) => {
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    errors.push((d.exception && d.exception.description) || d.text);
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push('console.error: ' + msg.params.args.map((a) => a.value || a.description).join(' '));
  }
});

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

async function load(url) {
  const done = new Promise((r) => {
    const fn = (msg) => { if (msg.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(fn), 1); r(); } };
    listeners.push(fn);
  });
  await send('Page.navigate', { url });
  await done;
  await sleep(120);
}

const evaluate = async (fn, ...a) => {
  const res = await send('Runtime.evaluate', {
    expression: `(${fn})(...${JSON.stringify(a)})`, awaitPromise: true, returnByValue: true,
  });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
  return res.result.value;
};

/* ---- runs inside the page ---- */
function playLevel(levelIndex, rounds, keepLast) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const visible = (e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]');
  };
  return (async () => {
    const levels = [...document.querySelectorAll('.levels button')];
    if (levels[levelIndex]) levels[levelIndex].click();
    await sleep(60);
    const out = { finished: 0, actions: 0, small: [], wide: [], stuck: 0, early: 0 };
    for (let r = 0; r < rounds; r++) {
      let finished = false;
      // before any answer, "Next" must not be on screen — or she can skip the question
      const nx = document.querySelector('[data-next]');
      if (nx && nx.hidden && nx.getBoundingClientRect().height > 0) out.early++;
      for (let a = 0; a < 320 && !finished; a++) {
        const next = document.querySelector('[data-next]');
        if (next && !next.hidden) {
          finished = true;
          // layout checks on the finished state, where the most is on screen
          if (document.documentElement.scrollWidth > window.innerWidth + 1) out.wide.push(document.documentElement.scrollWidth);
          for (const b of document.querySelectorAll('#game button, #game input')) {
            if (!visible(b)) continue;
            const h = b.getBoundingClientRect().height;
            if (h < 43.5) out.small.push((b.textContent || b.tagName).trim().slice(0, 24) + ' ' + Math.round(h) + 'px');
          }
          if (!(keepLast && r === rounds - 1)) next.click();   // leave the last finished round on screen for a screenshot
          await sleep(30);
          break;
        }
        const stage = document.querySelector('[data-stage]');
        const buttons = [...stage.querySelectorAll('button')].filter((b) => !b.disabled && visible(b));
        const svg = stage.querySelector('svg.grid-svg.tappable');
        const inputs = [...stage.querySelectorAll('input')].filter((i) => !i.disabled && visible(i));
        const roll = Math.random();
        out.actions++;
        if (svg && roll < 0.45) {
          const rect = svg.getBoundingClientRect();
          const x = rect.left + Math.random() * rect.width, y = rect.top + Math.random() * rect.height;
          const opts = { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true };
          svg.dispatchEvent(new PointerEvent('pointerdown', opts));
          svg.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: x + 3 }));
          svg.dispatchEvent(new PointerEvent('pointerup', opts));
        } else if (inputs.length && roll < 0.75) {
          // type a plausible answer straight into the field, then press its Check
          const inp = inputs[Math.floor(Math.random() * inputs.length)];
          const pool = ['3', '-2', '1/2', '0', '12', '-5', 'x+y=5', '2x-y=3', '7', '4', '1.5'];
          inp.value = pool[Math.floor(Math.random() * pool.length)];
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          const go = inp.closest('.answer-box')?.querySelector('[data-go]');
          if (go && !go.disabled && Math.random() < 0.6) go.click();
        } else if (buttons.length) {
          buttons[Math.floor(Math.random() * buttons.length)].click();
        }
        await sleep(Math.random() < 0.2 ? 420 : 15);   // let the 380ms option animations land sometimes
      }
      if (finished) out.finished++; else out.stuck++;
    }
    return out;
  })();
}

const appsDir = join(root, 'apps');
const files = readdirSync(appsDir).filter((f) => f.endsWith('.html'))
  .filter((f) => !only.length || only.some((o) => f.startsWith(o)));
if (shots) mkdirSync(shots, { recursive: true });

let failed = false;
for (const f of files) {
  await load(pathToFileURL(join(appsDir, f)).href);
  const nLevels = await evaluate(() => document.querySelectorAll('.levels button').length);
  for (let i = 0; i < nLevels; i++) {
    const name = await evaluate((k) => document.querySelectorAll('.levels button')[k].textContent, i);
    if (shots) {
      await evaluate((k) => { document.querySelectorAll('.levels button')[k].click(); }, i);
      await sleep(80);
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      writeFileSync(join(shots, f.replace('.html', '') + '-' + i + '.png'), Buffer.from(data, 'base64'));
    }
    const before = errors.length;
    const res = await evaluate(playLevel, i, ROUNDS, !!shots);
    if (shots) {
      await evaluate(() => { const b = document.querySelector('.bridge, .checks, .report, [data-feedback]'); if (b) b.scrollIntoView({ block: 'start' }); });
      await sleep(150);
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(shots, f.replace('.html', '') + '-' + i + '-end.png'), Buffer.from(data, 'base64'));
    }
    const errs = errors.slice(before);
    const small = [...new Set(res.small)];
    const bad = errs.length || res.wide.length || small.length || res.stuck || res.early;
    if (bad) failed = true;
    console.log(`${bad ? '✗' : '✓'} ${f.padEnd(22)} ${name.padEnd(20)} ${res.finished}/${ROUNDS} rounds, ${res.actions} taps` +
      (res.stuck ? `  STUCK ${res.stuck}` : '') +
      (res.early ? `  NEXT-BEFORE-ANSWER ${res.early}` : '') +
      (res.wide.length ? `  WIDE ${Math.max(...res.wide)}px` : '') +
      (small.length ? `  SMALL ${small.slice(0, 4).join(' | ')}` : ''));
    for (const e of [...new Set(errs)].slice(0, 5)) console.log('     ' + String(e).split('\n').slice(0, 3).join(' / '));
  }
}

ws.close();
chrome.kill();
process.exit(failed ? 1 : 0);
