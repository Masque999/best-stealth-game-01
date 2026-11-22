// Night Vault — keyboard and mouse input, polled once per frame.
// Movement keys are held; action keys are edge-triggered (pressed this frame).
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, inside: false };
    this.clicked = false;
    this.click = { x: 0, y: 0 };
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.inside = true;
    });
    canvas.addEventListener('mouseleave', () => { this.mouse.inside = false; });
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.click.x = e.clientX - rect.left;
      this.click.y = e.clientY - rect.top;
      this.clicked = true;
    });
  }

  // Movement axis from WASD or the arrow keys, normalised.
  axis() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  // Take the click (if any) and clear it, so one click is one action.
  takeClick() {
    if (!this.clicked) return null;
    this.clicked = false;
    return { x: this.click.x, y: this.click.y };
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}
