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

    // Add a container to hold health bar + name tag
    this.uiContainer = scene.add.container(this.x, this.y);
    this.uiContainer.setDepth(this.depth + 1);

    // Health bar background
    this.healthBarBg = scene.add.rectangle(0, -this.height - 10, 40, 6, 0x000000)
      .setOrigin(0.5, 0.5);
    // Health bar foreground (red)
    this.healthBar = scene.add.rectangle(-20, -this.height - 10, 40, 6, 0xff0000)
      .setOrigin(0, 0.5);

    // Name‐level text above health bar
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

    // Initially hide UI
    this.uiContainer.add([ this.healthBarBg, this.healthBar, this.nameTag ]);
    this.uiContainer.setVisible(false);

    // Choose an initial random wander direction
    this.dirX = Phaser.Math.Between(-1, 1);
    this.dirY = Phaser.Math.Between(-1, 1);

    // Periodically pick a new random direction (every 1–2 seconds)
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

    // Let it collide against world bounds (optional)
    this.body.setCollideWorldBounds(true);
  }

  /**
   * Reduce HP, show UI and trigger death if hp ≤ 0.
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
      // Show health + name when hit
      this.uiContainer.setVisible(true);
      this.updateHealthBar();

      // Auto‐hide UI after 1.5 seconds
      this.scene.time.delayedCall(1500, () => {
        if (this.state !== 'dead') {
          this.uiContainer.setVisible(false);
        }
      });
    }
  }

  /**
   * Update health bar’s width to match current HP.
   */
  updateHealthBar() {
    const pct = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.healthBar.width = 40 * pct;
  }

  /**
   * Called by MainScene.update(…) each frame.
   */
  update(time, delta) {
    if (this.state === 'dead') {
      return;
    }

    // Compute Manhattan distance to player in iso coords
    const px = this.scene.playerIsoX,
          py = this.scene.playerIsoY;
    const dx = this.isoX - px,
          dy = this.isoY - py;
    const manDist = Math.abs(dx) + Math.abs(dy);

    if (manDist < 2) {
      // ATTACK: move toward the player
      this.state = 'attack';
      const moveX = dx < 0 ? 1 : dx > 0 ? -1 : 0;
      const moveY = dy < 0 ? 1 : dy > 0 ? -1 : 0;
      this.isoX += moveX * this.speed * (delta / 1000);
      this.isoY += moveY * this.speed * (delta / 1000);
    } else {
      // WANDER: random direction
      this.state = 'idle';
      this.isoX += this.dirX * this.speed * (delta / 1000);
      this.isoY += this.dirY * this.speed * (delta / 1000);

      // Bounce at map edges (keep inside bounds)
      if (
        this.isoX < 0 || this.isoX > this.scene.mapW ||
        this.isoY < 0 || this.isoY > this.scene.mapH
      ) {
        this.dirX = Phaser.Math.Between(-1, 1);
        this.dirY = Phaser.Math.Between(-1, 1);
      }
    }

    // Convert iso coords → screen coords
    const tileW = this.scene.tileW,
          tileH = this.scene.tileH;
    this.x = (this.isoX - this.isoY) * (tileW / 2) + this.scene.offsetX;
    this.y = (this.isoX + this.isoY) * (tileH / 2) + this.scene.offsetY;
    this.setDepth(this.y);

    // Move the UI container directly above the sprite
    this.uiContainer
      .setPosition(this.x, this.y)
      .setDepth(this.depth + 1);
  }

  /**
   * Fade out on death, then drop loot and destroy.
   */
  playDeath() {
    const sceneRef = this.scene;

    // Fade both sprite and its UI container simultaneously
    sceneRef.tweens.add({
      targets: [ this, this.uiContainer ],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        // Drop 1–5 coins at isoX/isoY
        sceneRef.spawnLoot(
          this.isoX,
          this.isoY,
          'coin',
          Phaser.Math.Between(1, 5)
        );
        this.uiContainer.destroy();
        this.destroy();
      }
    });
  }
}
