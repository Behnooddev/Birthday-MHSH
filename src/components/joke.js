import { $ } from '../scripts/utils.js';

/** The setup is shown right away; the punchline lands a beat after the card scrolls into view. */
export function initJoke() {
  const card = $('#joke-card');
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      window.setTimeout(() => card.classList.add('is-punched'), 1700);
    },
    { threshold: 0.55 },
  );
  io.observe(card);
}
