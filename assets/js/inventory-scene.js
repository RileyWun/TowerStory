export class InventoryScene extends Phaser.Scene {
  constructor(){
    super('InventoryScene');
  }

  init(data) {
    // data.playerInv is an array of item objects { id, iconKey, count, type, name, damage, defense }
    // data.chestInv   is either null (no chest) or an array of the chest's items in the same shape.
    this.playerInv = data.playerInv;
    this.chestInv  = data.chestInv || [];
    this.showChest = data.chestInv !== null;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // panel size:
    this.panelW = 300;
    this.panelH = this.showChest ? 400 : 300;
    const offsetX = (w - this.panelW) / 2;
    const offsetY = (h - this.panelH) / 2;

    // group to hold all UI graphics/text/icons:
    this.uiGroup = this.add.group();

    // --- Equip Slots at the very top of the panel ---

    // Weapon slot (left):
    this.weaponSlotRect = new Phaser.Geom.Rectangle(offsetX + 20, offsetY + 20, 64, 64);
    this.add.graphics()
      .lineStyle(2, 0xffffff)
      .strokeRectShape(this.weaponSlotRect)
      .setDepth(1);
    this.add.text(offsetX + 20, offsetY + 20 - 16, 'Weapon', { fontSize:'14px', fill:'#fff' });

    // Armor slot (right):
    this.armorSlotRect = new Phaser.Geom.Rectangle(offsetX + this.panelW - 84, offsetY + 20, 64, 64);
    this.add.graphics()
      .lineStyle(2,0xffffff)
      .strokeRectShape(this.armorSlotRect)
      .setDepth(1);
    this.add.text(offsetX + this.panelW - 84, offsetY + 20 - 16, 'Armor', { fontSize:'14px', fill:'#fff' });

    // If the player already has an equipped weapon, show its icon here:
    this.drawEquippedItems();

    // --- Inventory Grid (4 columns × 5 rows) below equip slots ---
    this.slotSize = 48;
    this.slotPadding = 10;
    this.invStartX = offsetX + 20;
    this.invStartY = offsetY + 100;

    // Precompute all 20 slot rectangles:
    this.invSlots = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 4; col++) {
        const x = this.invStartX + col * (this.slotSize + this.slotPadding);
        const y = this.invStartY + row * (this.slotSize + this.slotPadding);
        const rect = new Phaser.Geom.Rectangle(x, y, this.slotSize, this.slotSize);
        this.invSlots.push(rect);
        this.add.graphics()
          .lineStyle(2,0x999999)
          .strokeRectShape(rect);
      }
    }

    // Draw all inventory items into these slots:
    this.drawInventoryItems();

    // Make each item‐icon interactive and draggable:
    this.input.on('dragstart', (pointer, icon) => {
      icon.setScale(1.2);
      icon.setDepth(1000);
    });
    this.input.on('dragend', (pointer, icon, dropped) => {
      icon.setScale(1.0);
      if (!dropped) {
        // Return to its original slot if not dropped on a valid zone:
        icon.x = icon.origX;
        icon.y = icon.origY;
      }
    });

    this.input.on('drag', (pointer, icon, dragX, dragY) => {
      icon.x = dragX;
      icon.y = dragY;
    });

    // Define three drop zones: weaponSlotRect, armorSlotRect, and all invSlots
    this.input.setDraggable(this.uiGroup.getChildren().filter(ch => ch.getData('draggable')));
    
    // Overlaps with weapon slot:
    this.input.on('drop', (pointer, icon, dropZone) => {
      const data = icon.getData('itemData');
      // If dropped onto the weapon slot & item.type==='weapon'
      if (dropZone === this.weaponZone && data.type === 'weapon') {
        this.equipItem(data, 'weapon', icon);
      }
      // If dropped onto the armor slot & item.type==='armor'
      else if (dropZone === this.armorZone && data.type === 'armor') {
        this.equipItem(data, 'armor', icon);
      }
      else {
        // find which inventory slot rectangle it was dropped into
        const droppedIdx = this.invSlots.findIndex(rc => Phaser.Geom.Rectangle.Contains(rc, icon.x, icon.y));
        if (droppedIdx >= 0) {
          // Snap icon into that inventory slot
          const rect = this.invSlots[droppedIdx];
          icon.x = rect.centerX;
          icon.y = rect.centerY;
          icon.origX = icon.x;
          icon.origY = icon.y;

          // update inventory array so that item stays in that slot
          this.playerInv[data.invIndex] = data; 
        } else {
          // Invalid drop: return to original
          icon.x = icon.origX;
          icon.y = icon.origY;
        }
      }
    });

    // Create invisible input zones over the equipment rectangles:
    this.weaponZone = this.add.zone(
      this.weaponSlotRect.x + 32,
      this.weaponSlotRect.y + 32,
      this.weaponSlotRect.width,
      this.weaponSlotRect.height
    ).setRectangleDropZone(this.weaponSlotRect.width, this.weaponSlotRect.height);

    this.armorZone = this.add.zone(
      this.armorSlotRect.x + 32,
      this.armorSlotRect.y + 32,
      this.armorSlotRect.width,
      this.armorSlotRect.height
    ).setRectangleDropZone(this.armorSlotRect.width, this.armorSlotRect.height);

    // A “backdrop” so that ESC or I closes the window:
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-I',   () => this.close());
  }

  // Draw the currently equipped weapon & armor icons (if any):
  drawEquippedItems() {
    // Clear previous equip sprites, if any:
    if (this.weaponSprite) this.weaponSprite.destroy();
    if (this.armorSprite)  this.armorSprite.destroy();

    const main = this.scene.get('Main');
    const player = main.player;

    // Draw weapon slot icon:
    if (player.equipment.weapon) {
      this.weaponSprite = this.add.image(
        this.weaponSlotRect.centerX,
        this.weaponSlotRect.centerY,
        player.equipment.weapon.iconKey
      ).setDisplaySize(40, 40);
      // Mark it as “draggable:” 
      this.weaponSprite.setData('draggable', true);
      this.weaponSprite.setData('itemData', {
        ...player.equipment.weapon,
        isEquipped: true 
      });
      // store inventory index = -1 to differentiate
      this.weaponSprite.setData('invIndex', -1);
      this.input.setDraggable(this.weaponSprite);
      this.weaponSprite.origX = this.weaponSlotRect.centerX;
      this.weaponSprite.origY = this.weaponSlotRect.centerY;
    }

    // Draw armor slot icon:
    if (player.equipment.armor) {
      this.armorSprite = this.add.image(
        this.armorSlotRect.centerX,
        this.armorSlotRect.centerY,
        player.equipment.armor.iconKey
      ).setDisplaySize(40, 40);
      this.armorSprite.setData('draggable', true);
      this.armorSprite.setData('itemData', {
        ...player.equipment.armor,
        isEquipped: true
      });
      this.armorSprite.setData('invIndex', -1);
      this.input.setDraggable(this.armorSprite);
      this.armorSprite.origX = this.armorSlotRect.centerX;
      this.armorSprite.origY = this.armorSlotRect.centerY;
    }
  }

  // Draw every item in playerInv into its grid slot:
  drawInventoryItems() {
    // Clear previous icons:
    if (this.itemIcons) {
      this.itemIcons.forEach(ic => ic.destroy());
    }
    this.itemIcons = [];

    this.playerInv.forEach((item, idx) => {
      if (!item || item.count <= 0) return; // empty slot

      const rect = this.invSlots[idx];
      const icon = this.add.image(rect.centerX, rect.centerY, item.iconKey)
        .setDisplaySize(this.slotSize - 4, this.slotSize - 4);
      icon.setData('draggable', true);
      icon.setData('itemData', { ...item, invIndex: idx });
      icon.setInteractive();
      this.input.setDraggable(icon);

      // store its “resting” position so we can snap back if drop fails:
      icon.origX = rect.centerX;
      icon.origY = rect.centerY;

      // Draw stack count if > 1
      if (item.count > 1) {
        this.add.text(
          rect.centerX + (this.slotSize/2 - 8),
          rect.centerY + (this.slotSize/2 - 8),
          `${item.count}`, { fontSize:'14px', fill:'#fff' }
        ).setOrigin(1);
      }

      this.itemIcons.push(icon);
    });
  }

  // Called when a weapon/armor icon is dropped onto its slot:
  equipItem(itemData, slotType, iconSprite) {
    const main   = this.scene.get('Main');
    const player = main.player;

    // 1) If slot already occupied, first unequip old item:
    if (player.equipment[slotType]) {
      const old = player.equipment[slotType];
      // return old item back to inventory array in the first empty slot:
      const emptyIndex = this.playerInv.findIndex(i => !i || i.count === 0);
      if (emptyIndex >= 0) {
        this.playerInv[emptyIndex] = old;
      } else {
        // no empty slot—push onto end (could overflow)
        this.playerInv.push(old);
      }
    }

    // 2) Equip the new item:
    const newItem = { ...itemData };
    delete newItem.isEquipped;
    delete newItem.invIndex;
    player.equipment[slotType] = newItem;

    // 3) Remove that item from inventory array (set count=0)
    if (itemData.invIndex >= 0) {
      this.playerInv[itemData.invIndex].count = 0;
    }

    // 4) Refresh stats
    player.refreshPlayerStats();

    // 5) Redraw everything
    this.redraw();
  }

  // Re-draw both equipment slots and inventory grid:
  redraw() {
    // Clear all children in uiGroup (icons/text). Then redraw:
    this.uiGroup.clear(true, true);

    // Redraw equipment slots:
    this.drawEquippedItems();

    // Redraw inventory grid icons:
    this.drawInventoryItems();
  }

  close() {
    // Pass back the updated inventory to MainScene:
    this.scene.events.emit('inventoryClosed', { playerInv: this.playerInv });
    this.scene.stop('InventoryScene');
    this.scene.resume('Main');
  }
}
