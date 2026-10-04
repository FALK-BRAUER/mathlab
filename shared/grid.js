/* mathlab grid — a coordinate plane you can tap on a phone.

   On an iPhone a ±6 grid is about 27px per square, well under the 44pt a finger needs.
   So a tap never has to land exactly: it snaps to the nearest grid point, a crosshair
   follows the finger while it is down, and the coordinates are shown big ABOVE the grid
   where the finger is not covering them. Lifting the finger commits the point.

   Drawing only — every judgement (is this point on the line?) is exact maths in Linear. */

const Grid = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const MINUS = '−';

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };

  const fmtNum = (v) => {
    const r = Math.round(v * 1000) / 1000;
    return (r < 0 ? MINUS : '') + Math.abs(r);
  };

  /**
   * create(host, opts) -> grid
   *   opts.xMin..yMax  visible window (default ±6)
   *   opts.xStep/yStep grid spacing and snap spacing
   *   opts.xName/yName axis letters
   *   opts.firstQuadrant  axes on the left and bottom edges (cost graphs)
   */
  function create(host, opts = {}) {
    const o = {
      xMin: -6, xMax: 6, yMin: -6, yMax: 6, xStep: 1, yStep: 1,
      xName: 'x', yName: 'y', labelEvery: 1, firstQuadrant: false, ...opts,
    };
    const W = 520, H = 520;
    const pad = o.firstQuadrant ? { l: 58, r: 18, t: 18, b: 44 } : { l: 14, r: 14, t: 14, b: 14 };

    const wrap = document.createElement('div');
    wrap.className = 'grid-wrap';
    const readout = document.createElement('div');
    readout.className = 'grid-readout';
    readout.innerHTML = '&nbsp;';
    wrap.appendChild(readout);

    const svg = el('svg', {
      viewBox: `0 0 ${W + pad.l + pad.r} ${H + pad.t + pad.b}`,
      class: 'grid-svg', role: 'img', 'aria-label': 'coordinate grid',
    });
    wrap.appendChild(svg);
    host.appendChild(wrap);

    const sx = (x) => pad.l + ((x - o.xMin) / (o.xMax - o.xMin)) * W;
    const sy = (y) => pad.t + H - ((y - o.yMin) / (o.yMax - o.yMin)) * H;

    const base = el('g', {}, svg);
    el('rect', { x: pad.l, y: pad.t, width: W, height: H, class: 'g-bg' }, base);

    const nx = Math.round((o.xMax - o.xMin) / o.xStep);
    const ny = Math.round((o.yMax - o.yMin) / o.yStep);
    for (let i = 0; i <= nx; i++) {
      const x = o.xMin + i * o.xStep;
      el('line', { x1: sx(x), y1: pad.t, x2: sx(x), y2: pad.t + H, class: 'g-grid' }, base);
    }
    for (let j = 0; j <= ny; j++) {
      const y = o.yMin + j * o.yStep;
      el('line', { x1: pad.l, y1: sy(y), x2: pad.l + W, y2: sy(y), class: 'g-grid' }, base);
    }

    // axes
    const ax = o.firstQuadrant ? o.yMin : 0;   // y-value where the x-axis sits
    const ay = o.firstQuadrant ? o.xMin : 0;   // x-value where the y-axis sits
    el('line', { x1: pad.l, y1: sy(ax), x2: pad.l + W, y2: sy(ax), class: 'g-axis' }, base);
    el('line', { x1: sx(ay), y1: pad.t, x2: sx(ay), y2: pad.t + H, class: 'g-axis' }, base);

    const fs = o.firstQuadrant ? 15 : 13;
    const labX = (x) => {
      const t = el('text', { x: sx(x), y: o.firstQuadrant ? pad.t + H + 20 : sy(ax) + 16, class: 'g-tick', 'text-anchor': 'middle', 'font-size': fs }, base);
      t.textContent = fmtNum(x);
    };
    const labY = (y) => {
      const t = el('text', { x: o.firstQuadrant ? pad.l - 8 : sx(ay) - 6, y: sy(y) + 5, class: 'g-tick', 'text-anchor': 'end', 'font-size': fs }, base);
      t.textContent = fmtNum(y);
    };
    const every = o.labelEvery;
    for (let i = 0; i <= nx; i += every) {
      const x = o.xMin + i * o.xStep;
      if (!o.firstQuadrant && x === 0) continue;
      if (!o.firstQuadrant && (i === 0 || i === nx)) continue;
      labX(x);
    }
    for (let j = 0; j <= ny; j += every) {
      const y = o.yMin + j * o.yStep;
      if (!o.firstQuadrant && y === 0) continue;
      if (!o.firstQuadrant && (j === 0 || j === ny)) continue;
      labY(y);
    }
    const nameX = el('text', { x: pad.l + W - 4, y: sy(ax) - 8, class: 'g-name', 'text-anchor': 'end' }, base);
    nameX.textContent = o.xName;
    const nameY = el('text', { x: sx(ay) + 8, y: pad.t + 16, class: 'g-name' }, base);
    nameY.textContent = o.yName;

    const layers = {
      lines: el('g', {}, svg),
      points: el('g', {}, svg),
      overlay: el('g', { 'pointer-events': 'none' }, svg),
    };

    /** Draw the equation a·X + b·Y = k (X, Y = the grid's two letters), clipped to the window. */
    function line(eqn, { cls = 'a', label, vars = [o.xName, o.yName], layer = 'lines', dashed = false } = {}) {
      const a = num(eqn.co[vars[0]]), b = num(eqn.co[vars[1]]), k = num(eqn.k);
      const pts = [];
      if (Math.abs(b) > 1e-12) {
        for (const x of [o.xMin, o.xMax]) pts.push([x, (k - a * x) / b]);
      }
      if (Math.abs(a) > 1e-12) {
        for (const y of [o.yMin, o.yMax]) pts.push([(k - b * y) / a, y]);
      }
      const inside = pts.filter(([x, y]) => x >= o.xMin - 1e-9 && x <= o.xMax + 1e-9 && y >= o.yMin - 1e-9 && y <= o.yMax + 1e-9);
      if (inside.length < 2) return null;
      inside.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      const [p, q] = [inside[0], inside[inside.length - 1]];
      const g = el('g', { class: 'g-line g-line-' + cls + (dashed ? ' g-dashed' : '') }, layers[layer]);
      el('line', { x1: sx(p[0]), y1: sy(p[1]), x2: sx(q[0]), y2: sy(q[1]) }, g);
      if (label) {
        // label near the end that sits highest on screen, nudged inside the window
        const end = sy(p[1]) < sy(q[1]) ? p : q;
        const lx = Math.min(Math.max(sx(end[0]), pad.l + 30), pad.l + W - 30);
        const ly = Math.min(Math.max(sy(end[1]) + 22, pad.t + 22), pad.t + H - 10);
        const t = el('text', { x: lx, y: ly, class: 'g-label', 'text-anchor': 'middle' }, g);
        t.textContent = label;
      }
      return g;
    }

    /** A dot at (x, y); cls = user | good | bad | given | ghost. */
    function point(x, y, { cls = 'user', label, layer = 'points', r = 9 } = {}) {
      const g = el('g', { class: 'g-pt g-pt-' + cls }, layers[layer]);
      el('circle', { cx: sx(x), cy: sy(y), r }, g);
      if (label) {
        const right = sx(x) < pad.l + W - 80;
        const t = el('text', { x: sx(x) + (right ? 13 : -13), y: sy(y) - 12, class: 'g-label', 'text-anchor': right ? 'start' : 'end' }, g);
        t.textContent = label;
      }
      return g;
    }

    function clear(layer) {
      const names = layer ? [layer] : ['lines', 'points', 'overlay'];
      for (const n of names) layers[n].innerHTML = '';
    }

    /* ---------- taps ---------- */

    let tapHandler = null;
    let active = false;
    const cross = el('g', { class: 'g-cross', visibility: 'hidden' }, layers.overlay);
    const cv = el('line', {}, cross), ch = el('line', {}, cross);
    const cc = el('circle', { r: 13 }, cross);

    function snap(ev) {
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const m = svg.getScreenCTM();
      if (!m) return null;
      const p = pt.matrixTransform(m.inverse());
      let x = o.xMin + ((p.x - pad.l) / W) * (o.xMax - o.xMin);
      let y = o.yMin + ((pad.t + H - p.y) / H) * (o.yMax - o.yMin);
      x = Math.round(x / o.xStep) * o.xStep;
      y = Math.round(y / o.yStep) * o.yStep;
      x = Math.min(Math.max(x, o.xMin), o.xMax);
      y = Math.min(Math.max(y, o.yMin), o.yMax);
      return { x: x || 0, y: y || 0 };
    }

    function showCross(p) {
      cross.setAttribute('visibility', 'visible');
      cv.setAttribute('x1', sx(p.x)); cv.setAttribute('x2', sx(p.x)); cv.setAttribute('y1', pad.t); cv.setAttribute('y2', pad.t + H);
      ch.setAttribute('y1', sy(p.y)); ch.setAttribute('y2', sy(p.y)); ch.setAttribute('x1', pad.l); ch.setAttribute('x2', pad.l + W);
      cc.setAttribute('cx', sx(p.x)); cc.setAttribute('cy', sy(p.y));
      readout.innerHTML = '(' + fmtNum(p.x) + ', ' + fmtNum(p.y) + ')';
      readout.classList.add('live');
    }

    function hideCross() {
      cross.setAttribute('visibility', 'hidden');
      readout.classList.remove('live');
    }

    let last = null;
    svg.addEventListener('pointerdown', (ev) => {
      if (!tapHandler) return;
      ev.preventDefault();
      active = true;
      try { svg.setPointerCapture(ev.pointerId); } catch { /* old Safari */ }
      last = snap(ev);
      if (last) showCross(last);
    });
    svg.addEventListener('pointermove', (ev) => {
      if (!active) return;
      const p = snap(ev);
      if (p && (!last || p.x !== last.x || p.y !== last.y)) { last = p; showCross(p); }
    });
    const finish = (ev, commit) => {
      if (!active) return;
      active = false;
      hideCross();
      const p = commit ? snap(ev) || last : null;
      if (p && tapHandler) tapHandler(p);
    };
    svg.addEventListener('pointerup', (ev) => finish(ev, true));
    svg.addEventListener('pointercancel', (ev) => finish(ev, false));

    /** Start (handler) or stop (null) listening for taps. */
    function onTap(handler) {
      tapHandler = handler;
      svg.classList.toggle('tappable', !!handler);
      if (handler && !readout.classList.contains('live')) readout.textContent = 'tap the grid — drag to adjust';
      if (!handler) hideCross();
    }

    function say(html) {
      readout.innerHTML = html || '&nbsp;';
    }

    return { line, point, clear, onTap, say, svg, wrap, opts: o, fmtNum };
  }

  const num = (q) => (q && typeof q === 'object' ? q.n / q.d : Number(q || 0));

  /**
   * Let her place up to `max` points. Tapping a placed point takes it away again; a tap
   * past the limit moves the oldest one. With `line: true` two points draw the line
   * through them, so she sees her line, not just her dots.
   */
  function picker(grid, { max = 2, line = false, onChange } = {}) {
    let pts = [];
    const g = document.createElementNS(NS, 'g');
    grid.svg.appendChild(g);

    function paint() {
      g.innerHTML = '';
      const o = grid.opts;
      if (line && pts.length === 2 && !(pts[0].x === pts[1].x && pts[0].y === pts[1].y)) {
        const [p, q] = pts;
        // a·x + b·y = k through p and q
        const a = q.y - p.y, b = p.x - q.x, k = a * p.x + b * p.y;
        const tmp = grid.line({ co: { [o.xName]: a, [o.yName]: b }, k }, { cls: 'user', layer: 'lines' });
        if (tmp) g.appendChild(tmp);
      }
      for (const p of pts) {
        const dot = grid.point(p.x, p.y, { cls: 'user', layer: 'points', label: '(' + grid.fmtNum(p.x) + ', ' + grid.fmtNum(p.y) + ')' });
        g.appendChild(dot);
      }
      if (onChange) onChange(pts.slice());
    }

    grid.onTap((p) => {
      const i = pts.findIndex((q) => q.x === p.x && q.y === p.y);
      if (i >= 0) pts.splice(i, 1);
      else {
        pts.push(p);
        if (pts.length > max) pts.shift();
      }
      paint();
    });

    return {
      points: () => pts.slice(),
      clear() { pts = []; paint(); },
      stop() { grid.onTap(null); },
    };
  }

  return { create, fmtNum, picker };
})();
