// ────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────

export class Enemy extends Phaser.GameObjects.Sprite {
  /**
   * @param {Phaser.Scene} scene 
   * @param {number} isoX   — isometric X (tile‐coord)
   * @param {number} isoY   — isometric Y (tile‐coord)
   * @param {string} mobType — key of the loaded image (e.g. "slime")
   * @param {number} [level=1] — integer level of this mob
   */
  constructor(scene, isoX, isoY, mobType, level = 1) {
    // Convert isoX/isoY → screen X/Y
    const tileW = scene.tileW, tileH = scene.tileH;
    const screenX = (isoX - isoY)*(tileW/2) + scene.offsetX;
    const screenY = (isoX + isoY)*(tileH/2) + scene.offsetY;

    super(scene, screenX, screenY, mobType);
    this.setOrigin(0.5, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(screenY);

    this.isoX    = isoX;
    this.isoY    = isoY;
    this.mobType = mobType;
    this.level   = level;

    // ─── Stats based on level ───────────────────────────────────
    const baseHP     = 10;
    const baseDamage = 1;
    this.maxHP       = baseHP * this.level;
    this.currentHP   = this.maxHP;
    this.damage      = baseDamage * this.level;
    this.speed       = 1.0 + (this.level - 1) * 0.2; // e.g. 1.0, 1.2, 1.4, …
    this.state       = 'idle';  // "idle" | "alert" | "attack" | "retreat" | "hurt"
    this.hitRadius   = 24;      // melee‐hit radius in screen px
    this.attackRange = 40;      // when within 40px, perform a “lunge” then retreat
    this.retreatTime = 0;       // countdown (ms) for “retreat” state
    this.alertRange  = 100;     // how close before becoming “alerted”

    // ─── Health‐bar + name text (initially hidden) ─────────────
    this.barBg = scene.add
      .rectangle(0, 0, 32, 4, 0x000000, 1)
      .setDepth(this.depth + 1)
      .setVisible(false);

    this.barFg = scene.add
      .rectangle(0, 0, 32, 4, 0x44ff44, 1)
      .setDepth(this.depth + 2)
      .setVisible(false);

    // Name + level (e.g. “Slime – Lvl 3”)
    this.nameText = scene.add
      .text(0, 0, `${this._capitalize(this.mobType)} – Lvl ${this.level}`, {
        fontSize: '12px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
      })
      .setDepth(this.depth + 3)
      .setOrigin(0.5, 1)
      .setVisible(false);

    // Container for barBg and barFg
    this.healthContainer = scene.add
      .container(screenX, screenY - this.height - 8, [ this.barBg, this.barFg, this.nameText ])
      .setDepth(this.depth + 1)
      .setVisible(false);

    // Draw the initial full bar (width = 32)
    this.barBg.x = -16;
    this.barFg.x = -16;
    this.nameText.y = -8; // place the name slightly above bar

    // ─── Start wandering in a random direction ─────────────────
    this._setRandomDirection();
  }

  // Capitalize e.g. "slime" → "Slime"
  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  _setRandomDirection() {
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
    const length = Math.hypot(pick.dx, pick.dy);
    this.dirX = pick.dx / length;
    this.dirY = pick.dy / length;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    const dt = delta / 1000;
    const player = this.scene.player;

    // ─── If “retreat” countdown is running, decrement it ────────
    if (this.state === 'retreat') {
      this.retreatTime -= delta;
      if (this.retreatTime <= 0) {
        this.state = 'alert'; // return to chasing after retreat ends
      }
    }

    // ─── Always check distance to player to switch states ───────
    const distToPlayer = Phaser.Math.Distance.Between(
      this.x, this.y,
      player.x, player.y
    );

    // If within attackRange AND not currently retreating or hurt, switch to “attack”
    if (
      distToPlayer < this.attackRange &&
      this.state !== 'retreat' &&
      this.state !== 'hurt'
    ) {
      this.state = 'attack';
      this._showHealthBar(true);
    }
    // If not in “attack” AND within alertRange, switch to “alert”
    else if (
      distToPlayer < this.alertRange &&
      this.state !== 'attack' &&
      this.state !== 'retreat' &&
      this.state !== 'hurt'
    ) {
      this.state = 'alert';
      this._showHealthBar(true);
    }
    // Else, if player is far and we’re not hurt, revert to idle
    else if (
      distToPlayer >= this.alertRange &&
      this.state !== 'hurt'
    ) {
      this.state = 'idle';
      this._showHealthBar(false);
    }

    // ─── Movement logic per state ───────────────────────────────
    if (this.state === 'idle') {
      // Wander randomly
      this.isoX += this.dirX * this.speed * dt;
      this.isoY += this.dirY * this.speed * dt;

      // Bounce off map edges and pick a new random direction
      const mw = this.scene.mapW, mh = this.scene.mapH;
      if (this.isoX < 0)           { this.isoX = 0; this._setRandomDirection(); }
      else if (this.isoX > mw - 1) { this.isoX = mw - 1; this._setRandomDirection(); }
      if (this.isoY < 0)           { this.isoY = 0; this._setRandomDirection(); }
      else if (this.isoY > mh - 1) { this.isoY = mh - 1; this._setRandomDirection(); }
    }
    else if (this.state === 'alert') {
      // Chase the player
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const length = Math.hypot(dx, dy);
      if (length > 0) {
        this.isoX += (dx/length) * this.speed * dt;
        this.isoY += (dy/length) * this.speed * dt;
      }
    }
    else if (this.state === 'attack') {
      // Lunge toward the player one step, then immediately begin “retreat”
      // We simply back off a bit from the player's current position:
      const dx = this.x - player.x;
      const dy = this.y - player.y;
      const length = Math.hypot(dx, dy);
      if (length > 0) {
        // Move away in screen space by a small amount:
        const backOff = 32; // 32 px back
        const nx = this.x + (dx/length)*backOff;
        const ny = this.y + (dy/length)*backOff;

        // Convert screen (nx,ny) back to isoX/isoY:
        const tileW = this.scene.tileW, tileH = this.scene.tileH;
        const isoX = ((nx - this.scene.offsetX)/(tileW/2) + (ny - this.scene.offsetY)/(tileH/2)) / 2;
        const isoY = (((ny - this.scene.offsetY)/(tileH/2)) - ((nx - this.scene.offsetX)/(tileW/2))) / 2;

        this.isoX = isoX;
        this.isoY = isoY;
      }

      // Deal damage to player immediately (you can add an on‐hit debounce if desired):
      // e.g. player.takeDamage ? player.takeDamage(this.damage) : console.log(...)
      // For now, just log it:
      console.log(`Slime Lvl ${this.level} hits player for ${this.damage} damage!`);

      // After attacking, enter “retreat” for a random 0.5–1.0s
      this.state = 'retreat';
      this.retreatTime = Phaser.Math.Between(500, 1000);
    }
    else if (this.state === 'retreat') {
      // Already handled at top: we simply wait until retreatTime ≤ 0,
      // then state will flip back to 'alert' automatically.
    }
    else if (this.state === 'hurt') {
      // Freeze in place until the “hurt” timer finishes (in takeDamage)
    }

    // ─── Convert updated isoX/isoY → screen X/Y ────────────────
    const tileW = this.scene.tileW, tileH = this.scene.tileH;
    const screenX = (this.isoX - this.isoY)*(tileW/2) + this.scene.offsetX;
    const screenY = (this.isoX + this.isoY)*(tileH/2) + this.scene.offsetY;

    this.setPosition(screenX, screenY).setDepth(screenY);
    this.healthContainer.setPosition(screenX, screenY - this.height - 8);
    this.healthContainer.setDepth(screenY + 1);
    this.nameText.setPosition(0, -8); // relative to container

    // ─── Occasionally pick a new wander direction if idle ───────
    if (this.state === 'idle' && Phaser.Math.Between(0, 1000) < 5) {
      this._setRandomDirection();
    }
  }

  /**
   * Called when the player’s Space‐attack hits this Enemy.
   */
  takeDamage(amount) {
    this.currentHP -= amount;
    if (this.currentHP < 0) this.currentHP = 0;

    // Immediately go into “hurt” state and show health bar + name
    this.state = 'hurt';
    this._showHealthBar(true);

    this._updateHealthBar();

    // Briefly tint red, then resume either alert or idle logic
    this.setTint(0xff4444);
    this.scene.time.delayedCall(100, () => {
      this.clearTint();
      // After another 500ms, if still not “alert” (player is far), hide the bar
      this.scene.time.delayedCall(500, () => {
        if (this.state !== 'alert' && this.currentHP > 0) {
          this._showHealthBar(false);
          this.state = 'idle';
        }
        // if currentHP==0, we’ll die next:
        if (this.currentHP === 0) {
          this.die();
        }
      });
    });
  }

  _updateHealthBar() {
    const pct = Phaser.Math.Clamp(this.currentHP / this.maxHP, 0, 1);
    this.barFg.width = 32 * pct;
    this.barFg.x = -16 + this.barFg.width/2;
    this.barBg.x = -16;
  }

  _showHealthBar(visible) {
    this.barBg.setVisible(visible);
    this.barFg.setVisible(visible);
    this.nameText.setVisible(visible);
    this.healthContainer.setVisible(visible);
  }

  die() {
    this.scene.tweens.add({
      targets: [ this, this.healthContainer ],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.healthContainer.destroy();
        this.destroy();
      }
    });
  }
}
