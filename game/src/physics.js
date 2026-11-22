// Night Vault — movement, collision and line-of-sight against the tile grid.
// Positions are in pixels, one tile is TILE pixels, and the grid is an array
// of character rows. A tile is solid when it is a wall, a crate or a case.
import { TILE } from './config.js';

export function tileAt(grid, col, row) {
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return '#';
  return grid[row][col];
}

export function isSolid(grid, col, row) {
  const ch = tileAt(grid, col, row);
  return ch === '#' || ch === 'C' || ch === 'D';
}

export function isShadow(grid, col, row) {
  return tileAt(grid, col, row) === 's';
}

// Move a circle (entity with x, y centre and r radius, both pixels) by dx, dy,
// sliding along solid tiles: move one axis at a time and clamp to the tile edge.
export function moveCircle(grid, e, dx, dy, r) {
  if (dx !== 0) {
    let nx = e.x + dx;
    const top = e.y - r;
    const bottom = e.y + r;
    const row0 = Math.floor(top / TILE);
    const row1 = Math.floor((bottom - 0.01) / TILE);
    if (dx > 0) {
      const col = Math.floor((nx + r) / TILE);
      for (let row = row0; row <= row1; row++) {
        if (isSolid(grid, col, row)) { nx = col * TILE - r - 0.01; break; }
      }
    } else {
      const col = Math.floor((nx - r) / TILE);
      for (let row = row0; row <= row1; row++) {
        if (isSolid(grid, col, row)) { nx = (col + 1) * TILE + r + 0.01; break; }
      }
    }
    e.x = nx;
  }
  if (dy !== 0) {
    let ny = e.y + dy;
    const left = e.x - r;
    const right = e.x + r;
    const col0 = Math.floor(left / TILE);
    const col1 = Math.floor((right - 0.01) / TILE);
    if (dy > 0) {
      const row = Math.floor((ny + r) / TILE);
      for (let col = col0; col <= col1; col++) {
        if (isSolid(grid, col, row)) { ny = row * TILE - r - 0.01; break; }
      }
    } else {
      const row = Math.floor((ny - r) / TILE);
      for (let col = col0; col <= col1; col++) {
        if (isSolid(grid, col, row)) { ny = (row + 1) * TILE + r + 0.01; break; }
      }
    }
    e.y = ny;
  }
}

// True when no solid tile stands between two points. The tiles holding the
// two endpoints never block — a guard leaning on a wall can still see out.
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const steps = Math.max(1, Math.ceil(dist / (TILE / 4)));
  const col0 = Math.floor(x0 / TILE);
  const row0 = Math.floor(y0 / TILE);
  const col1 = Math.floor(x1 / TILE);
  const row1 = Math.floor(y1 / TILE);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if ((col === col0 && row === row0) || (col === col1 && row === row1)) continue;
    if (isSolid(grid, col, row)) return false;
  }
  return true;
}

// Smallest signed difference between two angles, in (-PI, PI].
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// Turn `from` towards `to` by at most `maxStep` radians.
export function turnTowards(from, to, maxStep) {
  const d = angleDiff(from, to);
  if (Math.abs(d) <= maxStep) return to;
  return from + Math.sign(d) * maxStep;
}
