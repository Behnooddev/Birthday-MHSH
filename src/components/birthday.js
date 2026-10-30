import { $, clamp } from '../scripts/utils.js';
import { splitWords } from '../animations/reveal.js';

const HOLD_MS = 1150;
const DECAY_MS = 420;

export function initBirthday() {
  const stage = $('#stage');
  const btn = $('#charge-btn');
  const num = $('#charge-num');
  const message = $('#message');
  const replay = $('#replay-btn');
  const hint = $('#charge-hint');

  // word-by-word reveal setup
  let wi = 0;
  ['.msg-lead', '.msg-name', '.msg-close'].forEach((sel) => {
    const el = $(sel, message);
    const count = splitWords(el);
    el.querySelectorAll('.w').forEach((w) => {
      w.style.setProperty('--wi', String(Number(w.style.getPropertyValue('--wi')) + wi));
    });
    wi += count;
  });

  let p = 0;
  let holding = false;
  let raf = 0;
  let last = 0;
  let keyHeld = false;
  let unlocked = false;

  const paint = () => {
    btn.style.setProperty('--p', p.toFixed(4));
    num.textContent = String(Math.round(p * 99)).padStart(2, '0');
  };

  const loop = (now) => {
    const dt = Math.min(64, now - last);
    last = now;
    p = clamp(p + (holding ? dt / HOLD_MS : -dt / DECAY_MS), 0, 1);
    paint();
    if (p >= 1 && !unlocked) {
      unlock();
      return;
    }
    if (p > 0 || holding) raf = requestAnimationFrame(loop);
    else raf = 0;
  };

  const startLoop = () => {
    if (raf || unlocked) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };

  const setHolding = (v) => {
    holding = v;
    if (v) {
      hint.textContent = 'Keep holding…';
      startLoop();
    } else {
      hint.innerHTML = 'Press and hold the ring &mdash; or hold <kbd>Space</kbd> &mdash; to unlock.';
      startLoop();
    }
  };

  function play() {
    stage.classList.remove('is-playing');
    // restart css animations
    void stage.offsetWidth;
    stage.classList.add('is-playing');
  }

  function unlock() {
    unlocked = true;
    cancelAnimationFrame(raf);
    raf = 0;
    p = 1;
    num.textContent = '99';
    btn.style.setProperty('--p', '1');
    holding = false;
    stage.dataset.state = 'unlocked';
    message.setAttribute('aria-hidden', 'false');
    replay.tabIndex = 0;
    play();
  }

  btn.addEventListener('pointerdown', (e) => {
    if (unlocked) return;
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    setHolding(true);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) =>
    btn.addEventListener(t, () => holding && setHolding(false)),
  );

  btn.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.repeat || unlocked) return;
    keyHeld = true;
    setHolding(true);
  });
  btn.addEventListener('keyup', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    keyHeld = false;
    setHolding(false);
  });
  btn.addEventListener('blur', () => {
    keyHeld = false;
    if (holding) setHolding(false);
  });

  // Assistive technology can activate with a synthetic click (no hold).
  btn.addEventListener('click', (e) => {
    if (!unlocked && e.detail === 0 && !keyHeld) unlock();
  });

  replay.addEventListener('click', () => {
    stage.dataset.state = 'locked';
    stage.classList.remove('is-playing');
    // let the words reset, then replay the reveal
    window.setTimeout(() => {
      stage.dataset.state = 'unlocked';
      play();
    }, 450);
  });

  // little ripples when you tap the stage
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const r = stage.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.left = `${e.clientX - r.left}px`;
    dot.style.top = `${e.clientY - r.top}px`;
    stage.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove());
  });

  paint();
  return { unlock };
}
