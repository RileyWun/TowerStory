// Modified equipment-scene.js
// Adds weapon slot, accepts drag-and-drop, shows equipped item

import { Scene } from 'phaser';

export class EquipmentScene extends Scene {
  constructor() {
    super({ key: 'EquipmentScene' });
  }

  init(data) {
    this.equipment = data.equipment || {}; // { weapon: {iconKey, name, ...} }
  }

  create() {
    this.createWeaponSlot();
    this.input.keyboard.once('keydown-ESC', () => this.close());
  }

  createWeaponSlot() {
    const x = this.scale.width / 2 - 32;
    const y = this.scale.height / 2 - 32;
    const slotSize = 64;

    const slot = this.add.rectangle(x, y, slotSize, slotSize, 0x444444)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ dropZone: true })
      .setData('slotType', 'weapon');

    // Display equipped weapon if any
    if (this.equipment.weapon) {
      const item = this.equipment.weapon;
      const icon = this.add.image(x, y, item.iconKey)
        .setDisplaySize(48, 48)
        .setData('item', item)
        .setInteractive({ draggable: true });

      icon.on('drag', (pointer, dragX, dragY) => {
        icon.x = dragX; icon.y = dragY;
      });

      icon.on('dragend', (pointer, dragX, dragY) => {
        // Optional: Drop to unequip or swap
      });
    }

    this.input.on('drop', (pointer, gameObject, dropZone) => {
      if (!gameObject.getData) return;
      const item = gameObject.getData('item');
      if (item.type === dropZone.getData('slotType')) {
        this.scene.get('Main').equipItem(item);
        this.scene.stop('EquipmentScene');
      }
    });
  }

  close() {
    this.scene.stop('EquipmentScene');
    this.scene.resume('Main');
  }
}
