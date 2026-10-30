// Logical court size. The canvas is scaled to fit, all game math happens in these units.
export const W = 800;
export const H = 450;
export const FLOOR = 402;

export const R = 14; // ball radius
export const G = 980; // gravity, px/s^2
export const RIM_R = 3.5; // rim end-point collider radius
export const BOARD_T = 8; // backboard thickness

export const REST_FLOOR = 0.56;
export const REST_RIM = 0.6;
export const REST_BOARD = 0.5;

export const SHOTS_PER_ROUND = 10;

// Pull distance (px) -> launch speed
export const MAX_PULL = 140;
export const PULL_TO_SPEED = 7.6;
export const MIN_PULL = 14;

export const LEVELS = {
  rookie: {
    label: 'Rookie',
    half: 38, // half width of the rim opening
    hoopX: 660,
    hoopY: 210,
    startX: () => 150,
    preview: 30,
    moving: false,
  },
  pro: {
    label: 'Pro',
    half: 31,
    hoopX: 668,
    hoopY: 206,
    startX: () => 110 + Math.random() * 190,
    preview: 14,
    moving: false,
  },
  allstar: {
    label: 'All-Star',
    half: 26,
    hoopX: 672,
    hoopY: 204,
    startX: () => 90 + Math.random() * 280,
    preview: 0,
    moving: true,
  },
};

export const START_Y = FLOOR - R;
