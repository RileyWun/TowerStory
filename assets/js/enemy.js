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
    // Convert (isoX, isoY) → on‐screen (x, y)
    const tileW = scene.tileW, tileH = scene.tileH;
    const screenX = (isoX - isoY) * (tileW / 2) + scene.offsetX;
    const screenY = (isoX + isoY) * (tileH / 2) + scene.offsetY;

    super(scene, screenX, screenY, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.scene    = scene;
    this.isoX     = isoX;
    this.isoY     = isoY;
    this.setOrigin(0.5, 1);
    this.setDepth(this.y);

    // Enemy stats & level
    this.level  = level;
    this.maxHp  = 5 * level;
    this.hp     = this.maxHp;
    this.speed  = 1 + 0.2 * level;
    this.state  = 'idle';

    // Build a simple health bar above the slime
    this.healthContainer = scene.add.container(this.x, this.y - this.height - 10);
    this.healthBarBg = scene.add
      .rectangle(0, 0, 40, 6, 0x000000)
      .setOrigin(0.5);
    this.healthBar = scene.add
      .rectangle(-20, 0, 40, 6, 0xff0000)
      .setOrigin(0, 0.5);
    this.healthContainer.add([ this.healthBarBg, this.healthBar ]);
    this.healthContainer.setDepth(this.depth + 1).setVisible(false);

    // Pick an initial random roam direction
    this.dirX = Phaser.Math.Between(-1, 1);
    this.dirY = Phaser.Math.Between(-1, 1);

    // Allow collisions against world bounds if desired
    this.body.setCollideWorldBounds(true);
  }

  /**
   * Inflict damage on this enemy. If hp ≤ 0, play death sequence.
   */
  takeDamage(amount) {
    if (this.state === 'dead') {
      return;
    }

    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      this.playDeath();
    } else {
      // Show health bar briefly when hurt
      this.healthContainer.setVisible(true);
      this.updateHealthBar();
    }
  }

  /**
   * Called every frame by MainScene.update(…).
   */
  update(time, delta) {
    if (this.state === 'dead') {
      return;
    }

    // Simple AI: if player is nearby, move toward them; otherwise wander
    const player = this.scene.player;
    const dx = this.isoX - this.scene.playerIsoX;
    const dy = this.isoY - this.scene.playerIsoY;
    const manDist = Math.abs(dx) + Math.abs(dy);

    if (manDist < 3) {
      // “Attack” state—move toward player
      this.state = 'attack';
      const moveX = dx < 0 ? 1 : dx > 0 ? -1 : 0;
      const moveY = dy < 0 ? 1 : dy > 0 ? -1 : 0;
      this.isoX += moveX * this.speed * (delta / 1000);
      this.isoY += moveY * this.speed * (delta / 1000);
    } else {
      // “Idle” / wander
      this.state = 'idle';
      this.isoX += this.dirX * this.speed * (delta / 1000);
      this.isoY += this.dirY * this.speed * (delta / 1000);
      // Bounce off edges and pick new random direction if out‐of‐bounds
      if (
        this.isoX < 0 || this.isoX > this.scene.mapW ||
        this.isoY < 0 || this.isoY > this.scene.mapH
      ) {
        this.dirX = Phaser.Math.Between(-1, 1);
        this.dirY = Phaser.Math.Between(-1, 1);
      }
    }

    // Update screen position each frame
    const tileW = this.scene.tileW, tileH = this.scene.tileH;
    this.x = (this.isoX - this.isoY) * (tileW / 2) + this.scene.offsetX;
    this.y = (this.isoX + this.isoY) * (tileH / 2) + this.scene.offsetY;
    this.setDepth(this.y);

    // Move health bar container above the sprite
    this.healthContainer
      .setPosition(this.x, this.y - this.height - 10)
      .setDepth(this.depth + 1);
  }

  /**
   * Update the red‐bar width based on current hp.
   */
  updateHealthBar() {
    const pct = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.healthBar.width = 40 * pct;
  }

  /**
   * On death, fade out both sprite and health container,
   * then spawn loot and destroy them.
   */
  playDeath() {
    // Capture scene reference in a local variable
    const sceneRef = this.scene;

    sceneRef.tweens.add({
      targets: [ this, this.healthContainer ],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        // Spawn 1–5 coins at this slime’s iso coordinates
        sceneRef.spawnLoot(
          this.isoX,
          this.isoY,
          'coin',
          Phaser.Math.Between(1, 5)
        );
        this.healthContainer.destroy();
        this.destroy();
      }
    });
  }
}
