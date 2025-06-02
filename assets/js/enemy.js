// ────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────

export class Enemy extends Phaser.GameObjects.Sprite {
  constructor(scene, isoX, isoY, mobType) {
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

    // ─── Health & stats ─────────────────────────────────────────────
    this.maxHP      = 10;
    this.currentHP  = this.maxHP;
    this.speed      = 1.0;
    this.state      = 'idle';       // can be 'idle', 'alert', 'hurt'
    this.hitRadius  = 24;           // screen-pixel radius for melee hits
    this.showHealth = false;        // whether to display health bar

    // Create a small health‐bar container above the sprite (initially hidden)
    this.barBg = scene.add.rectangle(0, 0, 32, 4, 0x000000, 1)
                       .setDepth(this.depth + 1)
                       .setVisible(false);
    this.barFg = scene.add.rectangle(0, 0, 32, 4, 0x44ff44, 1)
                       .setDepth(this.depth + 2)
                       .setVisible(false);
    this.healthContainer = scene.add.container(
      screenX, screenY - this.height - 8,
      [ this.barBg, this.barFg ]
    );
    this.healthContainer.setDepth(this.depth + 1);
    this.healthContainer.setVisible(false);

    // Random initial wander direction
    this._setRandomDirection();
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

    // ─── Check “alert” distance from player ───────────────────────
    const distToPlayer = Phaser.Math.Distance.Between(
      this.x, this.y,
      player.x, player.y
    );
    if (distToPlayer < 100) {
      // if player is within 100px, go into “alert” state
      this.state = 'alert';
      this._showHealthBar(true);
    } else if (this.state !== 'hurt') {
      // if not currently hurt, revert to idle and hide health bar
      this.state = 'idle';
      this._showHealthBar(false);
    }

    // ─── Movement logic ───────────────────────────────────────────
    if (this.state === 'idle') {
      // Wander randomly
      this.isoX += this.dirX * this.speed * dt;
      this.isoY += this.dirY * this.speed * dt;

      // Keep inside map bounds
      const mw = this.scene.mapW, mh = this.scene.mapH;
      if (this.isoX < 0)           { this.isoX = 0; this._setRandomDirection(); }
      else if (this.isoX > mw - 1) { this.isoX = mw - 1; this._setRandomDirection(); }
      if (this.isoY < 0)           { this.isoY = 0; this._setRandomDirection(); }
      else if (this.isoY > mh - 1) { this.isoY = mh - 1; this._setRandomDirection(); }
    }
    else if (this.state === 'alert') {
      // Simple “chase” behavior: move directly toward the player
      const tx = player.x, ty = player.y;
      const dx = tx - this.x, dy = ty - this.y;
      const length = Math.hypot(dx, dy);
      this.isoX += (dx/length) * this.speed * dt * 1.2; // a bit faster when alert
      this.isoY += (dy/length) * this.speed * dt * 1.2;
    }
    else if (this.state === 'hurt') {
      // Freeze in place briefly on hurt, then revert to idle
      // (Handled in takeDamage via timed event)
    }

    // Convert iso → screen
    const tileW = this.scene.tileW, tileH = this.scene.tileH;
    const screenX = (this.isoX - this.isoY)*(tileW/2) + this.scene.offsetX;
    const screenY = (this.isoX + this.isoY)*(tileH/2) + this.scene.offsetY;

    this.setPosition(screenX, screenY).setDepth(screenY);
    this.healthContainer.setPosition(screenX, screenY - this.height - 8);
    this.healthContainer.setDepth(screenY + 1);
  }

  takeDamage(amount) {
    this.currentHP -= amount;
    if (this.currentHP < 0) this.currentHP = 0;

    // Show the health bar whenever we're hurt
    this.state = 'hurt';
    this._showHealthBar(true);

    this._updateHealthBar();

    // Flash red for 100ms
    this.setTint(0xff4444);
    this.scene.time.delayedCall(100, () => {
      this.clearTint();
      // after 500ms, if still not “alert” (player is far), hide health bar
      this.scene.time.delayedCall(500, () => {
        if (this.state !== 'alert') {
          this._showHealthBar(false);
          this.state = 'idle';
        } else {
          // stay in alert state (health bar remains visible)
        }
      });
    });

    if (this.currentHP === 0) {
      this.die();
    }
  }

  _updateHealthBar() {
    const pct = Phaser.Math.Clamp(this.currentHP / this.maxHP, 0, 1);
    this.barFg.width = 32 * pct;
    this.barFg.x = -16 + (this.barFg.width / 2);
    this.barBg.x = -16;
  }

  _showHealthBar(visible) {
    this.showHealth = visible;
    this.barBg.setVisible(visible);
    this.barFg.setVisible(visible);
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
