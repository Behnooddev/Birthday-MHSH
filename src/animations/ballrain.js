import { fitCanvas, rand, reducedMotion } from '../scripts/utils.js';

let running = false;

/** Full-screen shower of bouncing basketballs (easter egg). */
export function ballRain(duration = 4200) {
  if (running) return;
  const canvas = document.getElementById('fx');
  if (!canvas) return;
  running = true;

  const ctx = canvas.getContext('2d');
  const { w, h, dpr } = fitCanvas(canvas);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = reducedMotion() ? 8 : 38;
  const balls = Array.from({ length: count }, (_, i) => ({
    x: rand(20, w - 20),
    y: rand(-h * 0.8, -20) - i * 6,
    vx: rand(-60, 60),
    vy: rand(0, 120),
    r: rand(10, 20),
    rot: rand(0, 6.28),
    vr: rand(-4, 4),
  }));

  const t0 = performance.now();
  let last = t0;

  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const age = now - t0;
    ctx.clearRect(0, 0, w, h);
    const fade = age > duration - 700 ? Math.max(0, (duration - age) / 700) : 1;
    ctx.globalAlpha = fade;

    for (const b of balls) {
      b.vy += 1400 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
      if (b.y + b.r > h) {
        b.y = h - b.r;
        b.vy *= -0.72;
        b.vx *= 0.96;
      }
      if (b.x < b.r || b.x > w - b.r) b.vx *= -1;

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      const g = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.4, b.r * 0.1, 0, 0, b.r);
      g.addColorStop(0, '#ffb273');
      g.addColorStop(1, '#e8641c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40, 14, 4, 0.55)';
      ctx.lineWidth = Math.max(1, b.r * 0.08);
      ctx.beginPath();
      ctx.moveTo(-b.r, 0);
      ctx.lineTo(b.r, 0);
      ctx.moveTo(0, -b.r);
      ctx.lineTo(0, b.r);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-b.r * 1.15, 0, b.r * 0.82, -0.9, 0.9);
      ctx.arc(b.r * 1.15, 0, b.r * 0.82, Math.PI - 0.9, Math.PI + 0.9);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    if (age < duration) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, w, h);
      running = false;
    }
  }
  requestAnimationFrame(frame);
}
