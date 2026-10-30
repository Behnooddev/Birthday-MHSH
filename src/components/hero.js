import { $ } from '../scripts/utils.js';
import { createParticles } from '../animations/particles.js';
import { reducedMotion } from '../scripts/utils.js';

const pad = (n) => String(n).padStart(2, '0');

export function initHero() {
  const hero = $('#hero');
  const particles = createParticles($('#hero-canvas'), hero);

  // live clock
  const timeEl = $('#clock-time');
  const dateEl = $('#clock-date');
  const zoneEl = $('#clock-zone');

  let zone = 'Local time';
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date());
    const tz = parts.find((p) => p.type === 'timeZoneName');
    if (tz) zone = `Local time · ${tz.value}`;
  } catch {
    /* keep default label */
  }
  zoneEl.textContent = zone;

  const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  const tick = () => {
    const d = new Date();
    timeEl.innerHTML = `${pad(d.getHours())}<span class="sep">:</span>${pad(d.getMinutes())}<span class="sep">:</span>${pad(d.getSeconds())}`;
    timeEl.dateTime = d.toISOString();
    dateEl.textContent = dateFmt.format(d);
  };
  tick();
  setInterval(tick, 1000);

  // enter button
  $('#enter-btn').addEventListener('click', () => {
    const target = $('#birthday');
    target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    const rect = hero.getBoundingClientRect();
    particles.burst(rect.width / 2, rect.height * 0.55, 4);
    window.setTimeout(() => $('#birthday-title').focus({ preventScroll: true }), reducedMotion() ? 0 : 700);
  });

  return { particles };
}
