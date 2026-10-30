import { BOARD_T, FLOOR, H, R, RIM_R, W } from './constants.js';

const CYAN = '34, 228, 242';
const VIOLET = '139, 92, 246';

/** Static court backdrop, drawn once into an offscreen canvas for speed. */
export function makeCourt(dpr) {
  const c = document.createElement('canvas');
  c.width = Math.round(W * dpr);
  c.height = Math.round(H * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);

  // wall
  const wall = g.createLinearGradient(0, 0, 0, FLOOR);
  wall.addColorStop(0, '#0a0d18');
  wall.addColorStop(1, '#121730');
  g.fillStyle = wall;
  g.fillRect(0, 0, W, FLOOR);

  // soft arena lights
  for (const [x, col] of [[160, CYAN], [640, VIOLET]]) {
    const l = g.createRadialGradient(x, 0, 0, x, 0, 320);
    l.addColorStop(0, `rgba(${col}, 0.16)`);
    l.addColorStop(1, `rgba(${col}, 0)`);
    g.fillStyle = l;
    g.fillRect(0, 0, W, FLOOR);
  }

  // faint stands: rows of dots
  g.fillStyle = 'rgba(241, 243, 250, 0.045)';
  for (let row = 0; row < 5; row++) {
    for (let x = 12 + (row % 2) * 9; x < W; x += 18) {
      g.beginPath();
      g.arc(x, 70 + row * 20, 2, 0, Math.PI * 2);
      g.fill();
    }
  }

  // floor
  const floor = g.createLinearGradient(0, FLOOR, 0, H);
  floor.addColorStop(0, '#171c33');
  floor.addColorStop(1, '#0c1020');
  g.fillStyle = floor;
  g.fillRect(0, FLOOR, W, H - FLOOR);

  // floor reflection line
  g.strokeStyle = `rgba(${CYAN}, 0.55)`;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0, FLOOR + 0.5);
  g.lineTo(W, FLOOR + 0.5);
  g.stroke();

  // perspective court markings on the floor
  g.save();
  g.beginPath();
  g.rect(0, FLOOR, W, H - FLOOR);
  g.clip();
  g.strokeStyle = 'rgba(241, 243, 250, 0.14)';
  g.lineWidth = 1.2;
  // lane under the hoop
  g.strokeRect(520, FLOOR - 26, 280, 70);
  g.beginPath();
  g.ellipse(520, FLOOR + 9, 26, 35, 0, -Math.PI / 2, Math.PI / 2, true);
  g.stroke();
  // three-point arc
  g.beginPath();
  g.ellipse(660, FLOOR + 8, 330, 52, 0, Math.PI * 0.5, Math.PI * 1.5);
  g.stroke();
  // half-court circle on the left edge
  g.beginPath();
  g.ellipse(-30, FLOOR + 18, 120, 28, 0, -Math.PI / 2, Math.PI / 2);
  g.stroke();
  // wood seams
  g.strokeStyle = 'rgba(241, 243, 250, 0.04)';
  for (let x = -40; x < W + 40; x += 46) {
    g.beginPath();
    g.moveTo(x, FLOOR);
    g.lineTo(x - 18, H);
    g.stroke();
  }
  g.restore();

  return c;
}

function drawBall(g, x, y, rot, glow = 0) {
  g.save();
  g.translate(x, y);
  if (glow > 0) {
    g.shadowColor = `rgba(${CYAN}, ${0.7 * glow})`;
    g.shadowBlur = 22 * glow;
  }
  const grad = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.15, 0, 0, R);
  grad.addColorStop(0, '#ffb676');
  grad.addColorStop(0.55, '#f27a2a');
  grad.addColorStop(1, '#b8460f');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;

  g.rotate(rot);
  g.strokeStyle = 'rgba(45, 16, 4, 0.7)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(0, 0, R - 0.6, 0, Math.PI * 2);
  g.moveTo(-R, 0);
  g.lineTo(R, 0);
  g.moveTo(0, -R);
  g.lineTo(0, R);
  g.stroke();
  g.beginPath();
  g.arc(-R * 1.18, 0, R * 0.86, -0.95, 0.95);
  g.stroke();
  g.beginPath();
  g.arc(R * 1.18, 0, R * 0.86, Math.PI - 0.95, Math.PI + 0.95);
  g.stroke();
  g.restore();
}

