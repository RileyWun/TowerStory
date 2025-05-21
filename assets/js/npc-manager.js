export class NPCManager {
  constructor(scene) {
    this.scene = scene;
    this.npcs = [];
  }

  /**
   * (Optional) Preload any NPC-specific assets here.
   */
  preload() {
    // e.g. this.scene.load.spritesheet('npcTypeA', 'assets/npcs/typeA.png', { frameWidth:64, frameHeight:64 });
  }

  /**
   * Spawn NPC sprites from a Tiled object layer, reading their `npcId` property.
   * @param {array} objectLayer - map.getObjectLayer('Objects').objects
   */
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
        // Attach the Tiled `npcId` property or fallback to object `id`
        const prop = (o.properties || []).find(p => p.name === 'npcId');
        sprite.npcId = prop && prop.value ? prop.value : o.id;
        this.npcs.push(sprite);
      });
  }

  /**
   * Bind a key (default 'F') to trigger conversations when near an NPC.
   * @param {string} key - keyboard key for interaction
   * @param {function} callback - fired with the NPC sprite when in range
   */
  enableConversations(key = 'F', callback) {
    // Keyboard interaction
    this.scene.input.keyboard.on(`keydown-${key}`, () => {
      const { x, y } = this.scene.player;
      this.npcs.forEach(npc => {
        if (Phaser.Math.Distance.Between(x, y, npc.x, npc.y) < 50) {
          callback(npc);
        }
      });
    });
    // Click / pointer interaction
    this.npcs.forEach(npc => {
      npc.on('pointerdown', () => {
        const { x, y } = this.scene.player;
        if (Phaser.Math.Distance.Between(x, y, npc.x, npc.y) < 50) {
          callback(npc);
        }
      });
    });
  }
