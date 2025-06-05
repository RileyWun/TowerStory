// assets/js/enemy.js

export class Slime extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} isoX   – isometric X coordinate
   * @param {number} isoY   – isometric Y coordinate
   * @param {string} texture – key for the slime image
   * @param {number} level   – integer level (affects HP, damage, loot)
   */
  constructor(scene, isoX, isoY, texture, level = 1) {
    super(scene);
    this.scene = scene;
    this.isoX = isoX;
    this.isoY = isoY;
    this.level = level;

    // Basic stats:
    this.maxHp = 5 * level;
    this.hp    = this.maxHp;
    this.speed = 50 + (level * 10); // px/sec
    this.state = 'idle';

    // Convert isometric coords → screen (x, y):
    const px = (isoX - isoY) * (scene.tileW / 2) + scene.offsetX;
    const py = (isoX + isoY) * (scene.tileH / 2) + scene.offsetY;

    // Add the slime sprite:
    this.sprite = scene.add.sprite(0, 0, texture);
    this.sprite.setOrigin(0.5, 1);
    this.add(this.sprite);

    // Health bar graphics:
    this.barBg = scene.add.rectangle(0, -this.sprite.height - 10, 40, 6, 0x000000, 0.6)
      .setOrigin(0.5, 0.5);
    this.barFill = scene.add.rectangle(
      -20,
      -this.sprite.height - 10,
      40,
      6,
      0xff0000,
      1
    ).setOrigin(0, 0.5);
    this.add(this.barBg);
    this.add(this.barFill);

    // Name and level text:
    this.nameTag = scene.add.text(
      0, 
      -this.sprite.height - 22,
      `Slime - Lvl ${level}`,
      { fontSize:'12px', fill:'#fff', stroke:'#000', strokeThickness:2 }
    ).setOrigin(0.5, 0.5);
    this.add(this.nameTag);

    // Container position & depth:
    this.setPosition(px, py);
    this.setDepth(py);

    // Enable physics body for overlap checks & movement:
    scene.physics.world.enable(this);
    this.body.setSize( this.sprite.width, this.sprite.height * 0.5 );
    this.body.setOffset( -this.sprite.width/2, -this.sprite.height );

    // Add to scene:
    scene.add.existing(this);
  }

  /**
   * Called by MainScene.update() each tick.
   * Contains simple wander + follow logic.
   */
  update(time, delta) {
    const player = this.scene.player;
    if (!player) return;

    const distToPlayer = Phaser.Math.Distance.Between(
      this.x, this.y, player.x, player.y
    );

    const aggroRange = 100;
    if (distToPlayer < aggroRange && this.state !== 'dead') {
      // Pursue player:
      this.state = 'chase';
      this.scene.physics.moveToObject(
        this, 
        player, 
        this.speed
      );
    } else if (this.state === 'chase') {
      // Retreat if too close:
      if (distToPlayer < 30) {
        // Move away from player
        const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
        this.body.setVelocity(
          Math.cos(angle) * this.speed,
          Math.sin(angle) * this.speed
        );
      } else {
        // Stop if out of aggro range
        this.body.setVelocity(0);
        this.state = 'idle';
      }
    } else {
      // Random wander:
      if (this.state === 'idle') {
        if (!this.idleTimer || time > this.idleTimer) {
          this.state = 'wander';
          this.idleTimer = time + Phaser.Math.Between(2000, 5000);
          this.wanderAngle = Phaser.Math.FloatBetween(0, Math.PI*2);
          this.wanderDuration = Phaser.Math.Between(1000, 2000);
        }
      } else if (this.state === 'wander') {
        // Move in wanderAngle direction for wanderDuration:
        this.body.setVelocity(
          Math.cos(this.wanderAngle) * this.speed * 0.5,
          Math.sin(this.wanderAngle) * this.speed * 0.5
        );
        if (time > this.idleTimer - (this.wanderDuration || 0)) {
          this.state = 'idle';
          this.body.setVelocity(0);
        }
      }
    }

    // Update depth as Y changes:
    this.setDepth(this.y);

    // Update health bar length:
    const hpPct = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.barFill.width = 40 * hpPct;
  }

  /**
   * Called externally when the Slime takes damage.
   */
  takeDamage(amount) {
    if (this.state === 'dead') return;

    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.playDeath();
    }
  }

  /**
   * Fade out, drop 2–5 coins, then destroy everything.
   */
  playDeath() {
    this.state = 'dead';
    this.body.setVelocity(0, 0);
    this.body.enable = false;

    this.scene.tweens.add({
      targets: [ this, this.barBg, this.barFill, this.nameTag ],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        // Drop 2–5 coins at this isoX, isoY:
        const dropCount = Phaser.Math.Between(2, 5);
        this.scene.spawnLoot(this.isoX, this.isoY, 'coin', dropCount);

        // Destroy all sub‐objects:
        this.barBg.destroy();
        this.barFill.destroy();
        this.nameTag.destroy();
        this.sprite.destroy();
        this.destroy();
      }
    });
  }
}
