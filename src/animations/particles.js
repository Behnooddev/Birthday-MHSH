import { fitCanvas, rand, reducedMotion, watchVisible } from '../scripts/utils.js';

/**
 * Subtle drifting particle field with faint links and gentle pointer repulsion.
 * Pauses itself while off-screen or when the tab is hidden.
 */
export function createParticles(canvas, host) {
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = 1;
  let particles = [];
  let raf = 0;
  let visible = true;
  const pointer = { x: -9999, y: -9999 };
  const still = reducedMotion();

  const seed = () => {
    const count = Math.round(Math.min(90, Math.max(28, (w * h) / 17000)));
    particles = Array.from({ length: count }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(-0.12, 0.12),
      vy: rand(-0.12, 0.12),
      r: rand(0.7, 1.7),
      violet: Math.random() < 0.22,
    }));
  };

  const resize = () => {
    ({ w, h, dpr } = fitCanvas(canvas));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (still) draw();
  };

  const LINK = 120;

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) {
          const a = (1 - Math.sqrt(d2) / LINK) * 0.16;
          ctx.strokeStyle = `rgba(34, 228, 242, ${a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }
    for (const p of particles) {
      ctx.fillStyle = p.violet ? 'rgba(139, 92, 246, 0.75)' : 'rgba(34, 228, 242, 0.7)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tick() {
    raf = 0;
    if (!visible || document.hidden) return;
    for (const p of particles) {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 150 * 150 && d2 > 1) {
        const d = Math.sqrt(d2);
        const f = (1 - d / 150) * 0.35;
        p.vx += (dx / d) * f * 0.12;
        p.vy += (dy / d) * f * 0.12;
      }
      p.vx *= 0.995;
      p.vy *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  const start = () => {
    if (still || raf) return;
    raf = requestAnimationFrame(tick);
  };

  host.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  });
  host.addEventListener('pointerleave', () => {
    pointer.x = pointer.y = -9999;
  });

  new ResizeObserver(resize).observe(canvas);
  watchVisible(host, (v) => {
    visible = v;
    if (v) start();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });

  resize();
  start();

  return {
    /** Push particles outward from a point (used by an easter egg). */
    burst(x, y, force = 3) {
      for (const p of particles) {
        const dx = p.x - x;
        const dy = p.y - y;
        const d = Math.max(30, Math.hypot(dx, dy));
        p.vx += (dx / d) * force * (80 / d);
        p.vy += (dy / d) * force * (80 / d);
      }
    },
  };
}
