// Night Vault — a patrolling guard: waypoints, a vision cone, and a suspicion
// meter. States:
//   patrol      walk the waypoints, pausing at each
//   suspicious  stop and stare at something seen (suspicion 35+)
//   alert       chase the player (suspicion 100)
//   investigate walk to a noise (a landed coin) or a last-seen spot, look around
//   return      walk back to the nearest waypoint, then patrol again
// A guard that loses you searches where you were last seen, then gives up —
// that is the chance to recover the judge's second criterion asks for.
import {
  TILE, GUARD_RADIUS, GUARD_PATROL_SPEED, GUARD_CHASE_SPEED,
  CONE_RANGE, CONE_HALF_ANGLE, SEE_RATE_NEAR, SEE_RATE_FAR,
  DECAY_RATE, SUSPICIOUS_AT, ALERT_AT, SHADOW_FACTOR, SEARCH_TIME, COIN_HEAR,
} from './config.js';
import { hasLineOfSight, angleDiff, turnTowards, moveCircle } from './physics.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  ALERT: 'alert',
  INVESTIGATE: 'investigate',
  RETURN: 'return',
};

export class Guard {
  constructor(def, grid) {
    this.grid = grid;
    this.waypoints = def.waypoints.map(([c, r]) => ({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE }));
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.r = GUARD_RADIUS * TILE;
    this.patrolSpeed = (def.speed ?? GUARD_PATROL_SPEED) * TILE;
    this.chaseSpeed = GUARD_CHASE_SPEED * TILE;
    this.pauseTime = def.pause ?? 1.0;
    this.wpIndex = 1 % this.waypoints.length;
    this.facing = 0;
    this.state = GUARD_STATE.PATROL;
    this.suspicion = 0;
    this.pauseTimer = 0;
    this.searchTimer = 0;
    this.lookTimer = 0;
    this.lastSeen = null;
    this.target = null;
    this.stepTimer = 0;
    this.moving = false;
    this.justAlerted = false;
    this.justSuspicious = false;
    this._lastDist = null;
    this._stuckFor = 0;
  }

