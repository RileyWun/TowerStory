// assets/js/enemy.js

export class Enemy extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} isoX - isometric X coordinate
   * @param {number} isoY - isometric Y coordinate
   * @param {string} texture - key of the spriteatlas / spritesheet
   * @param {number} level - slime level
   */
  constructor(scene, isoX, isoY, texture, level = 1) {
    super(scene);

    this.scene   = scene;
    this.isoX    = isoX;
    this.isoY    = isoY;
    this.texture = texture;
    this.level   = level;

    // Derived stats
    this.maxHp = 5 * level;
    this.hp    = this.maxHp;
    this.speed = 1 + 0.2 * level;
    this.state = 'idle';

    // Convert isometric coords to screen coords
    const tileW = scene.tileW, tileH = scene.tileH;
    const px = (isoX - isoY) * (tileW/2) + scene.offsetX;
    const py = (isoX + isoY) * (tileH/2) + scene.offsetY;

    // 1) The actual sprite
    this.sprite = scene.add.sprite(0, 0, texture)
      .setOrigin(0.5, 1);

    // 2) Name + Level text above
    this.nameText = scene.add.text(0, -48, `Slime - Lvl ${level}`, {
      fontSize: '12px', fill: '#fff', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);

    // 3) Health bar graphics container
    this.healthBarBG = scene.add.graphics();
    this.healthBarFG = scene.add.graphics();

    // Draw initial healthbar
    this.drawHealthBar();

    // 4) Combine into this container
    this.add([ this.sprite, this.nameText, this.healthBarBG, this.healthBarFG ]);
    this.setPosition(px, py);
    this.setDepth(py);

    // 5) Add to scene & physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Slightly smaller hitbox
    this.body.setSize(16, 12).setOffset(-8, -12);

    // Register in NPCManager
    if (!scene.npcManager.enemies) {
      scene.npcManager.enemies = [];
    }
    scene.npcManager.enemies.push(this);

    // Convenience reference for the UI container
    this.uiContainer = scene.add.container(px, py - 60, [ this.nameText, this.healthBarBG, this.healthBarFG ]);
    this.uiContainer.setDepth(py + 1);

    // Flail tween for idle
    scene.tweens.add({
      targets: this,
      y: this.y - 4,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.state = 'idle';
  }

  /** Redraw health bar background and fill */
  drawHealthBar() {
    const barW = 40, barH = 6;
    this.healthBarBG.clear();
    this.healthBarBG.fillStyle(0x000000, 0.6);
    this.healthBarBG.fillRect(-barW/2, -40, barW, barH);

    this.healthBarFG.clear();
    this.healthBarFG.fillStyle(0xff0000, 1);
    const pct = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.healthBarFG.fillRect(-barW/2 + 1, -40 + 1, (barW - 2) * pct, barH - 2);
  }

  /** Called every frame from Scene.update (if you hook it in) */
  update(time, delta) {
    // If dead, skip movement
    if (this.state === 'dead') return;

    // Simple roam AI: if player is within detection radius, chase
    const px = this.scene.player.x, py = this.scene.player.y;
    const dx = px - this.x, dy = py - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 200 && this.state !== 'attacking') {
      // Move toward player
      this.state = 'chasing';
      const angle = Math.atan2(dy, dx);
      const vx = Math.cos(angle) * this.speed;
      const vy = Math.sin(angle) * this.speed;
      this.body.setVelocity(vx, vy);
    } else {
      // Idle / roam
      this.state = 'idle';
      this.body.setVelocity(0, 0);
    }

    // Update screen position & depth
    const tileW = this.scene.tileW, tileH = this.scene.tileH;
    const isoX = this.isoX, isoY = this.isoY;
    // Optionally update isoX/isoY from actual x,y if you want true iso reproduction.

    // Ensure UI (health/name) stays above sprite
    this.uiContainer.setPosition(this.x, this.y - this.sprite.height);
    this.uiContainer.setDepth(this.y + 1);
  }

  /** Called when taking damage */
  takeDamage(amount) {
    if (this.state === 'dead') return;
    this.hp = Phaser.Math.Clamp(this.hp - amount, 0, this.maxHp);
    this.drawHealthBar();
    if (this.hp <= 0) {
      this.state = 'dead';
      this.playDeath();
    }
  }

  /** Fade out, drop 2–5 coins, then destroy */
  playDeath() {
    const sceneRef = this.scene;
    sceneRef.tweens.add({
      targets: [ this, this.uiContainer ],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        // Drop 2–5 coins
        const dropCount = Phaser.Math.Between(2, 5);
        sceneRef.spawnLoot(this.isoX, this.isoY, 'coin', dropCount);

        this.uiContainer.destroy();
        this.destroy();
      }
    });
  }
}
