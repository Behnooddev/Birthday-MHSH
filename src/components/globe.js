import { $, clamp, fitCanvas, reducedMotion, watchVisible } from '../scripts/utils.js';
import { COUNTRIES, LINKS } from './globe-data.js';

export function initGlobe() {
  const canvas = $('#globe-canvas');
  const wrap = canvas.parentElement;
  const tip = $('#globe-tip');
  const loading = $('#globe-loading');
  const chipsEl = $('#chips');
  const greet = {
    box: $('#greeting'),
    country: $('#greet-country'),
    text: $('#greet-text'),
    sub: $('#greet-sub'),
  };

  // chips are built immediately: they work even before the map has loaded
  const chipButtons = new Map();
  COUNTRIES.forEach((c) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = c.name;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      interacted();
      select(c.id, true);
    });
    li.appendChild(b);
    chipsEl.appendChild(li);
    chipButtons.set(c.id, b);
  });

  let d3 = null;
  let features = [];
  let byId = new Map();
  let selected = null;
  let hoverId = null;
  let hoverName = '';
  let visible = false;
  let raf = 0;
  let lastTs = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let autopilot = !reducedMotion();
  let lastInteraction = -1e9;
  let nextAutoAt = 0;
  let tween = null;
  const rot = [-20, -18, 0]; // lambda, phi, gamma
  const drag = { on: false, x: 0, y: 0, rx: 0, ry: 0, moved: false };
  let projection;
  let path;
  let links = [];
  let centroids = new Map();
  const sphere = { type: 'Sphere' };

  const interacted = () => {
    autopilot = false;
    lastInteraction = performance.now();
  };

  /* ---------- selection ---------- */
  function select(id, rotate) {
    const c = COUNTRIES.find((x) => x.id === id);
    if (!c) return;
    selected = id;
    chipButtons.forEach((b, key) => b.setAttribute('aria-pressed', String(key === id)));

    greet.country.textContent = c.name;
    greet.text.textContent = c.text;
    greet.text.lang = c.lang;
    greet.text.dir = c.rtl ? 'rtl' : 'ltr';
    greet.sub.textContent = c.say ? `${c.language} · ${c.say}` : c.language;
    greet.box.classList.remove('swap');
    void greet.box.offsetWidth;
    greet.box.classList.add('swap');

    if (rotate && centroids.has(id)) {
      const [lon, lat] = centroids.get(id);
      tween = { from: [rot[0], rot[1]], to: [-lon, clamp(-lat, -45, 45)], t: 0 };
    }
    schedule();
  }

  /* ---------- picking ---------- */
  function pick(x, y) {
    if (!projection) return null;
    const inv = projection.invert([x, y]);
    if (!inv || Number.isNaN(inv[0])) return null;
    // outside the sphere?
    const cx = w / 2;
    const cy = h / 2;
    if (Math.hypot(x - cx, y - cy) > projection.scale()) return null;
    for (const f of features) {
      if (d3.geoContains(f, inv)) return f;
    }
    return null;
  }

  /* ---------- drawing ---------- */
  function setup() {
    ({ w, h, dpr } = fitCanvas(canvas));
    const r = Math.min(w, h) * 0.45;
    projection = d3.geoOrthographic().translate([w / 2, h / 2]).scale(r).clipAngle(90).precision(0.4);
    path = d3.geoPath(projection);
    schedule();
  }

  function draw(now) {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    projection.rotate(rot);
    path.context(ctx);
    const r = projection.scale();

    // atmosphere
    const halo = ctx.createRadialGradient(w / 2, h / 2, r * 0.95, w / 2, h / 2, r * 1.18);
    halo.addColorStop(0, 'rgba(34, 228, 242, 0.14)');
    halo.addColorStop(1, 'rgba(34, 228, 242, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r * 1.18, 0, Math.PI * 2);
    ctx.fill();

    // ocean
    const sea = ctx.createRadialGradient(w / 2 - r * 0.3, h / 2 - r * 0.35, r * 0.1, w / 2, h / 2, r);
    sea.addColorStop(0, '#16203a');
    sea.addColorStop(1, '#0a0e1c');
    ctx.fillStyle = sea;
    ctx.beginPath();
    path(sphere);
    ctx.fill();

    // graticule
    ctx.strokeStyle = 'rgba(241, 243, 250, 0.05)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    path(d3.geoGraticule10());
    ctx.stroke();

    // land
    ctx.lineWidth = 0.6;
    for (const f of features) {
      const id = f.id;
      const isLinked = byId.has(id);
      const isSel = id === selected;
      const isHover = id === hoverId;
      ctx.beginPath();
      path(f);
      if (isSel) {
        ctx.fillStyle = 'rgba(34, 228, 242, 0.5)';
        ctx.strokeStyle = 'rgba(34, 228, 242, 1)';
      } else if (isLinked) {
        ctx.fillStyle = isHover ? 'rgba(34, 228, 242, 0.34)' : 'rgba(34, 228, 242, 0.2)';
        ctx.strokeStyle = 'rgba(34, 228, 242, 0.7)';
      } else {
        ctx.fillStyle = isHover ? 'rgba(241, 243, 250, 0.16)' : 'rgba(241, 243, 250, 0.075)';
        ctx.strokeStyle = 'rgba(241, 243, 250, 0.16)';
      }
      ctx.fill();
      ctx.stroke();
    }

    // sphere rim
    ctx.strokeStyle = 'rgba(34, 228, 242, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    path(sphere);
    ctx.stroke();

    // animated connection arcs
    const t = now / 1000;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 5]);
    ctx.lineDashOffset = -t * 14;
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)';
    ctx.beginPath();
    for (const l of links) path(l.line);
    ctx.stroke();
    ctx.setLineDash([]);

    // travelling pulses
    const center = [-rot[0], -rot[1]];
    links.forEach((l, i) => {
      const p = (t * 0.22 + i * 0.137) % 1;
      const pt = l.interp(p);
      if (d3.geoDistance(pt, center) > Math.PI / 2 - 0.02) return;
      const xy = projection(pt);
      if (!xy) return;
      ctx.fillStyle = 'rgba(34, 228, 242, 0.95)';
      ctx.beginPath();
      ctx.arc(xy[0], xy[1], 2.1, 0, Math.PI * 2);
      ctx.fill();
    });

    // labels: selected + hovered
    ctx.font = '500 11.5px "JetBrains Mono Variable", ui-monospace, monospace';
    ctx.textAlign = 'center';
    const label = (id, strong) => {
      const c = centroids.get(id);
      const meta = COUNTRIES.find((x) => x.id === id);
      const name = meta ? meta.name : hoverName;
      if (!c || !name) return;
      if (d3.geoDistance(c, center) > Math.PI / 2 - 0.12) return;
      const xy = projection(c);
      if (!xy) return;
      const tw = ctx.measureText(name).width + 14;
      ctx.fillStyle = 'rgba(8, 10, 18, 0.88)';
      ctx.strokeStyle = strong ? 'rgba(34, 228, 242, 0.85)' : 'rgba(241, 243, 250, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(xy[0] - tw / 2, xy[1] - 26, tw, 20, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f1f3fa';
      ctx.fillText(name, xy[0], xy[1] - 12);
      ctx.fillStyle = 'rgba(34, 228, 242, 1)';
      ctx.beginPath();
      ctx.arc(xy[0], xy[1], 2.6, 0, Math.PI * 2);
      ctx.fill();
    };
    if (selected) label(selected, true);
    if (hoverId && hoverId !== selected) label(hoverId, false);
  }

  /* ---------- loop ---------- */
  function frame(ts) {
    raf = 0;
    if (!visible || document.hidden || !projection) return;
    const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;

    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 1.1);
      const e = 1 - Math.pow(1 - tween.t, 3);
      // shortest way around in longitude
      let dl = tween.to[0] - tween.from[0];
      dl = ((dl + 540) % 360) - 180;
      rot[0] = tween.from[0] + dl * e;
      rot[1] = tween.from[1] + (tween.to[1] - tween.from[1]) * e;
      if (tween.t >= 1) tween = null;
    } else if (!drag.on && !reducedMotion()) {
      const idle = ts - lastInteraction > 4500;
      if (idle) rot[0] += dt * 7;
    }

    // cinematic autopilot until the visitor touches anything
    if (autopilot && !tween && !drag.on) {
      if (!nextAutoAt) nextAutoAt = ts + 1200;
      if (ts > nextAutoAt) {
        const i = COUNTRIES.findIndex((c) => c.id === selected);
        select(COUNTRIES[(i + 1) % COUNTRIES.length].id, true);
        nextAutoAt = ts + 4800;
      }
    }

    draw(ts);
    raf = requestAnimationFrame(frame);
  }

  function schedule() {
    if (!raf && visible && projection) raf = requestAnimationFrame(frame);
    else if (!visible && projection) draw(performance.now());
  }

  /* ---------- pointer interaction ---------- */
  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  canvas.addEventListener('pointerdown', (e) => {
    interacted();
    drag.on = true;
    drag.moved = false;
    [drag.x, drag.y] = [e.clientX, e.clientY];
    drag.rx = rot[0];
    drag.ry = rot[1];
    tween = null;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const [x, y] = local(e);
    if (drag.on) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      const k = 0.32 * (460 / Math.max(260, w));
      rot[0] = drag.rx + dx * k * 1.6;
      rot[1] = clamp(drag.ry - dy * k * 1.6, -70, 70);
      tip.hidden = true;
      interacted();
      return;
    }
    const f = pick(x, y);
    const id = f ? f.id : null;
    hoverName = f && f.properties ? f.properties.name || '' : '';
    if (id !== hoverId) {
      hoverId = id;
      canvas.style.cursor = f && byId.has(id) ? 'pointer' : '';
    }
    if (f && !byId.has(id) && hoverName) {
      tip.textContent = hoverName;
      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
      tip.hidden = false;
    } else tip.hidden = true;
    schedule();
  });
  const end = (e) => {
    if (!drag.on) return;
    drag.on = false;
    if (!drag.moved) {
      const [x, y] = local(e);
      const f = pick(x, y);
      if (f && byId.has(f.id)) select(f.id, true);
    }
    schedule();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', () => (drag.on = false));
  canvas.addEventListener('pointerleave', () => {
    hoverId = null;
    tip.hidden = true;
  });

  /* ---------- load the map lazily ---------- */
  let started = false;
  async function load() {
    if (started) return;
    started = true;
    try {
      const [geo, topo, world] = await Promise.all([
        import('d3-geo'),
        import('topojson-client'),
        import('world-atlas/countries-110m.json'),
      ]);
      d3 = geo;
      const atlas = world.default || world;
      features = topo.feature(atlas, atlas.objects.countries).features.filter((f) => f.id !== '010'); // no Antarctica
      features.forEach((f) => {
        if (f.id !== undefined) centroids.set(f.id, d3.geoCentroid(f));
      });
      COUNTRIES.forEach((c) => {
        byId.set(c.id, c);
      });
      // a few countries have multi-polygons whose centroid sits oddly; use the largest polygon
      const fix = (id) => {
        const f = features.find((x) => x.id === id);
        if (!f || f.geometry.type !== 'MultiPolygon') return;
        let best = null;
        let bestArea = -1;
        f.geometry.coordinates.forEach((poly) => {
          const g = { type: 'Polygon', coordinates: poly };
          const a = d3.geoArea(g);
          if (a > bestArea) {
            bestArea = a;
            best = g;
          }
        });
        if (best) centroids.set(id, d3.geoCentroid(best));
      };
      ['840', '250', '643', '392', '528', '152', '076', '156'].forEach(fix);

      links = LINKS.map(([a, b]) => {
        const A = centroids.get(a);
        const B = centroids.get(b);
        if (!A || !B) return null;
        return { line: { type: 'LineString', coordinates: [A, B] }, interp: d3.geoInterpolate(A, B) };
      }).filter(Boolean);

      loading.hidden = true;
      new ResizeObserver(setup).observe(wrap);
      setup();
      select(COUNTRIES[2].id, !reducedMotion()); // start on Japan
      schedule();
    } catch (err) {
      loading.textContent = 'The map could not be loaded. The country buttons still work.';
      console.error('[globe]', err);
    }
  }

  watchVisible(
    wrap,
    (v) => {
      visible = v;
      if (v) {
        load();
        lastTs = 0;
        schedule();
      }
    },
    '200px',
  );
  document.addEventListener('visibilitychange', () => {
    lastTs = 0;
    schedule();
  });

  return { select };
}
