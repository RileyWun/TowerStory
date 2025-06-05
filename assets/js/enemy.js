// assets/js/enemy.js

/**
 * Slime class:
 * - Roams in a 64×64 px square around its spawn point
 * - If the player is within a certain distance, it chases/attacks
 * - When killed, drops 2–5 coins that the player can pick up
 * - Displays a health bar and “Slime – Lvl X” above itself when active
 */

export class Slime extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} isoX  – tile X coord
   * @param {number} isoY  – tile Y coord
   * @param {number} level – slime level (determines HP, damage)
   */
  constructor(scene, isoX, isoY, level = 1) {
    super(scene, 0, 0);

    this.scene = scene;
    this.isoX = isoX;
    this.isoY = isoY;
    this.level = level;
    this.maxHP = 5 + level * 5;
    this.hp = this.maxHP;
    this.damage = 1 + level; // example scaling

    // Convert isometric coords into world (screen) coords
    const worldX = (isoX - isoY) * (scene.tileW / 2) + scene.offsetX;
    const worldY = (isoX + isoY) * (scene.tileH / 2) + scene.offsetY;

    // Create the slime sprite
    this.sprite = scene.add.sprite(0, 0, 'slime');
    this.sprite.setDisplaySize(32, 32);
    this.add(this.sprite);

    // Create a health bar (simple red/green), initially hidden
    this.healthBarBg = scene.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.5);
    this.healthBarBg.fillRect(-16, -24, 32, 6);
    this.healthBarBg.setVisible(false);
    this.add(this.healthBarBg);

    this.healthBar = scene.add.graphics();
    this.healthBar.fillStyle(0x00ff00, 1);
    this.healthBar.fillRect(-16, -24, 32 * (this.hp / this.maxHP), 6);
    this.healthBar.setVisible(false);
    this.add(this.healthBar);

    // Name and level text
    this.nameText = scene.add.text(0, -36, `Slime - Lvl ${this.level}`, {
      fontSize: '12px',
      fill: '#fff'
    }).setOrigin(0.5);
    this.nameText.setVisible(false);
    this.add(this.nameText);

    // Add physics body to container
    scene.physics.world.enable(this);
    this.body.setSize(32, 32);
    this.body.setAllowGravity(false);

    // Place container at correct world coords
    this.setPosition(worldX, worldY);
    this.setDepth(worldY);

    scene.add.existing(this);

    // State machine variables
    this.state = 'idle'; // 'idle', 'chase', 'retreat'
    this.idleTimer = 0;
    this.chaseSpeed = 30 + level * 5;
    this.roamRange = 64; // px in each direction from origin
    this.originX = worldX;
    this.originY = worldY;

    // Add to the update list
    this.scene.events.on('update', this.update, this);

    // On death animation complete, drop loot
    this.sprite.on('animationcomplete', (anim) => {
      if (anim.key === 'slime-die') {
        const randCoins = Phaser.Math.Between(2, 5);
        scene.spawnLoot(this.x, this.y, 'coin', randCoins);
        this.destroy();
      }
    });

    // set interactive to be clickable
    this.setSize(32, 32);
    this.setInteractive(new Phaser.Geom.Rectangle(-16, -32, 32, 48), Phaser.Geom.Rectangle.Contains);
    this.on('pointerdown', () => {
      // allow clicking as well as pointerdown to damage (if in range)
      this.takeDamage(1);
    });
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.healthBarBg.setVisible(false);
      this.healthBar.setVisible(false);
      this.nameText.setVisible(false);
      // play death anim
      this.sprite.play('slime-die', true);
    } else {
      // update health bar width
      this.healthBar.clear();
      this.healthBar.fillStyle(0x00ff00, 1);
      this.healthBar.fillRect(-16, -24, 32 * (this.hp / this.maxHP), 6);
    }
  }

  update(time, delta) {
    // Always face “down” (no direction change placeholder)
    if (this.hp <= 0) return;

    const player = this.scene.player;
    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Show HP bar + nameText if player is somewhat near
    if (distToPlayer < 150) {
      this.healthBarBg.setVisible(true);
      this.healthBar.setVisible(true);
      this.nameText.setVisible(true);
    } else {
      this.healthBarBg.setVisible(false);
      this.healthBar.setVisible(false);
      this.nameText.setVisible(false);
    }

    // Simple AI:
    if (distToPlayer < 100) {
      // chase
      this.state = 'chase';
    } else if (distToPlayer < 40) {
      // retreat
      this.state = 'retreat';
    } else {
      // idle roam
      this.state = 'idle';
    }

    // Move based on state
    if (this.state === 'chase') {
      scene.physics.moveToObject(this, player, this.chaseSpeed);
    } else if (this.state === 'retreat') {
      // pick a random point away from player but near origin
      const awayX = this.originX + Phaser.Math.Between(-this.roamRange, this.roamRange);
      const awayY = this.originY + Phaser.Math.Between(-this.roamRange, this.roamRange);
      scene.physics.moveTo(this, awayX, awayY, this.chaseSpeed);
    } else {
      // idle: small random jitter around origin
      this.idleTimer -= delta;
      if (this.idleTimer <= 0) {
        this.idleTimer = Phaser.Math.Between(1000, 3000);
        const randX = this.originX + Phaser.Math.Between(-this.roamRange, this.roamRange);
        const randY = this.originY + Phaser.Math.Between(-this.roamRange, this.roamRange);
        scene.physics.moveTo(this, randX, randY, 20 + this.level * 2);
      }
    }

    // Update container depth so it sorts properly
    this.setDepth(this.y);

    // update healthBar / nameText positions if needed
    this.healthBarBg.setPosition(0, 0);
    this.healthBar.setPosition(0, 0);
    this.nameText.setPosition(0, -36);
  }
}

// Create the slime animations at a global level (once)
Phaser.Animations.AnimationManager.prototype.generateSlimeAnims = function(scene) {
  // idle / move (same frame)
  scene.anims.create({
    key: 'slime-idle',
    frames: [{ key: 'slime', frame: 0 }],
    frameRate: 1,
    repeat: -1
  });
  // die animation (assuming 4 frames in your slime.png, else adjust)
  scene.anims.create({
    key: 'slime-die',
    frames: scene.anims.generateFrameNumbers('slime', { start:0, end:3 }),
    frameRate: 8,
    repeat: 0
  });
};

// Hook into any scene that might load this file
Phaser.Scene.prototype.events.once('create', function() {
  if (this.textures.exists('slime')) {
    this.anims.generateSlimeAnims(this);
  }
}, this);
