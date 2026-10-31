import {
  FLOOR,
  H,
  LEVELS,
  MAX_PULL,
  MIN_PULL,
  PULL_TO_SPEED,
  R,
  SHOTS_PER_ROUND,
  START_Y,
  W,
} from './constants.js';
import { hoopAt, newBall, previewPath, pullToVelocity, stepBall } from './physics.js';
import { drawScene, makeCourt } from './render.js';
import { rankFor } from './rank.js';
import { clamp, rand, reducedMotion } from '../scripts/utils.js';

const STEP = 1 / 120;

/**
 * Basketball mini-game. All DOM wiring (HUD, buttons) goes through the `ui` callbacks
 * so the game itself stays a plain canvas engine.
 */
export function createGame(canvas, ui) {
  const g = canvas.getContext('2d');
  let dpr = 1;
  let scale = 1;
  let court = null;

  // state
  let levelKey = 'rookie';
  let phase = 'ready'; // ready | flying | settling | over
  let ball = newBall(150);
  let time = 0;
  let acc = 0;
  let lastTs = 0;
  let raf = 0;
  let visible = false;

  let score = 0;
  let shotsLeft = SHOTS_PER_ROUND;
  let made = 0;
  let streak = 0;
  let bestStreak = 0;
  let settleTimer = 0;
  let shotT = 0;
  let wobble = 0;

  const particles = [];
  const floaters = [];

  // input
  let drag = null; // { ax, ay, dx, dy }
  const kb = { active: false, angle: 52, power: 0.82 };

  /* ---------- helpers ---------- */
  const toLogical = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    // uniform scale with letterboxing is unnecessary: the stage keeps a fixed aspect ratio,
    // but on narrow screens the stage is 4:3, so scale to the width and centre vertically.
    scale = rect.width / W;
    court = makeCourt(dpr * scale);
    draw();
  }

  function currentHoop() {
    return hoopAt(levelKey, time);
  }

  function spawnBall() {
    ball = newBall(LEVELS[levelKey].startX());
    phase = 'ready';
    drag = null;
  }

  function burst(x, y, swish) {
    if (reducedMotion()) return;
    const n = swish ? 26 : 16;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(40, swish ? 260 : 190);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 40,
        s: rand(2, 4.5),
        life: 1,
        color: Math.random() < 0.7 ? '#22e4f2' : '#8b5cf6',
      });
    }
  }

  function float(text, x, y, color = '#f1f3fa', size = 26) {
    floaters.push({ text, x, y, color, size, life: 1 });
  }

  /* ---------- round flow ---------- */
  function resetRound() {
    score = 0;
    shotsLeft = SHOTS_PER_ROUND;
    made = 0;
    streak = 0;
    bestStreak = 0;
    wobble = 0;
    particles.length = 0;
    floaters.length = 0;
    spawnBall();
    ui.hud({ score, shotsLeft, streak });
    ui.over(null);
    ui.announce('New round. Ten shots.');
  }

  function shoot(vx, vy) {
    if (phase !== 'ready' || shotsLeft <= 0) return;
    ball.vx = vx;
    ball.vy = vy;
    phase = 'flying';
    shotT = 0;
    shotsLeft -= 1;
    kb.active = false;
    ui.hud({ score, shotsLeft, streak });
  }

  function finishShot() {
    // called once the ball has landed
    if (!ball.scored) {
      streak = 0;
      let msg = 'Short';
      if (ball.touchedBoard && !ball.touchedRim) msg = 'Off the glass';
      else if (ball.touchedRim) msg = 'Rim out';
      else if (ball.maxX > hoopNow().cx + 60) msg = 'Long';
      else if (ball.maxX < hoopNow().cx - 140) msg = 'Air ball';
      float(msg, clamp(ball.x, 90, W - 90), FLOOR - 70, '#858ba0', 22);
      ui.announce(`Miss. ${msg}.`);
    }
    ui.hud({ score, shotsLeft, streak });
    phase = 'settling';
    settleTimer = 0.55;
  }

  const hoopNow = () => currentHoop();

  function onScore() {
    made += 1;
    streak += 1;
    bestStreak = Math.max(bestStreak, streak);
    let pts = ball.swish ? 3 : 2;
    let label = ball.swish ? 'SWISH' : ball.touchedBoard && !ball.touchedRim ? 'BANK SHOT' : 'BUCKET';
    if (streak >= 3) {
      pts += 1;
      label += ` · ${streak} STREAK`;
    }
    score += pts;
    wobble = 0.001;
    const hoop = currentHoop();
    burst(hoop.cx, hoop.rimY + 16, ball.swish);
    float(`+${pts}`, hoop.cx, hoop.rimY - 74, '#22e4f2', 34);
    float(label, hoop.cx - 40, hoop.rimY - 108, '#f1f3fa', 17);
    ui.hud({ score, shotsLeft, streak, bump: true });
    ui.announce(`${label.toLowerCase()}. Plus ${pts}. Score ${score}.`);
  }

  function endRound() {
    phase = 'over';
    const rank = rankFor(score);
    ui.over({ score, made, bestStreak, level: LEVELS[levelKey].label, rank });
    ui.announce(`Round complete. ${score} points, ${made} of ${SHOTS_PER_ROUND} made. Rank ${rank}.`);
  }

  /* ---------- simulation ---------- */
  function simulate(dt) {
    time += dt;
    if (wobble > 0) wobble += dt;
    if (wobble > 1.3) wobble = 0;

    if (phase === 'flying') {
      const hoop = currentHoop();
      shotT += dt;
      if (stepBall(ball, hoop, dt)) onScore();
      const out = ball.x > W + 70 || ball.x < -70;
      if (ball.bounces >= 1 || out || shotT > 7) finishShot();
    } else if (phase === 'settling') {
      // let the ball keep rolling/bouncing visually while we wait
      stepBall(ball, currentHoop(), dt);
      settleTimer -= dt;
      if (settleTimer <= 0) {
        if (shotsLeft <= 0) endRound();
        else spawnBall();
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 700 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 1.5;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.y -= 26 * dt;
      f.life -= dt * 0.8;
      if (f.life <= 0) floaters.splice(i, 1);
    }
  }

  /* ---------- aim ---------- */
  function aimView() {
    if (phase !== 'ready') return null;
    const lv = LEVELS[levelKey];
    let vel = null;
    let pull = null;
    if (drag) {
      const p = pullToVelocity(drag.dx, drag.dy);
      if (Math.hypot(drag.dx, drag.dy) >= MIN_PULL) {
        vel = p;
        const len = Math.min(Math.hypot(drag.dx, drag.dy), MAX_PULL);
        const k = len / Math.hypot(drag.dx, drag.dy);
        pull = { dx: drag.dx * k, dy: drag.dy * k, power: p.power };
      }
    } else if (kb.active) {
      const a = (kb.angle * Math.PI) / 180;
      const speed = kb.power * MAX_PULL * PULL_TO_SPEED;
      vel = { vx: Math.cos(a) * speed, vy: -Math.sin(a) * speed, power: kb.power };
      pull = { dx: Math.cos(a) * kb.power * MAX_PULL, dy: -Math.sin(a) * kb.power * MAX_PULL, power: kb.power };
    }
    if (!vel) return null;
    return { dots: previewPath(ball.x, ball.y, vel.vx, vel.vy, lv.preview), pull };
  }

  function draw() {
    if (!court) return;
    drawScene(g, dpr, scale, {
      court,
      hoop: currentHoop(),
      ball,
      aim: aimView(),
      particles,
      floaters,
      wobble,
      ready: phase === 'ready',
      time,
      kb: kb.active && phase === 'ready' ? kb : null,
    });
  }

  /* ---------- loop ---------- */
  function frame(ts) {
    raf = 0;
    if (!visible || document.hidden) {
      lastTs = 0;
      return;
    }
    if (!lastTs) lastTs = ts;
    acc += Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    while (acc >= STEP) {
      simulate(STEP);
      acc -= STEP;
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function run() {
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }

  /* ---------- pointer + keyboard input ---------- */
  canvas.addEventListener('pointerdown', (e) => {
    if (phase !== 'ready') return;
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture?.(e.pointerId);
    const p = toLogical(e);
    drag = { ax: p.x, ay: p.y, dx: 0, dy: 0, id: e.pointerId };
    kb.active = false;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = toLogical(e);
    drag.dx = drag.ax - p.x;
    drag.dy = drag.ay - p.y;
  });
  const release = (e, cancelled) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { dx, dy } = drag;
    drag = null;
    if (cancelled) return;
    if (Math.hypot(dx, dy) < MIN_PULL) return; // a tap, not a shot
    const v = pullToVelocity(dx, dy);
    shoot(v.vx, v.vy);
  };
  canvas.addEventListener('pointerup', (e) => release(e, false));
  canvas.addEventListener('pointercancel', (e) => release(e, true));

  canvas.addEventListener('keydown', (e) => {
    if (phase !== 'ready' && phase !== 'over') return;
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    if (phase !== 'ready') return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (!kb.active) {
        kb.active = true;
        return;
      }
      const a = (kb.angle * Math.PI) / 180;
      const speed = kb.power * MAX_PULL * PULL_TO_SPEED;
      shoot(Math.cos(a) * speed, -Math.sin(a) * speed);
      return;
    }
    kb.active = true;
    if (e.key === 'ArrowLeft') kb.power = clamp(kb.power - 0.02, 0.3, 1);
    if (e.key === 'ArrowRight') kb.power = clamp(kb.power + 0.02, 0.3, 1);
    if (e.key === 'ArrowUp') kb.angle = clamp(kb.angle + 1, 20, 80);
    if (e.key === 'ArrowDown') kb.angle = clamp(kb.angle - 1, 20, 80);
  });

  /* ---------- lifecycle ---------- */
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        lastTs = 0;
        run();
      }
    },
    { threshold: 0.05 },
  ).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    lastTs = 0;
    run();
  });

  resetRound();
  resize();

  return {
    setLevel(key) {
      if (!LEVELS[key]) return;
      levelKey = key;
      resetRound();
      draw();
    },
    restart: resetRound,
    get level() {
      return levelKey;
    },
    // test hooks for headless verification (pure state readers)
    state: () => ({ phase, score, shotsLeft, made, streak, ball: { x: ball.x, y: ball.y } }),
  };
}
