// ────────────────────────────────────────────────────────────────────────────────
// ENEMY 1
// ────────────────────────────────────────────────────────────────────────────────

export class Enemy extends Phaser.GameObjects.Sprite {
  constructor(scene, isoX, isoY, mobType) {
    // Convert isometric coords (tile‐based) to screen (2D) coords. We'll assume
    // the mobType is “slime” → a simple 32×32 image. You can adjust if your sprite is larger.
    const tileW = scene.tileW, tileH = scene.tileH;
    const screenX = (isoX - isoY)*(tileW/2) + scene.offsetX;
    const screenY = (isoX + isoY)*(tileH/2) + scene.offsetY;

    super(scene, screenX, screenY, mobType);
    this.setOrigin(0.5, 1);       // bottom‐center origin so feet “sit” on ground
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Simple “depth” so they draw under the player if lower y:
    this.setDepth(screenY);

    // Store isometric coordinates (floats) internally:
    this.isoX    = isoX;
    this.isoY    = isoY;
    this.mobType = mobType;

    // Basic stats:
    this.maxHP    = 10;
    this.currentHP = this.maxHP;
    this.speed    = 1.0;   // “tiles per second” for wandering
    this.state    = 'idle';

    // For wandering: choose a random direction vector (dx, dy) normalized:
    this._setRandomDirection();

    // If you want to add an actual health bar later, you could do it here.
  }

  _setRandomDirection() {
    // Pick a random unit‐vector in the isometric grid (4 directions OR diagonal)
    const dirs = [
      { dx:  1, dy:  0 },
      { dx: -1, dy:  0 },
      { dx:  0, dy:  1 },
      { dx:  0, dy: -1 },
      { dx:  1, dy:  1 },
      { dx:  1, dy: -1 },
      { dx: -1, dy:  1 },
      { dx: -1, dy: -1 }
    ];
    const pick = Phaser.Math.RND.pick(dirs);
    // Normalize diagonal so speed is roughly consistent:
    const length = Math.sqrt(pick.dx * pick.dx + pick.dy * pick.dy);
    this.dirX = pick.dx / length;
    this.dirY = pick.dy / length;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    // Very simple “random walk”: move in current direction for a short burst,
    // then randomly pick a new direction occasionally
    const dt = delta / 1000;  // convert ms→seconds
    if (this.state === 'idle') {
      // Move slightly:
      this.isoX += this.dirX * this.speed * dt;
      this.isoY += this.dirY * this.speed * dt;

      // Clamp isoX/isoY to within map bounds, bounce if necessary:
      const mw = this.scene.mapW, mh = this.scene.mapH;
      if (this.isoX < 0)              { this.isoX = 0; this._setRandomDirection(); }
      else if (this.isoX > mw - 1)    { this.isoX = mw - 1; this._setRandomDirection(); }
      if (this.isoY < 0)              { this.isoY = 0; this._setRandomDirection(); }
      else if (this.isoY > mh - 1)    { this.isoY = mh - 1; this._setRandomDirection(); }

      // Convert back to screen coordinates:
      const tileW = this.scene.tileW, tileH = this.scene.tileH;
      const screenX = (this.isoX - this.isoY)*(tileW/2) + this.scene.offsetX;
      const screenY = (this.isoX + this.isoY)*(tileH/2) + this.scene.offsetY;

      this.setPosition(screenX, screenY);
      this.setDepth(screenY);

      // Occasionally change direction:
      if (Phaser.Math.Between(0, 1000) < 5) {
        this._setRandomDirection();
      }
    }

    // (Later: handle "chasing player" or "fleeing", etc.)
  }

  takeDamage(amount) {
    this.currentHP -= amount;
    if (this.currentHP <= 0) {
      this.die();
    }
  }

  die() {
    // trigger a small fade/kill animation:
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.destroy();
      }
    });
  }
}
