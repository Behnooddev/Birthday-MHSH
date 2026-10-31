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
      <div class="secret__extra" id="secret-extra"></div>
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

function showSecret(tag, title, body, extra = '') {
  const d = ensureDialog();
  lastFocus = document.activeElement;
  $('#secret-tag', d).textContent = tag;
  $('#secret-title', d).textContent = title;
  $('#secret-body', d).textContent = body;
  $('#secret-extra', d).innerHTML = extra; // hard-coded markup only
  d.hidden = false;
  $('#secret-close', d).focus();
}

// Minimal eyepatch: a strap, and a patch over it.
const EYEPATCH = `<svg class="profile__eye" viewBox="0 0 48 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2 11C14 6 34 6 46 11M2 22C14 27 34 27 46 22" opacity=".55"/><ellipse cx="24" cy="16.5" rx="11.5" ry="9" fill="#101421"/><path d="M17.5 13.2c3.2-2 9.8-2 13 0" opacity=".4"/></svg>`;

const GHOUL_SEQUENCE = Array.from({ length: 6 }, (_, i) => 1000 - 7 * i);
const GHOUL_MARKUP = `
  <span class="secret__crawl" aria-hidden="true"></span>
  <p class="counter" role="img" aria-label="${GHOUL_SEQUENCE.join(', ')}">${GHOUL_SEQUENCE.map((n, i) => `<span style="--i:${i}" aria-hidden="true">${n}</span>`).join('')}</p>
  <div class="profile">
    ${EYEPATCH}
    <div class="profile__who"><span class="profile__handle">@millemsev</span><span class="profile__sub">Classified</span></div>
    <span class="rank" data-tier="SS"><span class="rank__label">Rank</span><span class="rank__tier">SS</span></span>
  </div>`;

export function initEasterEggs({ hero } = {}) {
  const found = new Set();
  const mark = (id) => {
    found.add(id);
    return `${found.size}/5`;
  };

  const openGhoul = () =>
    showSecret(`Secret ${mark('ghoul')}`, '1000-7', 'Some numbers only mean something to the right person.', GHOUL_MARKUP);

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
      if (typed.endsWith('1000-7')) {
        typed = '';
        openGhoul();
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

  // 5 — the hero clock, seven taps (touch-friendly route to 1000-7)
  let clockTaps = 0;
  let clockTimer = 0;
  $('.clock')?.addEventListener('click', () => {
    clockTaps += 1;
    clearTimeout(clockTimer);
    clockTimer = window.setTimeout(() => (clockTaps = 0), 1800);
    if (clockTaps >= 7) {
      clockTaps = 0;
      openGhoul();
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
