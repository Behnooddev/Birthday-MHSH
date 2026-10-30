import {
  BOARD_T,
  FLOOR,
  G,
  LEVELS,
  MAX_PULL,
  PULL_TO_SPEED,
  R,
  REST_BOARD,
  REST_FLOOR,
  REST_RIM,
  RIM_R,
  START_Y,
} from './constants.js';

/** Hoop geometry for a level at time t (seconds). All-Star hoops bob up and down. */
export function hoopAt(levelKey, t = 0) {
  const lv = LEVELS[levelKey];
  const bob = lv.moving ? Math.sin(t * 1.15) * 42 : 0;
  const rimY = lv.hoopY + bob;
  return {
    cx: lv.hoopX,
    rimY,
    half: lv.half,
    boardX: lv.hoopX + lv.half + 6,
    boardTop: rimY - 100,
    boardBottom: rimY + 10,
  };
}

export function newBall(x) {
  return {
    x,
    y: START_Y,
    vx: 0,
    vy: 0,
    rot: 0,
    scored: false,
    swish: false,
    touchedRim: false,
    touchedBoard: false,
    bounces: 0,
    maxX: x,
  };
}

/** Convert a pull vector (start - pointer, in logical px) into a launch velocity. */
export function pullToVelocity(dx, dy) {
  const len = Math.hypot(dx, dy);
  if (len === 0) return { vx: 0, vy: 0, power: 0 };
  const capped = Math.min(len, MAX_PULL);
  const k = (capped / len) * PULL_TO_SPEED;
  return { vx: dx * k, vy: dy * k, power: capped / MAX_PULL };
}

/** Advance the ball one fixed step. Returns true on the step it scores. */
export function stepBall(b, hoop, dt) {
  const prevY = b.y;
  b.vy += G * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.rot += (b.vx * dt) / R;
  if (b.x > b.maxX) b.maxX = b.x;

  // backboard (only from the left)
  const faceX = hoop.boardX - BOARD_T / 2;
  if (
    b.vx > 0 &&
    b.x + R > faceX &&
    b.x < hoop.boardX &&
    b.y > hoop.boardTop - R * 0.4 &&
    b.y < hoop.boardBottom + R * 0.4
  ) {
    b.x = faceX - R;
    b.vx = -b.vx * REST_BOARD;
    b.touchedBoard = true;
  }

  // rim end-points
  const pts = [hoop.cx - hoop.half, hoop.cx + hoop.half];
  for (const px of pts) {
    const dx = b.x - px;
    const dy = b.y - hoop.rimY;
    const dist = Math.hypot(dx, dy);
    const min = R + RIM_R;
    if (dist < min && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      b.x = px + nx * min;
      b.y = hoop.rimY + ny * min;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + REST_RIM) * vn * nx;
        b.vy -= (1 + REST_RIM) * vn * ny;
        b.vx *= 0.97;
        b.touchedRim = true;
      }
    }
  }

  // floor
  if (b.y + R > FLOOR) {
    b.y = FLOOR - R;
    if (b.vy > 0) {
      b.vy = -b.vy * REST_FLOOR;
      if (Math.abs(b.vy) < 45) b.vy = 0;
      b.vx *= 0.9;
      b.bounces += 1;
    }
  }

  // scoring: crossing the rim plane downward, between the rim end-points
  if (
    !b.scored &&
    b.vy > 0 &&
    prevY < hoop.rimY &&
    b.y >= hoop.rimY &&
    Math.abs(b.x - hoop.cx) < hoop.half - 3
  ) {
    b.scored = true;
    b.swish = !b.touchedRim && !b.touchedBoard;
    // the net slows the ball down
    b.vx *= 0.55;
    b.vy *= 0.78;
    return true;
  }
  return false;
}

/** Predicted path without collisions, for the aim guide. */
export function previewPath(x, y, vx, vy, count, step = 0.05) {
  const pts = [];
  let px = x;
  let py = y;
  let pvy = vy;
  for (let i = 1; i <= count; i++) {
    pvy += G * step;
    px += vx * step;
    py += pvy * step;
    if (py + R > FLOOR) break;
    pts.push({ x: px, y: py });
  }
  return pts;
}

/**
 * Headless simulation of a full shot. Used by tests and the verify script.
 * Returns { scored, swish, touchedRim, touchedBoard, t }.
 */
export function simulateShot(levelKey, startX, vx, vy, t0 = 0) {
  const b = newBall(startX);
  b.vx = vx;
  b.vy = vy;
  const dt = 1 / 120;
  let t = 0;
  while (t < 6) {
    const hoop = hoopAt(levelKey, t0 + t);
    stepBall(b, hoop, dt);
    t += dt;
    if (b.bounces >= 1) break;
    if (b.x > 900 || b.x < -100) break;
  }
  return { scored: b.scored, swish: b.swish, touchedRim: b.touchedRim, touchedBoard: b.touchedBoard, t };
}
