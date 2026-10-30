import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles/index.css';

import { initNav } from './scripts/nav.js';
import { initEasterEggs } from './scripts/easter-eggs.js';
import { initReveal } from './animations/reveal.js';
import { initHero } from './components/hero.js';
import { initBirthday } from './components/birthday.js';
import { initJoke } from './components/joke.js';
import { initCourt } from './components/court.js';
import { initSound } from './components/sound.js';
import { initGlobe } from './components/globe.js';

function boot() {
  initNav();
  initReveal();
  const hero = initHero();
  initBirthday();
  initCourt();
  initSound();
  initGlobe();
  initJoke();
  initEasterEggs({ hero });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
