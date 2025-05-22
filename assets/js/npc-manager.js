export class NPCManager {
  constructor(scene) {
    this.scene = scene;
    this.npcs = [];
  }

  preload() {
    // If NPC-specific assets are needed, load here
  }

  /**
   * Spawn NPC sprites from Tiled objects and assign npcId
   */
  createFromObjects(objectLayer) {
    const { tileW, tileH, offsetX, offsetY } = this.scene;
    objectLayer
      .filter(o => o.type === 'NPC')
      .forEach(o => {
        const ix = o.x / tileW;
        const iy = o.y / tileH;
        const x = (ix - iy) * (tileW / 2) + offsetX;
        const y = (ix + iy) * (tileH / 2) + offsetY;
        const sprite = this.scene.add.image(x, y, 'npc')
          .setOrigin(0.5, 1)
          .setDepth(y)
          .setInteractive();

        // Read npcId property, fallback to numeric id
        const prop = (o.properties || []).find(p => p.name === 'npcId');
        sprite.npcId = prop ? prop.value : o.id;

        this.npcs.push(sprite);
      });
  }

  /**
   * Enable both key and click to trigger conversation
   */
  enableConversations(key = 'F', callback) {
    // Key press
    this.scene.input.keyboard.on(`keydown-${key}`, () => {
      const { x, y } = this.scene.player;
      this.npcs.forEach(npc => {
        if (Phaser.Math.Distance.Between(x, y, npc.x, npc.y) < 50) {
          callback(npc);
        }
      });
    });

    // Click/tap
    this.npcs.forEach(npc => {
      npc.on('pointerdown', () => {
        const { x, y } = this.scene.player;
        if (Phaser.Math.Distance.Between(x, y, npc.x, npc.y) < 50) {
          callback(npc);
        }
      });
    });
  }
}
