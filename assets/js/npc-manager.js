export class NPCManager {
  constructor(scene) {
    this.scene = scene;
    this.npcs = [];
  }

  preload() {
    // If different NPCs have unique spritesheets, load them here.
    // e.g. this.scene.load.spritesheet('npcTypeA', 'assets/npcs/typeA.png', { frameWidth:64, frameHeight:64 });
  }

  createFromObjects(objectLayer) {
    const { tileW, tileH, offsetX, offsetY } = this.scene;
    objectLayer
      .filter(o => o.type === 'NPC')
      .forEach(o => {
        const ix = o.x / tileW;
        const iy = o.y / tileH;
        const sx = (ix - iy) * (tileW / 2) + offsetX;
        const sy = (ix + iy) * (tileH / 2) + offsetY;
        const sprite = this.scene.add
          .image(sx, sy, 'npc')
          .setOrigin(0.5, 1)
          .setDepth(sy)
          .setInteractive();
        this.npcs.push(sprite);
      });
  }

  enableConversations(key = 'F', callback) {
    this.scene.input.keyboard.on(`keydown-${key}`, () => {
      const { x, y } = this.scene.player;
      this.npcs.forEach(npc => {
        if (Phaser.Math.Distance.Between(x, y, npc.x, npc.y) < 50) {
          callback(npc);
        }
      });
    });
  }
}
