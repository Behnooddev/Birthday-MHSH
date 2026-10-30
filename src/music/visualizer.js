import { fitCanvas, reducedMotion, watchVisible } from '../scripts/utils.js';

/**
 * Mirrored frequency bars. When no audio is playing it breathes gently,
 * so the player always has a clear idle (demo) state.
 */
export function createVisualizer(canvas, getAnalyser, isPlaying) {
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let visible = false;
  let data = null;
  const BARS = 56;
  const levels = new Float32Array(BARS);

  const resize = () => {
    ({ w, h, dpr } = fitCanvas(canvas));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  function draw(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    ctx.clearRect(0, 0, w, h);

    const analyser = getAnalyser();
    const live = analyser && isPlaying();
    if (live) {
      if (!data || data.length !== analyser.frequencyBinCount) data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
    }

    const t = now / 1000;
    const gap = 3;
    const bw = Math.max(2, (w - gap * (BARS - 1)) / BARS);
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, 'rgba(139, 92, 246, 0.85)');
    grad.addColorStop(1, 'rgba(34, 228, 242, 0.95)');
    ctx.fillStyle = grad;

    for (let i = 0; i < BARS; i++) {
      // mirror: low frequencies in the centre
      const m = Math.abs(i - (BARS - 1) / 2) / ((BARS - 1) / 2);
      let target;
      if (live) {
        const bin = 1 + Math.floor(Math.pow(m, 1.4) * (data.length * 0.62));
        target = (data[bin] / 255) * (0.35 + (1 - m) * 0.9);
      } else {
        target = 0.05 + 0.04 * Math.sin(t * 1.6 + i * 0.35) + 0.03 * Math.sin(t * 0.7 + i * 0.12);
        if (reducedMotion()) target = 0.06;
      }
      levels[i] += (target - levels[i]) * (live ? 0.45 : 0.08);
      const bh = Math.max(3, levels[i] * h * 0.92);
      const x = i * (bw + gap);
      const y = (h - bh) / 2;
      const r = Math.min(bw / 2, 3);
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, r);
      ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  }

  const start = () => {
    if (!raf && visible) raf = requestAnimationFrame(draw);
  };

  new ResizeObserver(resize).observe(canvas);
  watchVisible(canvas, (v) => {
    visible = v;
    start();
  });
  document.addEventListener('visibilitychange', start);
  resize();
}
