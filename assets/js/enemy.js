// ────────────────────────────────────────────────────────────────────────────────

export class Enemy extends Phaser.GameObjects.Sprite {
  /**
   * @param {Phaser.Scene} scene 
   * @param {number} isoX    – isometric X (tile‐coord) 
   * @param {number} isoY    – isometric Y (tile‐coord) 
   * @param {string} mobType – key of loaded texture (e.g. "slime") 
   * @param {number} [level=1]
   */
  constructor(scene, isoX, isoY, mobType, level = 1) {
    // Convert (isoX, isoY) → on‐screen (x, y)
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

    // ─── Stats by level ─────────────────────────────────────────
    const baseHP     = 10;
    const baseDamage = 1;
    this.maxHP      = baseHP * this.level;
    this.currentHP  = this.maxHP;
    this.damage     = baseDamage * this.level;
    this.speed      = 1.0 + (this.level - 1)*0.2; // e.g. 1.0, 1.2, 1.4, …
    this.state      = 'idle';    // idle | alert | attack | retreat | hurt
    this.hitRadius  = 24;        // screen px for player melee
    this.attackRange = 40;       // lunge when within 40px
    this.retreatTime = 0;        // ms countdown for smooth retreat
    this.alertRange  = 100;      // px to switch to “alert”
    this.retreatDir  = { x: 0, y: 0 };

    // ─── Health‐bar + name (hidden by default) ─────────────────
    // We’ll center both at (0,0) inside a container with origin (0.5, 1).
    this.barBg = scene.add
      .rectangle(0, 0, 32, 4, 0x000000, 1)
      .setDepth(this.depth + 1)
      .setOrigin(0.5, 0)
      .setVisible(false);

    this.barFg = scene.add
      .rectangle(0, 0, 32, 4, 0x44ff44, 1)
      .setDepth(this.depth + 2)
      .setOrigin(0.5, 0)
      .setVisible(false);

    this.nameText = scene.add
      .text(0, -8, `${this._capitalize(this.mobType)} – Lvl ${this.level}`, {
        fontSize: '12px',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 2
      })
      .setDepth(this.depth + 3)
      .setOrigin(0.5, 1)
      .setVisible(false);

    this.healthContainer = scene.add
      .container(screenX, screenY - this.height - 8, [ this.barBg, this.barFg, this.nameText ])
      .setDepth(this.depth + 1)
      .setVisible(false);

    // Draw full‐health bar at start:
    this.barBg.y = 0;
    this.barFg.y = 0;
    this.barBg.x = 0;
    this.barFg.x = 0;

    // Wander in a random direction initially
    this._setRandomDirection();
  }

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

    // 1) If “retreat” countdown is active, move gradually
    if (this.state === 'retreat') {
      // Move along stored retreatDir in iso‐space
      this.isoX += this.retreatDir.x * this.speed * dt;
      this.isoY += this.retreatDir.y * this.speed * dt;
      this.retreatTime -= delta;
      if (this.retreatTime <= 0) {
        // Once done retreating, go back to alert (if player still close)
        this.state = 'alert';
      }
    }

    // 2) Compute screen distance to player:
    const distToPlayer = Phaser.Math.Distance.Between(
      this.x, this.y,
      player.x, player.y
    );

    // 3) Decide new state based on distance & current state
    if (
      distToPlayer < this.attackRange &&
      this.state !== 'retreat' &&
      this.state !== 'hurt'
    ) {
      this.state = 'attack';
      this._showHealthBar(true);
    }
    else if (
      distToPlayer < this.alertRange &&
      this.state !== 'attack' &&
      this.state !== 'retreat' &&
      this.state !== 'hurt'
    ) {
      this.state = 'alert';
      this._showHealthBar(true);
    }
    else if (
      distToPlayer >= this.alertRange &&
      this.state !== 'hurt'
    ) {
      this.state = 'idle';
      this._showHealthBar(false);
    }

