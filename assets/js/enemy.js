// assets/js/enemy.js

export class Enemy extends Phaser.GameObjects.Sprite {
  /**
   * @param {Phaser.Scene} scene 
   * @param {number} isoX    – isometric X (tile‐coord)
   * @param {number} isoY    – isometric Y (tile‐coord)
   * @param {string} texture – key of loaded texture (e.g. "slime")
   * @param {number} [level=1]
   */
  constructor(scene, isoX, isoY, texture, level = 1) {
    // Convert (isoX, isoY) → screen (x, y)
    const tileW = scene.tileW,
          tileH = scene.tileH;
    const screenX = (isoX - isoY) * (tileW / 2) + scene.offsetX;
    const screenY = (isoX + isoY) * (tileH / 2) + scene.offsetY;

    super(scene, screenX, screenY, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.scene   = scene;
    this.isoX    = isoX;
    this.isoY    = isoY;
    this.level   = level;
    this.maxHp   = 5 * level;
    this.hp      = this.maxHp;
    this.speed   = 1 + 0.2 * level;
    this.state   = 'idle';

    this.setOrigin(0.5, 1);
    this.setDepth(this.y);

    // ————— Build a little container for health bar + name tag —————
    this.uiContainer = scene.add.container(this.x, this.y);
    this.uiContainer.setDepth(this.depth + 1);

    // Black background for the health bar
    this.healthBarBg = scene.add.rectangle(
      0, 
      -this.height - 10, 
      40, 
      6, 
      0x000000
    ).setOrigin(0.5, 0.5);

    // Red foreground for the health bar
    this.healthBar = scene.add.rectangle(
      -20, 
      -this.height - 10, 
      40, 
      6, 
      0xff0000
    ).setOrigin(0, 0.5);

    // Name + Level text
    this.nameTag = scene.add.text(
      0, 
      -this.height - 22,
      `Slime – Lvl ${this.level}`,
      {
        font: '12px Arial',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5, 1);

    // Hide UI initially
    this.uiContainer.add([ this.healthBarBg, this.healthBar, this.nameTag ]);
    this.uiContainer.setVisible(false);

    // Random wander direction
    this.dirX = Phaser.Math.Between(-1, 1);
    this.dirY = Phaser.Math.Between(-1, 1);

    // Every 1–2 seconds pick a new random direction
    scene.time.addEvent({
      delay: Phaser.Math.Between(1000, 2000),
      callback: () => {
        if (this.state !== 'dead') {
          this.dirX = Phaser.Math.Between(-1, 1);
          this.dirY = Phaser.Math.Between(-1, 1);
        }
      },
      loop: true
    });

    // Keep within world bounds (optional)
    this.body.setCollideWorldBounds(true);
  }

  /**
   * Called when the slime takes damage.
   */
  takeDamage(amount) {
    if (this.state === 'dead') {
      return;
    }

    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      this.uiContainer.setVisible(true);
      this.updateHealthBar();
      this.playDeath();
    } else {
      // Show health + name when struck
      this.uiContainer.setVisible(true);
      this.updateHealthBar();

      // Hide again after 1.5 seconds if still alive
      this.scene.time.delayedCall(1500, () => {
        if (this.state !== 'dead') {
          this.uiContainer.setVisible(false);
        }
      });
    }
  }

  /**
   * Updates the red portion of the health bar.
   */
  updateHealthBar() {
    const pct = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.healthBar.width = 40 * pct;
  }

  /**
   * Called every frame by MainScene.update
   */
  update(time, delta) {
    if (this.state === 'dead') {
      return;
    }

    // Measure (Manhattan) distance in iso‐coords to the player
    const px = this.scene.playerIsoX,
          py = this.scene.playerIsoY;
    const dx = this.isoX - px,
          dy = this.isoY - py;
    const manDist = Math.abs(dx) + Math.abs(dy);

    if (manDist < 2) {
      // ATTACK MODE: move toward player
      this.state = 'attack';
      const moveX = dx < 0 ? 1 : dx > 0 ? -1 : 0;
      const moveY = dy < 0 ? 1 : dy > 0 ? -1 : 0;
      this.isoX += moveX * this.speed * (delta / 1000);
      this.isoY += moveY * this.speed * (delta / 1000);
    } else {
      // WANDER MODE: random direction
      this.state = 'idle';
      this.isoX += this.dirX * this.speed * (delta / 1000);
      this.isoY += this.dirY * this.speed * (delta / 1000);

      // Bounce off edges if wandering off‐map
      if (
        this.isoX < 0 || this.isoX > this.scene.mapW ||
        this.isoY < 0 || this.isoY > this.scene.mapH
      ) {
        this.dirX = Phaser.Math.Between(-1, 1);
        this.dirY = Phaser.Math.Between(-1, 1);
      }
    }

    // Convert iso coords → screen coords each frame
    const tileW = this.scene.tileW,
          tileH = this.scene.tileH;
    this.x = (this.isoX - this.isoY) * (tileW / 2) + this.scene.offsetX;
    this.y = (this.isoX + this.isoY) * (tileH / 2) + this.scene.offsetY;
    this.setDepth(this.y);

    // Move the UI container above the slime
    this.uiContainer
      .setPosition(this.x, this.y)
      .setDepth(this.depth + 1);
  }

  /**
   * Plays a quick fade‐out, then drops 2–5 coins via scene.spawnLoot(...)
   */
  playDeath() {
    const sceneRef = this.scene;

    sceneRef.tweens.add({
      targets: [ this, this.uiContainer ],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        // Drop a random 2–5 coins on death
        const dropCount = Phaser.Math.Between(2, 5);
        sceneRef.spawnLoot(
          this.isoX,
          this.isoY,
          'coin',
          dropCount
        );

        this.uiContainer.destroy();
        this.destroy();
      }
    });
  }
}
