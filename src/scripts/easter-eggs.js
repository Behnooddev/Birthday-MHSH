import { $, toast } from './utils.js';
import { ballRain } from '../animations/ballrain.js';

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

let dialog = null;
let lastFocus = null;

function ensureDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('div');
  dialog.className = 'secret';
  dialog.hidden = true;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'secret-title');
  dialog.innerHTML = `
    <div class="secret__card panel">
      <p class="eyebrow" id="secret-tag"></p>
      <h2 class="secret__title" id="secret-title"></h2>
      <p class="secret__body" id="secret-body"></p>
      <button class="btn btn--primary" type="button" id="secret-close">Back to the page</button>
    </div>`;
  document.body.appendChild(dialog);
  const close = () => {
    dialog.hidden = true;
    lastFocus?.focus?.();
  };
  $('#secret-close', dialog).addEventListener('click', close);
  dialog.addEventListener('pointerdown', (e) => {
    if (e.target === dialog) close();
  });
  document.addEventListener('keydown', (e) => {
    if (dialog.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      e.preventDefault();
      $('#secret-close', dialog).focus();
    }
  });
  return dialog;
}

function showSecret(tag, title, body) {
  const d = ensureDialog();
  lastFocus = document.activeElement;
  $('#secret-tag', d).textContent = tag;
  $('#secret-title', d).textContent = title;
  $('#secret-body', d).textContent = body;
  d.hidden = false;
  $('#secret-close', d).focus();
}

export function initEasterEggs({ hero } = {}) {
  const found = new Set();
  const mark = (id) => {
    found.add(id);
    return `${found.size}/4`;
  };

  // 1 — Konami code
  let konamiIdx = 0;
  // 2 — typing the handle
  let typed = '';
  // 3 — pressing B three times quickly (outside of the code above)
  let bPresses = [];

  document.addEventListener('keydown', (e) => {
    const target = e.target;
    const typing = target instanceof HTMLElement && (target.isContentEditable || target.tagName === 'INPUT' && target.type === 'text');
    if (typing) return;
    const key = e.key.toLowerCase();

    // Konami
    if (key === KONAMI[konamiIdx]) {
      konamiIdx += 1;
      if (konamiIdx === KONAMI.length) {
        konamiIdx = 0;
        showSecret(`Secret ${mark('konami')}`, 'Cheat code accepted.', 'Player 2 has joined the lobby. Somewhere out there, a new friend is one message away — go say hi to someone new this week.');
      }
    } else {
      konamiIdx = key === KONAMI[0] ? 1 : 0;
    }

    // handle
    if (key.length === 1) {
      typed = (typed + key).slice(-9);
      if (typed === 'millemsev') {
        typed = '';
        document.body.classList.add('is-glitch');
        window.setTimeout(() => document.body.classList.remove('is-glitch'), 950);
        toast(`@millemsev recognized. Welcome back, player. (${mark('handle')})`, 4200);
        hero?.particles?.burst(window.innerWidth / 2, window.innerHeight / 2, 6);
      }
    }

    // B x3
    if (key === 'b' && !e.repeat) {
      const now = performance.now();
      bPresses = bPresses.filter((t) => now - t < 1200);
      bPresses.push(now);
      if (bPresses.length >= 3 && konamiIdx === 0) {
        bPresses = [];
        ballRain();
        toast(`Bucket rain. (${mark('rain')})`, 3600);
      }
    }
  });

  // 4 — the © sign in the footer, seven taps
  let taps = 0;
  let tapTimer = 0;
  $('#footer-c').addEventListener('click', () => {
    taps += 1;
    clearTimeout(tapTimer);
    tapTimer = window.setTimeout(() => (taps = 0), 1800);
    if (taps >= 7) {
      taps = 0;
      showSecret(`Secret ${mark('copyright')}`, 'You read the fine print.', 'Curiosity is the one cheat code that never gets patched. Keep reading the small print of the world.');
    }
  });
}
