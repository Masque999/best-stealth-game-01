// Night Vault — everything drawn on the canvas: the museum floor, the walls
// and cover, the warm light pools and the dark shadow pools, the guards'
// vision cones, the characters, the loot, the exit, and the vignette that
// sells the night. Cones are drawn before the solid objects, so a wall or a
// crate standing between a guard and the far side of its cone covers it.
import { TILE, COLORS, CONE_RANGE, CONE_HALF_ANGLE } from './config.js';
import { GUARD_STATE } from './guard.js';

export function drawScene(ctx, game, view) {
  const { grid } = game.level;
  const ox = view.ox;
  const oy = view.oy;
  const time = game.animTime;

  // Floor: a quiet checker so movement reads at a glance.
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      ctx.fillStyle = (c + r) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(ox + c * TILE, oy + r * TILE, TILE, TILE);
    }
  }

  // Warm light pools under the lamps.
  for (const lamp of game.level.lamps) {
    const x = ox + lamp.x;
    const y = oy + lamp.y;
    const g = ctx.createRadialGradient(x, y, 4, x, y, TILE * 2.2);
    g.addColorStop(0, COLORS.lamp);
    g.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - TILE * 2.2, y - TILE * 2.2, TILE * 4.4, TILE * 4.4);
  }

  // Shadow pools: dark, soft-edged, safe to stand in.
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] !== 's') continue;
      const x = ox + c * TILE + TILE / 2;
      const y = oy + r * TILE + TILE / 2;
      ctx.fillStyle = COLORS.shadow;
      ctx.beginPath();
      ctx.ellipse(x, y, TILE * 0.62, TILE * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawExit(ctx, game, view);
  drawLoot(ctx, game, view, time);

  // Vision cones, one per guard, coloured by how sure the guard is.
  for (const guard of game.guards) drawCone(ctx, guard, view);

  // Solid objects: walls, crates, display cases.
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const ch = grid[r][c];
      if (ch === '#') drawWall(ctx, ox + c * TILE, oy + r * TILE);
      else if (ch === 'C') drawCrate(ctx, ox + c * TILE, oy + r * TILE);
      else if (ch === 'D') drawCase(ctx, ox + c * TILE, oy + r * TILE);
    }
  }

  for (const guard of game.guards) drawGuard(ctx, guard, view);
  drawPlayer(ctx, game, view);
  drawCoin(ctx, game, view, time);
  drawEffects(ctx, game, view);

  // Vignette: the edges of the night close in.
  const vg = ctx.createRadialGradient(
    view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.42,
    view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vg.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, view.w, view.h);
}

function drawWall(ctx, x, y) {
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = COLORS.wallTop;
  ctx.fillRect(x, y, TILE, 5);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(x, y + TILE - 4, TILE, 4);
}

function drawCrate(ctx, x, y) {
  ctx.fillStyle = COLORS.crateEdge;
  ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
  ctx.fillStyle = COLORS.crate;
  ctx.fillRect(x + 7, y + 7, TILE - 14, TILE - 14);
  ctx.fillStyle = COLORS.crateTop;
  ctx.fillRect(x + 7, y + 7, TILE - 14, 5);
  ctx.strokeStyle = COLORS.crateEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 7);
  ctx.lineTo(x + TILE - 7, y + TILE - 7);
  ctx.moveTo(x + TILE - 7, y + 7);
  ctx.lineTo(x + 7, y + TILE - 7);
  ctx.stroke();
}

function drawCase(ctx, x, y) {
  ctx.fillStyle = COLORS.caseGlass;
  ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
  ctx.strokeStyle = '#3d5a70';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
  ctx.strokeStyle = COLORS.caseGlint;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + TILE - 12);
  ctx.lineTo(x + TILE - 16, y + 12);
  ctx.stroke();
  // A little treasure glints inside the case.
  ctx.fillStyle = 'rgba(255, 220, 120, 0.85)';
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawExit(ctx, game, view) {
  const e = game.level.exit;
  const x = view.ox + e.x;
  const y = view.oy + e.y;
  const pulse = 0.75 + 0.25 * Math.sin(game.animTime * 3);
  ctx.save();
  ctx.shadowColor = COLORS.exit;
  ctx.shadowBlur = 18 * pulse;
  ctx.fillStyle = COLORS.exit;
  ctx.fillRect(x - 20, y - 20, 40, 40);
  ctx.restore();
  ctx.fillStyle = '#0a2015';
  ctx.fillRect(x - 14, y - 14, 28, 28);
  ctx.fillStyle = COLORS.exit;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', x, y - 30);
}