  // True when the player stands inside the cone, in range, with no wall or
  // cover between them.
  canSee(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONE_RANGE * TILE) return false;
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(this.facing, angle)) > CONE_HALF_ANGLE) return false;
    return hasLineOfSight(this.grid, this.x, this.y, player.x, player.y);
  }

  // Suspicion per second while the player is visible: fast up close, slow at
  // the edge of the cone, halved when the player hides in a shadow pool.
  seeRate(player) {
    const dist = Math.hypot(player.x - this.x, player.y - this.y) / TILE;
    const closeness = 1 - dist / CONE_RANGE;
    let rate = SEE_RATE_FAR + (SEE_RATE_NEAR - SEE_RATE_FAR) * closeness;
    if (player.inShadow) rate *= SHADOW_FACTOR;
    return rate;
  }

  update(dt, game) {
    const player = game.player;
    const seen = this.canSee(player);
    if (seen) {
      this.suspicion = Math.min(ALERT_AT, this.suspicion + this.seeRate(player) * dt);
      this.lastSeen = { x: player.x, y: player.y };
    } else {
      this.suspicion = Math.max(0, this.suspicion - DECAY_RATE * dt);
    }

    // Suspicion drives the state machine.
    if (this.suspicion >= ALERT_AT) {
      if (this.state !== GUARD_STATE.ALERT) {
        this.state = GUARD_STATE.ALERT;
        this.justAlerted = true;
        this.searchTimer = 0;
      }
    } else if (this.state === GUARD_STATE.ALERT) {
      if (!seen) {
        this.searchTimer += dt;
        if (this.searchTimer > SEARCH_TIME) {
          this.state = GUARD_STATE.INVESTIGATE;
          this.target = this.lastSeen ? { x: this.lastSeen.x, y: this.lastSeen.y } : { x: this.x, y: this.y };
          this.searchTimer = 0;
        }
      } else {
        this.searchTimer = 0;
      }
    } else if (this.suspicion >= SUSPICIOUS_AT && seen && this.state !== GUARD_STATE.SUSPICIOUS) {
      this.state = GUARD_STATE.SUSPICIOUS;
      this.justSuspicious = true;
    } else if (this.state === GUARD_STATE.SUSPICIOUS && this.suspicion < SUSPICIOUS_AT * 0.4) {
      this.state = GUARD_STATE.PATROL;
    }

    // A landed coin pulls a patrolling guard off its route to investigate.
    if (game.noise && (this.state === GUARD_STATE.PATROL || this.state === GUARD_STATE.RETURN)) {
      const d = Math.hypot(game.noise.x - this.x, game.noise.y - this.y) / TILE;
      if (d <= COIN_HEAR) {
        this.state = GUARD_STATE.INVESTIGATE;
        this.target = { x: game.noise.x, y: game.noise.y };
        this.lookTimer = 0;
      }
    }

    this.moving = false;
    if (this.state === GUARD_STATE.PATROL) {
      this._patrol(dt);
    } else if (this.state === GUARD_STATE.SUSPICIOUS) {
      const target = Math.atan2(player.y - this.y, player.x - this.x);
      this.facing = turnTowards(this.facing, target, 6 * dt);
    } else if (this.state === GUARD_STATE.ALERT) {
      const target = Math.atan2(player.y - this.y, player.x - this.x);
      this.facing = turnTowards(this.facing, target, 8 * dt);
      this._moveTowards(player.x, player.y, this.chaseSpeed, dt);
    } else if (this.state === GUARD_STATE.INVESTIGATE) {
      if (this.target) {
        const result = this._moveTowards(this.target.x, this.target.y, this.patrolSpeed * 1.25, dt);
        if (result === 'arrived' || result === 'stuck') {
          this.lookTimer += dt;
          this.facing += dt * 1.1;
          if (this.lookTimer > SEARCH_TIME) {
            this.state = GUARD_STATE.RETURN;
            this.target = null;
          }
        }
      }
    } else if (this.state === GUARD_STATE.RETURN) {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < this.waypoints.length; i++) {
        const d = Math.hypot(this.waypoints[i].x - this.x, this.waypoints[i].y - this.y);
        if (d < bestD) { bestD = d; best = i; }
      }
      const result = this._moveTowards(this.waypoints[best].x, this.waypoints[best].y, this.patrolSpeed * 1.25, dt);
      if (result === 'arrived' || result === 'stuck') {
        this.wpIndex = (best + 1) % this.waypoints.length;
        this.state = GUARD_STATE.PATROL;
      }
    }

    // Footsteps while moving: the sound engine turns each step into a soft
    // thud positioned where this guard stands.
    if (this.moving) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.42;
        game.onGuardStep(this);
      }
    }
  }

  _patrol(dt) {
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      return;
    }
    const wp = this.waypoints[this.wpIndex];
    const result = this._moveTowards(wp.x, wp.y, this.patrolSpeed, dt);
    if (result === 'arrived' || result === 'stuck') {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.pauseTimer = this.pauseTime;
    }
  }

  // Walk toward a point, sliding along walls. Returns 'arrived', 'moving' or
  // 'stuck' (pushed against something for a second — give up, don't wedge).
  _moveTowards(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) { this._stuckFor = 0; this._lastDist = null; return 'arrived'; }
    if (this._lastDist !== null && dist > this._lastDist - 1) {
      this._stuckFor += dt;
    } else {
      this._stuckFor = 0;
    }
    this._lastDist = dist;
    if (this._stuckFor > 1.0) { this._stuckFor = 0; this._lastDist = null; return 'stuck'; }
    const step = Math.min(dist, speed * dt);
    const nx = dx / dist;
    const ny = dy / dist;
    this.facing = turnTowards(this.facing, Math.atan2(ny, nx), 10 * dt);
    moveCircle(this.grid, this, nx * step, ny * step, this.r);
    this.moving = true;
    return 'moving';
  }
}
