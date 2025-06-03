/**
 * InventoryScene handles both the player's inventory and a chest inventory.
 * 
 * It displays two panels (player on the left, chest on the right if provided), plus
 * two “equipment” slots (Weapon / Armor) at the top. It supports drag-and-drop
 * between player slots and chest slots, and emits an event back to MainScene
 * when the player closes the UI so that MainScene can update its own data.
 */

export class InventoryScene extends Phaser.Scene {
  constructor() {
    super('InventoryScene');
  }

  /**
   * data: { playerInv: [ {iconKey, count}, … ],
   *         chestInv: [ {iconKey, count}, … ] } 
   * 
   * If chestInv is null, we only show the left (player) side.
   */
  init(data) {
    this.playerInv = data.playerInv || [];     // Array of { iconKey: string, count: number }
    this.chestInv  = data.chestInv  || [];     // If there is a chest, it’s same shape
    this.showChest = data.chestInv != null;    // showChest = true iff chestInv was provided

    // For equipment slots, we track which item (by index in playerInv array) is equipped:
    //   this.equipped.weaponIndex  = index into playerInv OR null
    //   this.equipped.armorIndex   = index into playerInv OR null
    this.equipped = {
      weaponIndex: null,
      armorIndex:  null
    };

    // We’ll also track the “draggedItem” being dragged
    this.draggedItem = null;   // { from: 'player'|'chest'|'weapon'|'armor', invIndex: number }
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Panel dimensions
    this.panelW = 200;
    this.panelH = 300;

    // Top “Equipment” boxes (weapon & armor)
    this.equipBoxSize = 48; 
    this.equipPadding = 20;
    this.equipY = 50;  // Y coordinate of top of equipment area

    // Left panel for player inventory
    this.leftPanel = new Phaser.Geom.Rectangle(
      this.equipPadding,
      this.equipY + this.equipBoxSize + 20,  // leave space for equip boxes above
      this.panelW,
      this.panelH
    );

    // If we have a chest, create a right panel
    if (this.showChest) {
      this.rightPanel = new Phaser.Geom.Rectangle(
        w - this.equipPadding - this.panelW,
        this.equipY + this.equipBoxSize + 20,
        this.panelW,
        this.panelH
      );
    }

    // Container group for all rendered UI elements (so we can clear/re-draw easily)
    this.uiGroup = this.add.group();

    // Create draggable zones at the top of each panel (title bars)
    // Player-side title bar
    this.leftZone = this.add.zone(
      this.leftPanel.x,
      this.leftPanel.y,
      this.leftPanel.width,
      20
    ).setOrigin(0).setInteractive({ draggable: true });
    // Chest-side title bar (if present)
    if (this.showChest) {
      this.rightZone = this.add.zone(
        this.rightPanel.x,
        this.rightPanel.y,
        this.rightPanel.width,
        20
      ).setOrigin(0).setInteractive({ draggable: true });
    }

    // Enable drag for these zones
    const draggableZones = [ this.leftZone ];
    if (this.showChest) {
      draggableZones.push(this.rightZone);
    }
    this.input.setDraggable(draggableZones);

    // Drag handlers
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      // If dragging the player panel’s title bar:
      if (gameObject === this.leftZone) {
        this.leftPanel.x = dragX;
        this.leftZone.x  = dragX;
        this.leftPanel.y = dragY;
        this.leftZone.y  = dragY;
        this.redraw();
      }
      // If dragging the chest panel’s title bar:
      else if (this.showChest && gameObject === this.rightZone) {
        this.rightPanel.x = dragX;
        this.rightZone.x  = dragX;
        this.rightPanel.y = dragY;
        this.rightZone.y  = dragY;
        this.redraw();
      }
    });

    this.input.on('dragend', this.onDragEnd, this);

    // Close inventory UI on ESC or I
    this.input.keyboard.once('keydown-ESC', () => this.close());
    this.input.keyboard.once('keydown-I',   () => this.close());

    // Finally, draw everything
    this.redraw();
  }

  /**
   * Clean up & redraw both panels (player & chest), plus equipment boxes.
   */
  redraw() {
    // Clear out previous drawings
    this.uiGroup.clear(true, true);

    // Draw a semi-transparent black backdrop behind panels
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    // Draw a big rectangle behind both panels
    const totalWidth = this.showChest
      ? (this.rightPanel.x + this.rightPanel.width) - this.leftPanel.x
      : (this.leftPanel.x + this.leftPanel.width) - this.leftPanel.x;
    bg.fillRect(
      this.leftPanel.x - 10,
      this.leftPanel.y - 10,
      totalWidth + 20,
      this.leftPanel.height + 20
    );
    this.uiGroup.add(bg);

    // Draw left panel border / background
    const leftBg = this.add.graphics();
    leftBg.lineStyle(2, 0xffffff);
    leftBg.strokeRectShape(this.leftPanel);
    this.uiGroup.add(leftBg);

    // Draw “Inventory” title over left panel’s title bar
    const leftTitle = this.add.text(
      this.leftPanel.x + 10,
      this.leftPanel.y,
      'Inventory',
      { fontSize: '16px', fill: '#fff' }
    );
    this.uiGroup.add(leftTitle);

    // If we show a chest panel, draw it
    if (this.showChest) {
      const rightBg = this.add.graphics();
      rightBg.lineStyle(2, 0xffffff);
      rightBg.strokeRectShape(this.rightPanel);
      this.uiGroup.add(rightBg);

      const rightTitle = this.add.text(
        this.rightPanel.x + 10,
        this.rightPanel.y,
        'Chest',
        { fontSize: '16px', fill: '#fff' }
      );
      this.uiGroup.add(rightTitle);
    }

    // Draw equipment slots (two boxes for Weapon + Armor)
    // Weapon slot
    const weaponBox = new Phaser.Geom.Rectangle(
      this.leftPanel.x,
      this.equipY,
      this.equipBoxSize,
      this.equipBoxSize
    );
    const weaponBg = this.add.graphics();
    weaponBg.lineStyle(2, 0xffff00);
    weaponBg.strokeRectShape(weaponBox);
    this.uiGroup.add(weaponBg);

    const weaponText = this.add.text(
      this.leftPanel.x + this.equipBoxSize + 5,
      this.equipY + (this.equipBoxSize / 2) - 8,
      'Weapon',
      { fontSize: '14px', fill: '#fff' }
    );
    this.uiGroup.add(weaponText);

    // Armor slot
    const armorBox = new Phaser.Geom.Rectangle(
      this.leftPanel.x + 120,
      this.equipY,
      this.equipBoxSize,
      this.equipBoxSize
    );
    const armorBg = this.add.graphics();
    armorBg.lineStyle(2, 0x00ffff);
    armorBg.strokeRectShape(armorBox);
    this.uiGroup.add(armorBg);

    const armorText = this.add.text(
      this.leftPanel.x + 120 + this.equipBoxSize + 5,
      this.equipY + (this.equipBoxSize / 2) - 8,
      'Armor',
      { fontSize: '14px', fill: '#fff' }
    );
    this.uiGroup.add(armorText);

    // Draw whatever weapon is currently equipped
    if (this.equipped.weaponIndex !== null) {
      const item = this.playerInv[this.equipped.weaponIndex];
      const weaponIcon = this.add.image(
        weaponBox.x + (weaponBox.width / 2),
        weaponBox.y + (weaponBox.height / 2),
        item.iconKey
      ).setScale(0.5)
        .setDepth(10);
      this.uiGroup.add(weaponIcon);
    }

    // Draw whatever armor is currently equipped
    if (this.equipped.armorIndex !== null) {
      const item = this.playerInv[this.equipped.armorIndex];
      const armorIcon = this.add.image(
        armorBox.x + (armorBox.width / 2),
        armorBox.y + (armorBox.height / 2),
        item.iconKey
      ).setScale(0.5)
        .setDepth(10);
      this.uiGroup.add(armorIcon);
    }

    // Draw the actual grid of slots in each panel
    this.drawSlots();
    if (this.showChest) {
      this.drawSlots(true);
    }
  }

  /**
   * Draw inventory slots. If `isChest` is true, draw inside rightPanel, else leftPanel.
   */
  drawSlots(isChest = false) {
    const panel = isChest ? this.rightPanel : this.leftPanel;
    const inv   = isChest ? this.chestInv   : this.playerInv;

    // Grid parameters
    const cols = 4;
    const rows = 5;
    const slotSize = 48;
    const padding = 10;

    // Starting point (top-left of first slot)
    const startX = panel.x + padding;
    const startY = panel.y + padding + 20; // leave some space under the title bar

    // Iterate through 4 × 5 grid (20 total)
    for (let row = 0; row < rows; ++row) {
      for (let col = 0; col < cols; ++col) {
        const idx = row * cols + col;

        // Compute slot rectangle
        const x = startX + col * (slotSize + padding);
        const y = startY + row * (slotSize + padding);

        // Draw empty slot background
        const slotRect = new Phaser.Geom.Rectangle(x, y, slotSize, slotSize);
        const slotBg = this.add.graphics();
        slotBg.lineStyle(1, 0xffffff, 0.5);
        slotBg.strokeRectShape(slotRect);
        this.uiGroup.add(slotBg);

        // If there’s an item at this index, draw it
        if (idx < inv.length) {
          const item = inv[idx];

          // Create the icon
          const icon = this.add.image(
            x + (slotSize / 2),
            y + (slotSize / 2),
            item.iconKey
          ).setScale(0.5) // adjust scale so it fits
            .setDepth(10)
            .setInteractive({ draggable: true });
          this.uiGroup.add(icon);

          // Show count badge if > 1
          if (item.count > 1) {
            const countText = this.add.text(
              x + slotSize - 12,
              y + slotSize - 14,
              item.count.toString(),
              { fontSize: '12px', fill: '#ffff00' }
            ).setDepth(11);
            this.uiGroup.add(countText);
          }

          // Attach custom data to the icon for drag/drop logic:
          // We store which panel and which inventory index this icon corresponds to.
          icon.setData('owner', isChest ? 'chest' : 'player');
          icon.setData('invIndex', idx);
        }
      }
    }
  }

  /**
   * Called when a drag ends on a drop zone or anywhere.
   * If you drop onto another slot, it either swaps or stacks.
   */
  onDragEnd(pointer, icon, droppedZone) {
    // Retrieve where this icon came from
    const owner    = icon.getData('owner');    // 'player' | 'chest'
    const invIndex = icon.getData('invIndex'); // index into that array

    // If dropped outside any valid drop‐zone, return it to its original spot:
    if (!pointer.overlap && !droppedZone) {
      this.redraw();
      return;
    }

    // Determine target panel: if pointer is inside leftPanel => 'player',
    // if inside rightPanel => 'chest'. Otherwise invalid:
    let targetOwner = null;
    if (this.leftPanel.contains(pointer.x, pointer.y)) {
      targetOwner = 'player';
    } else if (this.showChest && this.rightPanel.contains(pointer.x, pointer.y)) {
      targetOwner = 'chest';
    }

    // If you dropped into the same owner (same panel) – no effect, just redraw:
    if (targetOwner === owner) {
      this.redraw();
      return;
    }

    // Otherwise, move one item from owner→targetOwner
    const sourceInv = (owner === 'player') ? this.playerInv : this.chestInv;
    const destInv   = (targetOwner === 'player') ? this.playerInv : this.chestInv;

    // Extract one item from sourceInv[invIndex]:
    const moving = sourceInv[invIndex];
    if (!moving) {
      this.redraw();
      return;
    }

    // If the player is dragging a stack, we only move one count:
    moving.count -= 1;
    // If the count of that stack becomes 0, remove from array
    if (moving.count <= 0) {
      sourceInv.splice(invIndex, 1);
    }

    // Add one of that item to destination:
    const existing = destInv.find(i => i.iconKey === moving.iconKey);
    if (existing) {
      existing.count += 1;
    } else {
      destInv.push({ iconKey: moving.iconKey, count: 1 });
    }

    // Re-draw panels
    this.redraw();
  }

  /**
   * Called when player presses ESC or “I” to close inventory.
   * We emit an event back to MainScene (so MainScene can update its own playerInv),
   * then stop this scene and resume Main.
   */
  close() {
    // Emit to MainScene (not `this.scene.events`!)
    this.scene.get('Main').events.emit('inventoryClosed', {
      playerInv: this.playerInv
    });

    this.scene.stop('InventoryScene');
    this.scene.resume('Main');
  }
}