function drawHoopBack(g, hoop, wobble) {
  // backboard
  const bx = hoop.boardX - BOARD_T / 2;
  const top = hoop.boardTop;
  const h = hoop.boardBottom - hoop.boardTop;
  g.fillStyle = 'rgba(190, 215, 255, 0.07)';
  g.fillRect(bx, top, BOARD_T, h);
  g.strokeStyle = `rgba(${CYAN}, 0.55)`;
  g.lineWidth = 1.4;
  g.strokeRect(bx + 0.5, top + 0.5, BOARD_T - 1, h - 1);
  // inner square
  g.strokeStyle = 'rgba(241, 243, 250, 0.3)';
  g.strokeRect(bx - 22, hoop.rimY - 46, 22, 34);
  // support pole
  g.strokeStyle = 'rgba(241, 243, 250, 0.1)';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(bx + BOARD_T + 10, top + h * 0.5);
  g.lineTo(bx + BOARD_T + 10, FLOOR);
  g.stroke();
  g.lineWidth = 1;

  // net
  const left = hoop.cx - hoop.half;
  const right = hoop.cx + hoop.half;
  const depth = 40;
  const sway = Math.sin(wobble * 22) * 7 * Math.min(1, wobble * 2.2);
  g.strokeStyle = 'rgba(241, 243, 250, 0.38)';
  g.lineWidth = 1;
  const cols = 6;
  g.beginPath();
  for (let i = 0; i <= cols; i++) {
    const t = i / cols;
    const x0 = left + (right - left) * t;
    const x1 = hoop.cx + (t - 0.5) * hoop.half * 1.1 + sway * 0.6;
    g.moveTo(x0, hoop.rimY);
    g.lineTo(x1, hoop.rimY + depth);
  }
  for (let r = 1; r <= 4; r++) {
    const t = r / 4.6;
    const y = hoop.rimY + depth * t;
    const half = hoop.half * (1 - 0.45 * t);
    const off = sway * t * 0.6;
    g.moveTo(hoop.cx - half + off, y);
    g.lineTo(hoop.cx + half + off, y);
  }
  g.stroke();
}

function drawRimFront(g, hoop) {
  const left = hoop.cx - hoop.half;
  const right = hoop.cx + hoop.half;
  g.strokeStyle = '#f1f3fa';
  g.lineWidth = RIM_R * 1.6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(left, hoop.rimY);
  g.lineTo(right, hoop.rimY);
  g.stroke();
  g.fillStyle = `rgba(${CYAN}, 1)`;
  g.beginPath();
  g.arc(left, hoop.rimY, RIM_R, 0, Math.PI * 2);
  g.fill();
  g.lineCap = 'butt';
}

/**
 * Draw the full scene.
 * view = { court, hoop, ball, aim, particles, floaters, wobble, ready, time }
 */
export function drawScene(g, dpr, scale, view) {
  g.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  g.drawImage(view.court, 0, 0, W, H);

  drawHoopBack(g, view.hoop, view.wobble);

  // aim guide
  if (view.aim) {
    const { dots, pull } = view.aim;
    dots.forEach((p, i) => {
      const a = 0.65 * (1 - i / Math.max(1, dots.length));
      g.fillStyle = `rgba(${CYAN}, ${a})`;
      g.beginPath();
      g.arc(p.x, p.y, 2.6 - (i / dots.length) * 1, 0, Math.PI * 2);
      g.fill();
    });
    // pull line + power ring
    if (pull) {
      g.strokeStyle = `rgba(${VIOLET}, 0.85)`;
      g.lineWidth = 2;
      g.setLineDash([5, 5]);
      g.beginPath();
      g.moveTo(view.ball.x, view.ball.y);
      g.lineTo(view.ball.x - pull.dx * 0.55, view.ball.y - pull.dy * 0.55);
      g.stroke();
      g.setLineDash([]);
      g.strokeStyle = `rgba(${CYAN}, 0.9)`;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(view.ball.x, view.ball.y, R + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pull.power);
      g.stroke();
    }
  }

  // ball shadow on the floor
  const heightAbove = Math.max(0, FLOOR - R - view.ball.y);
  const sh = Math.max(0.25, 1 - heightAbove / 340);
  g.fillStyle = `rgba(0, 0, 0, ${0.35 * sh})`;
  g.beginPath();
  g.ellipse(view.ball.x, FLOOR + 5, R * 1.1 * sh, 4 * sh, 0, 0, Math.PI * 2);
  g.fill();

  drawBall(g, view.ball.x, view.ball.y, view.ball.rot, view.ready ? 0.5 + 0.2 * Math.sin(view.time * 4) : 0);
  drawRimFront(g, view.hoop);

  // particles
  for (const p of view.particles) {
    g.globalAlpha = Math.max(0, p.life);
    g.fillStyle = p.color;
    g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
  }
  g.globalAlpha = 1;

  // floating feedback text
  g.textAlign = 'center';
  for (const f of view.floaters) {
    g.globalAlpha = Math.max(0, Math.min(1, f.life * 1.6));
    g.fillStyle = f.color;
    g.font = `700 ${f.size}px "Space Grotesk Variable", system-ui, sans-serif`;
    g.fillText(f.text, f.x, f.y);
  }
  g.globalAlpha = 1;

  // keyboard power / angle readout
  if (view.kb) {
    g.textAlign = 'left';
    g.font = '500 12px "JetBrains Mono Variable", ui-monospace, monospace';
    g.fillStyle = 'rgba(241, 243, 250, 0.8)';
    g.fillText(`POWER ${Math.round(view.kb.power * 100)}%   ANGLE ${Math.round(view.kb.angle)}°`, 16, 26);
  }
}
