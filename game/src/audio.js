// Night Vault — every sound is synthesized with WebAudio; there are no audio
// files. Guard footsteps are the point: a guard's step is a soft thud whose
// volume falls with distance and whose stereo pan follows the guard, so you
// can hear where a patrol is before you see it.
export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  // Browsers only let audio start after a user gesture; call from a click or
  // a key press, and it is safe to call again later (it does nothing twice).
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  _tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise(dur, filterFreq, vol, when = 0, pan = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    src.connect(filter);
    filter.connect(gain);
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(this.master);
    } else {
      gain.connect(this.master);
    }
    src.start(t0);
  }

  // A guard's footstep at (gx, gy) heard from (px, py): quieter with distance,
  // panned left or right by where the guard stands. `rangeTiles` is how far
  // the sound carries, in tiles.
  footstep(gx, gy, px, py, rangeTiles) {
    if (!this.ctx || this.muted) return;
    const dx = gx - px;
    const dy = gy - py;
    const dist = Math.hypot(dx, dy);
    const maxDist = rangeTiles * 56;
    if (dist > maxDist) return;
    const vol = 0.22 * (1 - dist / maxDist);
    const pan = Math.max(-0.9, Math.min(0.9, dx / maxDist));
    this._noise(0.09, 320, vol, 0, pan);
  }

  // Two rising notes: a guard has spotted you.
  alert() {
    this._tone(392, 0.16, 'square', 0.10);
    this._tone(587, 0.28, 'square', 0.12, 0.14);
  }

  // A short questioning blip: a guard is getting suspicious.
  suspicious() {
    this._tone(330, 0.14, 'triangle', 0.10);
  }

  // The coin landing: a bright ping.
  coin() {
    this._tone(2093, 0.10, 'sine', 0.14);
    this._tone(2637, 0.16, 'sine', 0.10, 0.05);
  }

  // The Sapphire picked up: a little rising arpeggio.
  pickup() {
    this._tone(523, 0.10, 'sine', 0.12);
    this._tone(659, 0.10, 'sine', 0.12, 0.08);
    this._tone(784, 0.16, 'sine', 0.12, 0.16);
  }

  // Level cleared.
  clear() {
    this._tone(523, 0.12, 'triangle', 0.12);
    this._tone(659, 0.12, 'triangle', 0.12, 0.10);
    this._tone(784, 0.12, 'triangle', 0.12, 0.20);
    this._tone(1047, 0.24, 'triangle', 0.12, 0.30);
  }

  // Caught: a low falling drone.
  busted() {
    this._tone(220, 0.5, 'sawtooth', 0.10, 0, 110);
    this._noise(0.4, 240, 0.10);
  }

  // All three levels done.
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this._tone(f, 0.22, 'triangle', 0.12, i * 0.11));
  }
}
