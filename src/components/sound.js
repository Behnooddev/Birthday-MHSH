import { $, safeStorage } from '../scripts/utils.js';
import { SynthEngine } from '../music/engine.js';
import { TRACKS } from '../music/tracks.js';
import { createVisualizer } from '../music/visualizer.js';

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function initSound() {
  const engine = new SynthEngine();
  const store = safeStorage();

  const root = $('#player');
  const els = {
    title: $('#player-title'),
    meta: $('#player-meta'),
    ref: $('#player-ref'),
    state: $('#player-state'),
    art: $('#player-art'),
    artN: $('#player-art-n'),
    seek: $('#seek'),
    cur: $('#time-cur'),
    dur: $('#time-dur'),
    play: $('#play-btn'),
    prev: $('#prev-btn'),
    next: $('#next-btn'),
    vol: $('#vol'),
    list: $('#tracklist'),
  };

  let index = 0;
  let seeking = false;

  const fill = (input) => input.style.setProperty('--fill', `${(input.value / input.max) * 100}%`);

  // volume (remembered when storage is available)
  const savedVol = Number(store.get('millemsev:vol', 60));
  els.vol.value = String(Number.isFinite(savedVol) ? savedVol : 60);
  engine.setVolume(Number(els.vol.value) / 100);
  fill(els.vol);
  els.vol.addEventListener('input', () => {
    engine.setVolume(Number(els.vol.value) / 100);
    store.set('millemsev:vol', els.vol.value);
    fill(els.vol);
  });

  // track list
  TRACKS.forEach((t, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <button class="track" type="button" data-i="${i}">
        <span class="track__n">${String(i + 1).padStart(2, '0')} · ${t.bpm} BPM</span>
        <span class="track__t">${t.title}</span>
        <span class="track__m">${t.mood}</span>
      </button>`;
    els.list.appendChild(li);
  });
  els.list.addEventListener('click', (e) => {
    const b = e.target.closest('.track');
    if (b) select(Number(b.dataset.i), true);
  });

  function paintTrack(animate) {
    const t = TRACKS[index];
    els.title.textContent = t.title;
    els.meta.textContent = `${t.key} · ${t.bpm} BPM · ${fmt(engine.duration)}`;
    els.ref.innerHTML = t.ref.artist
      ? `Mood reference: <b>${t.ref.title}</b> — ${t.ref.artist}`
      : `Mood reference: <b>${t.ref.title}</b>`;
    els.artN.textContent = String(index + 1).padStart(2, '0');
    els.art.style.setProperty('--h1', t.art[0]);
    els.art.style.setProperty('--h2', t.art[1]);
    els.dur.textContent = fmt(engine.duration);
    els.list.querySelectorAll('.track').forEach((b, i) => {
      if (i === index) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    if (animate) {
      [els.title, els.meta, els.ref].forEach((el) => {
        el.classList.remove('swap');
        void el.offsetWidth;
        el.classList.add('swap');
      });
    }
  }

  function setPlayingUi(on) {
    root.classList.toggle('is-playing', on);
    els.play.setAttribute('aria-label', on ? 'Pause' : 'Play');
    els.state.textContent = on ? 'Now playing · original synth' : 'Demo · original synth';
  }

  function select(i, autoplay = false) {
    index = (i + TRACKS.length) % TRACKS.length;
    const was = engine.playing;
    engine.load(TRACKS[index]);
    paintTrack(true);
    els.seek.value = '0';
    fill(els.seek);
    els.cur.textContent = '0:00';
    if (autoplay || was) {
      engine.play();
      setPlayingUi(true);
    } else {
      setPlayingUi(false);
    }
  }

  els.play.addEventListener('click', () => {
    if (engine.playing) {
      engine.pause();
      setPlayingUi(false);
    } else {
      engine.play();
      setPlayingUi(true);
    }
  });
  els.prev.addEventListener('click', () => {
    // restart the track if we're past 3s, otherwise go back
    if (engine.position() > 3) {
      engine.seek(0);
    } else {
      select(index - 1);
    }
  });
  els.next.addEventListener('click', () => select(index + 1));

  // seeking
  els.seek.addEventListener('pointerdown', () => (seeking = true));
  els.seek.addEventListener('input', () => {
    seeking = true;
    const sec = (els.seek.value / 1000) * engine.duration;
    els.cur.textContent = fmt(sec);
    fill(els.seek);
  });
  els.seek.addEventListener('change', () => {
    engine.seek((els.seek.value / 1000) * engine.duration);
    seeking = false;
  });
  ['pointerup', 'pointercancel', 'blur'].forEach((ev) => els.seek.addEventListener(ev, () => (seeking = false)));

  // UI clock: only runs while the player is on screen
  let visible = false;
  let raf = 0;
  const tick = () => {
    raf = 0;
    if (!visible || document.hidden) return;
    if (!seeking) {
      const pos = engine.position();
      els.cur.textContent = fmt(pos);
      els.seek.value = String(Math.round((pos / engine.duration) * 1000));
      els.seek.setAttribute('aria-valuetext', `${fmt(pos)} of ${fmt(engine.duration)}`);
      fill(els.seek);
    }
    raf = requestAnimationFrame(tick);
  };
  const startTick = () => {
    if (!raf && visible) raf = requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    startTick();
  }).observe(root);
  document.addEventListener('visibilitychange', startTick);

  createVisualizer($('#viz'), () => engine.getAnalyser(), () => engine.playing);

  // load the first track in a paused state
  engine.track = TRACKS[0];
  paintTrack(false);
  setPlayingUi(false);
  fill(els.seek);

  return { engine };
}
