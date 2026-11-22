// Night Vault — Moth, the burglar: smooth eight-way movement that slides
// along walls, a facing direction, and a pouch of coins to throw.
import { TILE, PLAYER_SPEED, PLAYER_RADIUS } from './config.js';
import { moveCircle, isShadow } from './physics.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = PLAYER_RADIUS * TILE;
    this.speed = PLAYER_SPEED * TILE;
    this.facing = 0;
    this.moving = false;
    this.coins = 0;
    this.inShadow = false;
  }

  reset(x, y, coins) {
    this.x = x;
    this.y = y;
    this.facing = 0;
    this.moving = false;
    this.coins = coins;
    this.inShadow = false;
  }

  update(dt, input, grid) {
    const a = input.axis();
    this.moving = a.x !== 0 || a.y !== 0;
    if (this.moving) {
      this.facing = Math.atan2(a.y, a.x);
      moveCircle(grid, this, a.x * this.speed * dt, a.y * this.speed * dt, this.r);
    }
    const col = Math.floor(this.x / TILE);
    const row = Math.floor(this.y / TILE);
    this.inShadow = isShadow(grid, col, row);
  }
}
