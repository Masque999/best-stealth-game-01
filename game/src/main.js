// Night Vault — the game itself: the state machine, the loop, the HUD, the
// coin, the alarm, and the win/lose flow. Moth steals the Star Sapphire from
// the Halcyon Museum and reaches the green exit unseen, one level at a time.
import { TILE, COLS, ROWS, COINS_PER_LEVEL, COIN_RANGE, COIN_HEAR } from './config.js';
import { LEVELS, parseLevel } from './level.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { Player } from './player.js';
import { Guard, GUARD_STATE } from './guard.js';
import { drawScene } from './render.js';
import { stageShot } from './shots.js';

const STATE = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  CAUGHT: 'caught',
  CLEAR: 'clear',
  WIN: 'win',
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sound = new Sound();
    this.state = STATE.TITLE;
    this.levelIndex = 0;
    this.level = null;
    this.player = null;
    this.guards = [];
    this.lootTaken = false;
    this.coin = null;
    this.noise = null;
    this.effects = [];
    this.time = 0;
    this.totalTime = 0;
    this.alerts = 0;
    this.levelAlerts = 0;
    this.heat = 0;
    this.alarm = false;
    this.animTime = 0;
    this.message = '';
    this.messageTimer = 0;
    this.overlayClicked = false;
    this.view = { ox: 0, oy: 0, w: 0, h: 0 };

    this.overlay = document.getElementById('overlay');
    this.card = document.getElementById('ov-card');
    this.overlay.addEventListener('mousedown', () => { this.overlayClicked = true; });

    this.hud = {
      level: document.getElementById('hud-level'),
      objective: document.getElementById('hud-objective'),
      heatFill: document.getElementById('hud-heat-fill'),
      heatLabel: document.getElementById('hud-heat-label'),
      loot: document.getElementById('hud-loot'),
      coins: document.getElementById('hud-coins'),
      time: document.getElementById('hud-time'),
      hidden: document.getElementById('hud-hidden'),
      message: document.getElementById('hud-message'),
    };

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this._loadLevel(0);
    this._showTitle();
    this._updateHUD();
  }

  resize() {
    const stage = document.getElementById('stage');
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(320, stage.clientWidth);
    const h = Math.max(240, stage.clientHeight);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.dpr = dpr;
    this.view.w = w;
    this.view.h = h;
    this.view.ox = Math.max(8, (w - COLS * TILE) / 2);
    this.view.oy = Math.max(8, (h - ROWS * TILE) / 2);
  }

  _loadLevel(i) {
    this.levelIndex = i;
    this.level = parseLevel(LEVELS[i]);
    this.player = new Player(this.level.start.x, this.level.start.y);
    this.player.reset(this.level.start.x, this.level.start.y, COINS_PER_LEVEL);
    this.guards = LEVELS[i].guards.map((def) => new Guard(def, this.level.grid));
    this.lootTaken = false;
    this.coin = null;
    this.noise = null;
    this.effects = [];
    this.time = 0;
    this.levelAlerts = 0;
    this.heat = 0;
    this.alarm = false;
    this.message = '';
    this.messageTimer = 0;
  }

  start() {
    this.sound.unlock();
    this._hideOverlay();
    this.state = STATE.PLAYING;
    this._setMessage(`${LEVELS[this.levelIndex].name} — ${LEVELS[this.levelIndex].hint}`, 5);
    this._updateHUD();
  }

  _restartLevel() {
    this._loadLevel(this.levelIndex);
    this._hideOverlay();
    this.state = STATE.PLAYING;
    this._updateHUD();
  }

  _nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this._win();
      return;
    }
    this._loadLevel(this.levelIndex + 1);
    this._hideOverlay();
    this.state = STATE.PLAYING;
    this._setMessage(`${LEVELS[this.levelIndex].name} — ${LEVELS[this.levelIndex].hint}`, 5);
    this._updateHUD();
  }

  _busted() {
    this.state = STATE.CAUGHT;
    this.sound.busted();
    this._showOverlay(`
      <h1>BUSTED!</h1>
      <p>A guard got a hand on Moth. The Sapphire stays in its case — tonight.</p>
      <p class="keys">Press <b>R</b> or <b>Enter</b>, or click, to try the level again.</p>
    `);
  }

  _levelClear() {
    this.totalTime += this.time;
    this.state = STATE.CLEAR;
    this.sound.clear();
    const rating = this.levelAlerts === 0
      ? 'GHOST — never spotted'
      : this.levelAlerts <= 2
        ? 'SHADOW — barely seen'
        : 'LOUD — the whole museum knows';
    const last = this.levelIndex + 1 >= LEVELS.length;
    this._showOverlay(`
      <h1>${last ? 'THE VAULT IS YOURS' : 'LEVEL CLEAR'}</h1>
      <p>${LEVELS[this.levelIndex].name} — ${this._fmtTime(this.time)} (par ${LEVELS[this.levelIndex].par}s) · ${rating}</p>
      <p class="keys">Press <b>Enter</b>, or click, ${last ? 'for the final tally' : 'for the next level'}.</p>
    `);
  }

  _win() {
    this.state = STATE.WIN;
    this.sound.win();
    const rating = this.alerts === 0
      ? 'GHOST — the museum never knew you were there'
      : this.alerts <= 4
        ? 'SHADOW — a whisper in the galleries'
        : 'LOUD — but the Sapphire is yours anyway';
    this._showOverlay(`
      <h1>THE STAR SAPPHIRE IS YOURS</h1>
      <p>Three galleries, one clean getaway. Total time ${this._fmtTime(this.totalTime)} · alarms raised ${this.alerts}</p>
      <p>${rating}</p>
      <p class="keys">Press <b>R</b> or <b>Enter</b>, or click, to run it again from the Foyer.</p>
    `);
  }

  _showTitle() {
    this.state = STATE.TITLE;
    this._showOverlay(`
      <h1>NIGHT VAULT</h1>
      <p class="tag">A stealth game in three galleries</p>
      <p>You are Moth, a cat burglar in the Halcyon Museum after dark. Slip past the
      guards and their vision cones, hide behind crates and display cases, melt into
      the shadows, and toss a coin to pull a guard away. Steal the Star Sapphire and
      reach the green exit — unseen.</p>
      <p class="keys"><b>WASD / arrows</b> move &nbsp;·&nbsp; <b>click / Q</b> toss a coin &nbsp;·&nbsp; <b>P</b> pause &nbsp;·&nbsp; <b>R</b> restart &nbsp;·&nbsp; <b>M</b> mute</p>
      <p class="keys">Click or press <b>Enter</b> to begin.</p>
    `);
  }

  _showOverlay(html) {
    this.card.innerHTML = html;
    this.overlay.classList.remove('hidden');
  }

  _hideOverlay() {
    this.overlay.classList.add('hidden');
  }

  _setMessage(text, seconds) {
    this.message = text;
    this.messageTimer = seconds;
  }

  _fmtTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // A guard's footstep, positioned where the guard stands.
  onGuardStep(guard) {
    this.sound.footstep(guard.x, guard.y, this.player.x, this.player.y, 7);
  }

  // Throw a coin at a world point: it arcs there, lands with a ring and a
  // clink, and every guard close enough walks over to look.
  _tossCoin(tx, ty) {
    if (this.coin || this.player.coins <= 0) return;
    const dx = tx - this.player.x;
    const dy = ty - this.player.y;
    const dist = Math.hypot(dx, dy);
    const max = COIN_RANGE * TILE;
    if (dist > max) { tx = this.player.x + (dx / dist) * max; ty = this.player.y + (dy / dist) * max; }
    this.player.coins -= 1;
    this.coin = { x: this.player.x, y: this.player.y, z: 0, sx: this.player.x, sy: this.player.y, tx, ty, t: 0, dur: 0.45, landed: false, age: 0 };
  }

  _updatePlaying(dt) {
    // Pause and restart.
    if (this.input.wasPressed('KeyP')) {
      this.state = STATE.PAUSED;
      this._showOverlay('<h1>PAUSED</h1><p class="keys">Press <b>P</b> to resume, <b>R</b> to restart the level.</p>');
      return;
    }
    if (this.input.wasPressed('KeyR')) { this._restartLevel(); return; }
    if (this.input.wasPressed('KeyM')) this.sound.setMuted(!this.sound.muted);

    // Coin toss: a click throws toward the mouse, Q throws ahead of you.
    const click = this.input.takeClick();
    if (click) {
      this.sound.unlock();
      const wx = click.x - this.view.ox;
      const wy = click.y - this.view.oy;
      this._tossCoin(wx, wy);
    } else if (this.input.wasPressed('KeyQ')) {
      const fx = Math.cos(this.player.facing);
      const fy = Math.sin(this.player.facing);
      this._tossCoin(this.player.x + fx * 3 * TILE, this.player.y + fy * 3 * TILE);
    }

    this.player.update(dt, this.input, this.level.grid);

    // The flying coin.
    if (this.coin) {
      const c = this.coin;
      if (!c.landed) {
        c.t += dt / c.dur;
        if (c.t >= 1) {
          c.t = 1;
          c.landed = true;
          c.x = c.tx;
          c.y = c.ty;
          c.z = 0;
          this.noise = { x: c.tx, y: c.ty };
          this.effects.push({ kind: 'ring', x: c.tx, y: c.ty, age: 0, life: 0.7 });
          this.sound.coin();
        } else {
          c.x = c.sx + (c.tx - c.sx) * c.t;
          c.y = c.sy + (c.ty - c.sy) * c.t;
          c.z = Math.sin(Math.PI * c.t) * 34;
        }
      } else {
        c.age += dt;
        if (c.age > 8) this.coin = null;
      }
    }

    for (const guard of this.guards) guard.update(dt, this);
    this.noise = null;

    // The alarm: the hottest suspicion in the room, and whether anyone is
    // actively chasing you.
    this.heat = 0;
    this.alarm = false;
    for (const guard of this.guards) {
      if (guard.suspicion > this.heat) this.heat = guard.suspicion;
      if (guard.state === GUARD_STATE.ALERT) this.alarm = true;
      if (guard.justAlerted) {
        guard.justAlerted = false;
        this.alerts += 1;
        this.levelAlerts += 1;
        this.sound.alert();
      }
      if (guard.justSuspicious) {
        guard.justSuspicious = false;
        this.sound.suspicious();
      }
      // Caught: an alert guard gets a hand on you.
      if (guard.state === GUARD_STATE.ALERT) {
        const d = Math.hypot(guard.x - this.player.x, guard.y - this.player.y) / TILE;
        if (d < 0.55) { this._busted(); return; }
      }
    }

    // The loot.
    if (!this.lootTaken) {
      const d = Math.hypot(this.player.x - this.level.loot.x, this.player.y - this.level.loot.y) / TILE;
      if (d < 0.7) {
        this.lootTaken = true;
        this.sound.pickup();
        for (let i = 0; i < 8; i++) {
          this.effects.push({ kind: 'spark', x: this.level.loot.x + (Math.random() - 0.5) * 40, y: this.level.loot.y + (Math.random() - 0.5) * 40, age: 0, life: 0.8 });
        }
        this._setMessage('Sapphire secured — reach the green exit!', 4);
      }
    }

    // The exit.
    const de = Math.hypot(this.player.x - this.level.exit.x, this.player.y - this.level.exit.y) / TILE;
    if (de < 0.6) {
      if (this.lootTaken) { this._levelClear(); return; }
      if (this.messageTimer <= 0) this._setMessage('The Sapphire is still inside — grab it first!', 3);
    }

    this.time += dt;
    this._updateEffects(dt);
    this._updateHUD();
  }

  _updateEffects(dt) {
    for (const fx of this.effects) fx.age += dt;
    this.effects = this.effects.filter((fx) => fx.age < fx.life);
  }

  _updateHUD() {
    const lv = LEVELS[this.levelIndex];
    this.hud.level.textContent = `Level ${this.levelIndex + 1} — ${lv.name}`;
    this.hud.objective.textContent = this.lootTaken ? 'Reach the green exit' : 'Steal the Star Sapphire';
    this.hud.heatFill.style.width = `${Math.round(this.heat)}%`;
    this.hud.heatFill.className = this.alarm ? 'alarm' : this.heat >= 35 ? 'hot' : '';
    this.hud.heatLabel.textContent = this.alarm ? 'ALARM!' : this.heat >= 35 ? 'SPOTTED?' : 'DETECTION';
    this.hud.heatLabel.className = this.alarm ? 'alarm-text' : '';
    this.hud.loot.textContent = this.lootTaken ? '◆ Sapphire ✓' : '◆ Sapphire';
    this.hud.loot.className = this.lootTaken ? 'got' : '';
    this.hud.coins.textContent = `● Coins × ${this.player.coins}`;
    this.hud.time.textContent = this._fmtTime(this.time);
    this.hud.hidden.classList.toggle('show', this.player.inShadow && this.state === STATE.PLAYING);
    this.hud.message.textContent = this.messageTimer > 0 ? this.message : '';
  }

  update(dt) {
    this.animTime += dt;
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.state === STATE.PLAYING) {
      this._updatePlaying(dt);
    } else if (this.state === STATE.TITLE) {
      if (this.input.wasPressed('Enter') || this.overlayClicked) {
        this.overlayClicked = false;
        this.start();
      }
    } else if (this.state === STATE.PAUSED) {
      if (this.input.wasPressed('KeyP')) { this._hideOverlay(); this.state = STATE.PLAYING; }
      else if (this.input.wasPressed('KeyR')) this._restartLevel();
    } else if (this.state === STATE.CAUGHT) {
      if (this.input.wasPressed('KeyR') || this.input.wasPressed('Enter') || this.overlayClicked) {
        this.overlayClicked = false;
        this._restartLevel();
      }
    } else if (this.state === STATE.CLEAR) {
      if (this.input.wasPressed('Enter') || this.overlayClicked) {
        this.overlayClicked = false;
        this._nextLevel();
      }
    } else if (this.state === STATE.WIN) {
      if (this.input.wasPressed('KeyR') || this.input.wasPressed('Enter') || this.overlayClicked) {
        this.overlayClicked = false;
        this._loadLevel(0);
        this.totalTime = 0;
        this.alerts = 0;
        this._showTitle();
        this._updateHUD();
      }
    }
    this.overlayClicked = false;
  }

  render() {
    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0a0e18';
    ctx.fillRect(0, 0, this.view.w, this.view.h);
    drawScene(ctx, this, this.view);
  }

  loop(t) {
    const dt = Math.min(0.05, (t - (this._last ?? t)) / 1000 || 0);
    this._last = t;
    this.update(dt);
    this.render();
    this.input.endFrame();
    requestAnimationFrame((nt) => this.loop(nt));
  }

  run() {
    requestAnimationFrame((t) => this.loop(t));
  }
}

// Boot: a ?shot= URL stages one fixed moment for a screenshot instead of
// playing the game (see shots.js). Otherwise the game runs normally.
// __game is exposed for debugging and automated play-testing.
const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__game = game;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(game, shot);
} else {
  game.run();
}
