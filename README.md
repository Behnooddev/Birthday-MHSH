# MILLEMSEV — Birthday Edition 2026

A static, interactive birthday experience. Vite + vanilla JS, no backend, no API keys.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs to dist/
npm run preview    # serve the production build
```

## Deploy to GitHub Pages

The build uses a relative base (`base: './'`), so it works from any project URL such as
`https://<user>.github.io/<repo>/` without editing the config.

1. Push this folder to a GitHub repository (default branch `main`).
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. `.github/workflows/deploy.yml` builds and publishes the site.

## Structure

```
src/
  main.js               entry point
  components/           section controllers (hero, birthday, court, sound, globe, joke)
  game/                 basketball engine: constants, physics (pure), render, game loop
  music/                Web Audio synth engine, track definitions, visualizer
  animations/           particles, scroll reveal, ball rain
  scripts/              nav, easter eggs, shared utils
  styles/               tokens, base and one stylesheet per section
public/favicon.svg
```

## Notes

- **Music:** the three tracks are original generative synth sketches rendered live with the Web Audio API.
  No third-party audio is bundled. The songs named in the player are shown only as mood references.
- **Globe:** `d3-geo` + `world-atlas` (110m) drawn on canvas. The map data loads lazily when the section nears the viewport.
- **Joke:** comment by u/shelledtortoise in r/AskReddit, "What is your best joke?"
  (https://www.reddit.com/r/AskReddit/comments/140daoz/what_is_your_best_joke/).
- **Game scores:** personal bests are kept in `localStorage` per difficulty (falls back silently if unavailable).

## Hidden things (spoilers)

1. Konami code: ↑ ↑ ↓ ↓ ← → ← → B A
2. Type `millemsev` anywhere
3. Press `B` three times quickly
4. Click the © in the footer seven times
