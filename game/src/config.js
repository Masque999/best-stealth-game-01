// Night Vault — tuning constants and palette. One place for every number the
// game balances on, so a level or a guard behaviour can be retuned here.
export const TILE = 56;
export const COLS = 20;
export const ROWS = 11;

// Movement (tiles per second) and sizes (tiles).
export const PLAYER_SPEED = 3.4;
export const PLAYER_RADIUS = 0.3;
export const GUARD_RADIUS = 0.33;
export const GUARD_PATROL_SPEED = 1.5;
export const GUARD_CHASE_SPEED = 2.85;

// Vision: how far a guard sees and how wide the cone opens.
export const CONE_RANGE = 5.6;
export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side

// Detection: suspicion 0..100. Near the guard it climbs fast, far away slow;
// standing in a shadow pool multiplies the climb by SHADOW_FACTOR. Unseen,
// suspicion drains at DECAY_RATE. 35 = the guard stops and stares, 100 = alarm.
export const SEE_RATE_NEAR = 95;
export const SEE_RATE_FAR = 18;
export const DECAY_RATE = 26;
export const SUSPICIOUS_AT = 35;
export const ALERT_AT = 100;
export const SHADOW_FACTOR = 0.45;

// The coin: how far you can throw it, how far away a guard hears it land.
export const COINS_PER_LEVEL = 3;
export const COIN_RANGE = 6;
export const COIN_HEAR = 7;

// After losing sight of you, an alert guard searches this long (seconds)
// before giving up and walking back to its patrol.
export const SEARCH_TIME = 2.5;

export const COLORS = {
  floorA: '#141b2e',
  floorB: '#101728',
  wall: '#2b3550',
  wallTop: '#42507a',
  crate: '#6b4f2a',
  crateTop: '#8a6a3a',
  crateEdge: '#4a3419',
  caseGlass: '#1d3040',
  caseGlint: '#7fe3f2',
  shadow: 'rgba(2, 4, 10, 0.55)',
  loot: '#6ff2ff',
  lootGlow: 'rgba(111, 242, 255, 0.35)',
  exit: '#3ddc84',
  exitGlow: 'rgba(61, 220, 132, 0.30)',
  player: '#20222e',
  playerTrim: '#f5c542',
  guard: '#3a4a6b',
  guardCap: '#d8dee9',
  coneCalm: 'rgba(255, 214, 64, 0.22)',
  coneSuspicious: 'rgba(255, 150, 40, 0.30)',
  coneAlert: 'rgba(255, 60, 60, 0.34)',
  lamp: 'rgba(255, 190, 90, 0.10)',
  coin: '#ffd94a',
};