function drawLoot(ctx, game, view, time) {
  if (game.lootTaken) return;
  const l = game.level.loot;
  const x = view.ox + l.x;
  const y = view.oy + l.y;
  const bob = Math.sin(time * 2.2) * 3;
  const glow = 0.6 + 0.4 * Math.sin(time * 2.2);
  ctx.save();
  ctx.shadowColor = COLORS.loot;
  ctx.shadowBlur = 22 * glow;
  ctx.fillStyle = COLORS.loot;
  ctx.beginPath();
  ctx.moveTo(x, y - 16 + bob);
  ctx.lineTo(x + 11, y + bob);
  ctx.lineTo(x, y + 16 + bob);
  ctx.lineTo(x - 11, y + bob);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.moveTo(x, y - 16 + bob);
  ctx.lineTo(x + 5, y + bob);
  ctx.lineTo(x, y + 16 + bob);
  ctx.lineTo(x - 5, y + bob);
  ctx.closePath();
  ctx.fill();
  // The pedestal it sits on.
  ctx.strokeStyle = 'rgba(111, 242, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y + 20, 12, 0, Math.PI);
  ctx.stroke();
}

function drawCone(ctx, guard, view) {
  const x = view.ox + guard.x;
  const y = view.oy + guard.y;
  const range = CONE_RANGE * TILE;
  let color;
  if (guard.state === GUARD_STATE.ALERT) color = COLORS.coneAlert;
  else if (guard.state === GUARD_STATE.SUSPICIOUS) color = COLORS.coneSuspicious;
  else color = COLORS.coneCalm;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, guard.facing - CONE_HALF_ANGLE, guard.facing + CONE_HALF_ANGLE);
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 10, x, y, range);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

function drawGuard(ctx, guard, view) {
  const x = view.ox + guard.x;
  const y = view.oy + guard.y;
  // Soft shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + guard.r * 0.7, guard.r * 0.9, guard.r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: a navy uniform with a pale cap, facing where it looks.
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(x, y, guard.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a6d94';
  ctx.lineWidth = 2;
  ctx.stroke();
  const fx = Math.cos(guard.facing);
  const fy = Math.sin(guard.facing);
  ctx.fillStyle = COLORS.guardCap;
  ctx.beginPath();
  ctx.arc(x + fx * guard.r * 0.45, y + fy * guard.r * 0.45, guard.r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  // A "?" while suspicious, a "!" while alert — readable at a glance.
  if (guard.state === GUARD_STATE.SUSPICIOUS || guard.state === GUARD_STATE.ALERT) {
    const mark = guard.state === GUARD_STATE.ALERT ? '!' : '?';
    const color = guard.state === GUARD_STATE.ALERT ? '#ff5252' : '#ffc93c';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = color;
    ctx.fillText(mark, x, y - guard.r - 4);
  }
}

function drawPlayer(ctx, game, view) {
  const p = game.player;
  const x = view.ox + p.x;
  const y = view.oy + p.y;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + p.r * 0.7, p.r * 0.9, p.r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  // The hooded figure: a dark cloak, an amber trim, a hood pointing where
  // Moth faces. In shadow the cloak goes darker still — that is the tell
  // that the shadows are hiding you.
  ctx.globalAlpha = p.inShadow ? 0.75 : 1;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(x, y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.playerTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, p.r, p.facing - 1.1, p.facing + 1.1);
  ctx.stroke();
  const fx = Math.cos(p.facing);
  const fy = Math.sin(p.facing);
  ctx.fillStyle = COLORS.playerTrim;
  ctx.beginPath();
  ctx.arc(x + fx * p.r * 0.55, y + fy * p.r * 0.55, p.r * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCoin(ctx, game, view, time) {
  const coin = game.coin;
  if (!coin) return;
  const x = view.ox + coin.x;
  const y = view.oy + coin.y - (coin.z || 0);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(view.ox + coin.x, view.oy + coin.y, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a87e1a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (coin.landed) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 6);
    ctx.strokeStyle = `rgba(255, 217, 74, ${0.4 + 0.4 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(view.ox + coin.x, view.oy + coin.y, 10 + 3 * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEffects(ctx, game, view) {
  for (const fx of game.effects) {
    const age = fx.age / fx.life;
    if (fx.kind === 'ring') {
      ctx.strokeStyle = `rgba(255, 217, 74, ${1 - age})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(view.ox + fx.x, view.oy + fx.y, 8 + age * 46, 0, Math.PI * 2);
      ctx.stroke();
    } else if (fx.kind === 'spark') {
      ctx.fillStyle = `rgba(111, 242, 255, ${1 - age})`;
      ctx.beginPath();
      ctx.arc(view.ox + fx.x, view.oy + fx.y, 3 + age * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
