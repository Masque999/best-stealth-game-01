// Night Vault — deterministic screenshot scenes. A ?shot=<scene> URL stages
// one fixed moment (level, positions, guard states, HUD) and renders it, then
// sets window.__shotReady so the screenshot script knows the frame is done.
// No input is needed and nothing moves: the same URL always makes the same
// picture.
import { TILE } from './config.js';
import { GUARD_STATE } from './guard.js';

function placeGuard(game, i, col, row, facing, state, suspicion) {
  const g = game.guards[i];
  if (!g) return;
  g.x = (col + 0.5) * TILE;
  g.y = (row + 0.5) * TILE;
  g.facing = facing;
  g.state = state;
  g.suspicion = suspicion;
  g.pauseTimer = 0;
}

export function stageShot(game, scene) {
  game._hideOverlay();
  const S = GUARD_STATE;

  if (scene === 'cover') {
    // The Foyer: Moth crouched in a shadow pool behind the crates, two guards
    // sweeping their cones across the hall, the Sapphire glowing and the green
    // exit waiting on the far side. Everything the game is, in one frame.
    game._loadLevel(0);
    game.state = 'playing';
    game.player.x = 6.5 * TILE;
    game.player.y = 7.5 * TILE;
    game.player.facing = 0;
    game.player.inShadow = true;
    placeGuard(game, 0, 15.5, 2.5, Math.PI * 0.85, S.PATROL, 25);
    placeGuard(game, 1, 15.5, 7.5, Math.PI, S.PATROL, 15);
    game.heat = 25;
  } else if (scene === 'patrol') {
    // The Gallery: three guards on their rounds, Moth slipping through the
    // middle of the room while the nearest guard pauses, half suspicious.
    game._loadLevel(1);
    game.state = 'playing';
    game.player.x = 6.5 * TILE;
    game.player.y = 5.5 * TILE;
    game.player.facing = 0;
    placeGuard(game, 0, 16.5, 2.5, Math.PI * 0.7, S.PATROL, 12);
    placeGuard(game, 1, 3.5, 4.5, 0, S.SUSPICIOUS, 48);
    placeGuard(game, 2, 16.5, 7.5, Math.PI, S.PATROL, 8);
    game.heat = 48;
  } else if (scene === 'alert') {
    // The Gallery again, a moment later: the middle guard has Moth in its
    // cone and the alarm is up — red cone, full detection meter, run.
    game._loadLevel(1);
    game.state = 'playing';
    game.player.x = 8.5 * TILE;
    game.player.y = 5.5 * TILE;
    game.player.facing = 0;
    placeGuard(game, 0, 14.5, 2.5, Math.PI * 0.6, S.SUSPICIOUS, 62);
    placeGuard(game, 1, 5.5, 5.5, 0, S.ALERT, 100);
    placeGuard(game, 2, 14.5, 7.5, Math.PI * 0.75, S.SUSPICIOUS, 55);
    game.heat = 100;
    game.alarm = true;
  } else {
    // The Vault, at the end: the Sapphire is taken, Moth stands on the green
    // exit, and the last guard's cone sweeps just behind.
    game._loadLevel(2);
    game.state = 'playing';
    game.lootTaken = true;
    game.player.x = 18.5 * TILE;
    game.player.y = 9.5 * TILE;
    game.player.facing = Math.PI;
    placeGuard(game, 0, 5.5, 9.5, 0, S.PATROL, 10);
    placeGuard(game, 1, 14.5, 9.5, Math.PI, S.PATROL, 18);
    placeGuard(game, 2, 16.5, 1.5, Math.PI * 0.5, S.PATROL, 6);
    placeGuard(game, 3, 2.5, 4.5, 0, S.PATROL, 12);
    game.heat = 18;
    game.time = 96;
  }

  game._updateHUD();
  game.render();
  window.__shotReady = true;
}
