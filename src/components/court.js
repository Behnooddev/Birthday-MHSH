import { $, $$, safeStorage } from '../scripts/utils.js';
import { createGame } from '../game/game.js';
import { SHOTS_PER_ROUND } from '../game/constants.js';

export function initCourt() {
  const canvas = $('#game-canvas');
  const store = safeStorage();
  const els = {
    score: $('#hud-score'),
    shots: $('#hud-shots'),
    streak: $('#hud-streak'),
    best: $('#hud-best'),
    over: $('#game-over'),
    overScore: $('#over-score'),
    overRank: $('#over-rank'),
    overTier: $('#over-tier'),
    overMeta: $('#over-meta'),
    status: $('#game-status'),
  };

  let level = 'rookie';
  const bestKey = (lv) => `millemsev:best:${lv}`;
  let best = Number(store.get(bestKey(level), 0)) || 0;
  els.best.textContent = String(best);

  const setText = (el, value, bump = false) => {
    const next = String(value);
    if (el.textContent === next) return;
    el.textContent = next;
    if (bump) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  };

  const game = createGame(canvas, {
    hud({ score, shotsLeft, streak, bump }) {
      setText(els.score, score, bump);
      setText(els.shots, shotsLeft);
      setText(els.streak, streak, bump && streak > 1);
      if (score > best) {
        best = score;
        store.set(bestKey(level), best);
        setText(els.best, best);
      }
    },
    over(result) {
      if (!result) {
        els.over.hidden = true;
        return;
      }
      els.overScore.textContent = String(result.score);
      els.overTier.textContent = result.rank;
      els.overRank.dataset.tier = result.rank;
      const rec = result.score >= best && result.score > 0 ? ' · New personal best' : '';
      els.overMeta.textContent = `${result.made} of ${SHOTS_PER_ROUND} made · best streak ${result.bestStreak} · ${result.level}${rec}`;
      els.over.hidden = false;
      $('#over-restart').focus({ preventScroll: true });
    },
    announce(msg) {
      els.status.textContent = msg;
    },
  });

  $$('input[name="level"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      level = input.value;
      best = Number(store.get(bestKey(level), 0)) || 0;
      els.best.textContent = String(best);
      game.setLevel(level);
    });
  });

  const again = () => {
    game.restart();
    canvas.focus({ preventScroll: true });
  };
  $('#over-restart').addEventListener('click', again);
  $('#game-reset').addEventListener('click', again);

  return game;
}
