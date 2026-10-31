// Round classification shown on the game-over card.
// Ten shots: a perfect all-swish round with streak bonuses is 38 points.
const RANKS = [
  { tier: 'SS', min: 32 },
  { tier: 'S', min: 24 },
  { tier: 'A', min: 16 },
  { tier: 'B', min: 8 },
  { tier: 'C', min: 0 },
];

export function rankFor(score) {
  return RANKS.find((r) => score >= r.min).tier;
}