    // 4) Movement logic by state
    if (this.state === 'idle') {
      // wander randomly
      this.isoX += this.dirX * this.speed * dt;
      this.isoY += this.dirY * this.speed * dt;

      // bounce off map edges & pick new direction
      const mw = this.scene.mapW, mh = this.scene.mapH;
      if (this.isoX < 0)           { this.isoX = 0;    this._setRandomDirection(); }
      else if (this.isoX > mw - 1) { this.isoX = mw - 1; this._setRandomDirection(); }
      if (this.isoY < 0)           { this.isoY = 0;    this._setRandomDirection(); }
      else if (this.isoY > mh - 1) { this.isoY = mh - 1; this._setRandomDirection(); }
    }
    else if (this.state === 'alert') {
      // chase the player
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const length = Math.hypot(dx, dy);
      if (length > 0) {
        this.isoX += (dx/length)*this.speed*dt;
        this.isoY += (dy/length)*this.speed*dt;
      }
    }
    else if (this.state === 'attack') {
      // 4a) Compute iso‐space vector away from the player,
      const pxIso = (player.x - this.scene.offsetX)/(this.scene.tileW/2) + (player.y - this.scene.offsetY)/(this.scene.tileH/2);
      const pyIso = ((player.y - this.scene.offsetY)/(this.scene.tileH/2) - (player.x - this.scene.offsetX)/(this.scene.tileW/2)) / 2;
      const isoDX = this.isoX - player.x / this.scene.tileW;
      const isoDY = this.isoY - player.y / this.scene.tileH;
      const screenDX = this.x - player.x;
      const screenDY = this.y - player.y;
      const length = Math.hypot(screenDX, screenDY) || 1;
      this.retreatDir.x = (screenDX/length + screenDY/length) / 2;
      this.retreatDir.y = (screenDY/length - screenDX/length) / 2;

      // deal damage to player (you can replace with actual player.takeDamage(this.damage))
      console.log(`Slime Lvl ${this.level} hits player for ${this.damage} damage!`);

      // set up a 500–1000ms retreat
      this.retreatTime = Phaser.Math.Between(500, 1000);
      this.state = 'retreat';
    }
    // if state == 'retreat', movement was handled at top
    // if state == 'hurt', we simply do nothing until hurt timer ends

    // 5) Re‐compute screen position from isoX/isoY:
    const tileW = this.scene.tileW, tileH = this.scene.tileH;
    const screenX = (this.isoX - this.isoY)*(tileW/2) + this.scene.offsetX;
    const screenY = (this.isoX + this.isoY)*(tileH/2) + this.scene.offsetY;
    this.setPosition(screenX, screenY).setDepth(screenY);

    // 6) Move the health‐bar + name with the sprite
    this.healthContainer.setPosition(screenX, screenY - this.height - 8);
    this.healthContainer.setDepth(screenY + 1);
    this.nameText.setPosition(0, -8);

    // 7) Occasionally pick a new wander direction
    if (this.state === 'idle' && Phaser.Math.Between(0, 1000) < 5) {
      this._setRandomDirection();
    }
  }

  /*
   * Called when the players Space‐attack hits this Enemy.
   */
  takeDamage(amount) {
    const scene = this.scene;

    this.currentHP -= amount;
    if (this.currentHP < 0) this.currentHP = 0;

    // Immediately show “hurt” state and keep health bar visible
    this.state = 'hurt';
    this._showHealthBar(true);
    this._updateHealthBar();

    // Flash red, then after 100 ms clear tint …
    scene.time.delayedCall(100, () => {
      // If this enemy was already destroyed, bail out:
      if (!this || !this.body) {
        return;
      }
      this.clearTint();

      // After another 500 ms, resume either idle or alert, or die if HP=0
      scene.time.delayedCall(500, () => {
        // If enemy no longer exists, stop.
        if (!this || !this.body) {
          return;
        }

        // If HP has dropped to zero in the meantime, kill it:
        if (this.currentHP === 0) {
          this.die();
          return;
        }

        // Otherwise, decide whether to stay alert or go back to idle:
        const distToPlayer = Phaser.Math.Distance.Between(
          this.x, this.y,
          scene.player.x, scene.player.y
        );
        if (distToPlayer < this.alertRange) {
          this.state = 'alert';
          this._showHealthBar(true);
        } else {
          this.state = 'idle';
          this._showHealthBar(false);
        }
      });
    });
  }
  
  _updateHealthBar() {
    const pct = Phaser.Math.Clamp(this.currentHP / this.maxHP, 0, 1);
    this.barFg.width = 32 * pct;
    // barFg origin is (0.5,0), so no need to shift x manually
  }

  _showHealthBar(visible) {
    this.barBg.setVisible(visible);
    this.barFg.setVisible(visible);
    this.nameText.setVisible(visible);
    this.healthContainer.setVisible(visible);
  }

  die() {
    // 1) Fade out visuals
    this.scene.tweens.add({
      targets: [ this, this.healthContainer ],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        // 2) Spawn loot in the scene
        const scene = this.scene;
        scene.spawnLoot(this.x, this.y, 'loot-coin', Phaser.Math.Between(1, 3)); 
        // 3) Destroy sprite + container
        this.healthContainer.destroy();
        this.destroy();
      }
    });
  }
}
