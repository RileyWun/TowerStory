export class Slime extends Phaser.GameObjects.Sprite {
  constructor(scene, isoX, isoY, level = 1) {
    const tileW = scene.tileW;
    const tileH = scene.tileH;
    const offsetX = scene.offsetX;
    const offsetY = scene.offsetY;

    const worldX = (isoX - isoY) * (tileW / 2) + offsetX;
    const worldY = (isoX + isoY) * (tileH / 2) + offsetY;

    super(scene, worldX, worldY, 'slime');
    this.scene = scene;
    this.isoX = isoX;
    this.isoY = isoY;
    this.level = level;
    this.hp = level * 2;

    this.setOrigin(0.5, 1);
    this.setDepth(worldY);
    this.scene.add.existing(this);
    this.scene.physics.world.enable(this);
    this.body.setCollideWorldBounds(true);
    this.body.setAllowGravity(false);

    this.moveCooldown = 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    // Emit the enemy death event to the scene that owns this enemy
    this.scene.events.emit('enemyDied', this);

    // Optionally: spawn loot here or let the scene handle it
    this.destroy();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.moveCooldown -= delta;

    if (this.moveCooldown <= 0) {
      this.moveRandomly();
      this.moveCooldown = 1000; // 1 second cooldown between movements
    }
  }

  moveRandomly() {
    const dir = Phaser.Math.Between(0, 3);
    let newX = this.isoX;
    let newY = this.isoY;

    switch (dir) {
      case 0: newY--; break;
      case 1: newY++; break;
      case 2: newX--; break;
      case 3: newX++; break;
    }

    if (
      newX >= 0 && newX < this.scene.mapW &&
      newY >= 0 && newY < this.scene.mapH &&
      this.scene.floorData[newY][newX] &&
      !this.scene.collisionData[newY][newX]
    ) {
      this.isoX = newX;
      this.isoY = newY;
      const tileW = this.scene.tileW;
      const tileH = this.scene.tileH;
      const offsetX = this.scene.offsetX;
      const offsetY = this.scene.offsetY;
      const sx = (this.isoX - this.isoY) * (tileW / 2) + offsetX;
      const sy = (this.isoX + this.isoY) * (tileH / 2) + offsetY;
      this.setPosition(sx, sy).setDepth(sy);
    }
  }
}
