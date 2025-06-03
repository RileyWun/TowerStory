// assets/js/inventory‐scene.js

/**
 * InventoryScene
 *
 * Displays:
 *   • The player’s inventory panel (4×5 grid of slots).
 *   • Optionally, a chest’s inventory panel (also 4×5).
 * 
 * Drag‐and‐drop is fully supported between the two panels.
 * Pressing ESC or “I” closes the UI and sends the updated
 * playerInv back to MainScene via the “inventoryClosed” event.
 */
export class InventoryScene extends Phaser.Scene {
  constructor() {
    super('InventoryScene');
  }

  init(data) {
    // data.playerInv must be an array of { iconKey: string, count: number }
    // data.chestInv may be null or an array of the same shape
    // If chestInv is null, we only draw the player panel.
    this.playerInv = data.playerInv || [];
    this.chestInv  = Array.isArray(data.chestInv) ? data.chestInv : null;
    this.showChest = Array.isArray(data.chestInv);

    // We’ll track the current drag operation here:
    // { from: 'player'|'chest', invIndex: number, item: {iconKey, count} }
    this.draggedItem = null;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Panel dimensions
    this.panelW = 200;
    this.panelH = 300;

    // Left panel: the player's inventory
    this.leftPanel = new Phaser.Geom.Rectangle(
      20,                // x
      20,                // y
      this.panelW,       // width
      this.panelH        // height
    );

    // If showChest, create a right panel for chest
    if (this.showChest) {
      this.rightPanel = new Phaser.Geom.Rectangle(
        W - 20 - this.panelW,  // x
        20,                     // y
        this.panelW,            // width
        this.panelH             // height
      );
    }

    // A group that will hold all UI‐related GameObjects
    this.uiGroup = this.add.group();

    // Create draggable title‐bars
    this.leftZone = this.add.zone(
      this.leftPanel.x,
      this.leftPanel.y,
      this.leftPanel.width,
      20
    ).setOrigin(0).setInteractive({ draggable: true });

    if (this.showChest) {
      this.rightZone = this.add.zone(
        this.rightPanel.x,
        this.rightPanel.y,
        this.rightPanel.width,
        20
      ).setOrigin(0).setInteractive({ draggable: true });
    }

    // Allow dragging of title bars
    const draggableZones = [this.leftZone];
    if (this.showChest) {
      draggableZones.push(this.rightZone);
    }
    this.input.setDraggable(draggableZones);

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      // If dragging left panel’s bar:
      if (gameObject === this.leftZone) {
        this.leftPanel.x = dragX;
        this.leftZone.x  = dragX;
        this.leftPanel.y = dragY;
        this.leftZone.y  = dragY;
        this.redraw();
      }
      // If dragging right panel’s bar:
      else if (this.showChest && gameObject === this.rightZone) {
        this.rightPanel.x = dragX;
        this.rightZone.x  = dragX;
        this.rightPanel.y = dragY;
        this.rightZone.y  = dragY;
        this.redraw();
      }
    });

    // When drag ends, drop the item
    this.input.on('dragend', this.onDragEnd, this);

    // Close on ESC or I
    this.input.keyboard.once('keydown-ESC', () => { this.close(); });
    this.input.keyboard.once('keydown-I',   () => { this.close(); });

    // Finally, draw everything
    this.redraw();
  }

  /**
   * Clear and redraw both panels (player + chest if any).
   */
  redraw() {
    // Clear all previous UI elements
    this.uiGroup.clear(true, true);

    // Draw a semi‐transparent backdrop behind the panels
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    const leftX = this.leftPanel.x - 10;
    const leftY = this.leftPanel.y - 10;
    const totalWidth = this.showChest
      ? (this.rightPanel.x + this.rightPanel.width) - this.leftPanel.x
      : this.leftPanel.width;
    const totalHeight = this.leftPanel.height;
    bg.fillRect(leftX, leftY, totalWidth + 20, totalHeight + 20);
    this.uiGroup.add(bg);

    // Draw left panel border + title
    const leftBorder = this.add.graphics();
    leftBorder.lineStyle(2, 0xffffff);
    leftBorder.strokeRectShape(this.leftPanel);
    this.uiGroup.add(leftBorder);

    const invLabel = this.add.text(
      this.leftPanel.x + 10,
      this.leftPanel.y,
      'Inventory',
      { fontSize: '16px', fill: '#fff' }
    );
    this.uiGroup.add(invLabel);

    // Draw right panel (chest) if present
    if (this.showChest) {
      const rightBorder = this.add.graphics();
      rightBorder.lineStyle(2, 0xffffff);
      rightBorder.strokeRectShape(this.rightPanel);
      this.uiGroup.add(rightBorder);

      const chestLabel = this.add.text(
        this.rightPanel.x + 10,
        this.rightPanel.y,
        'Chest',
        { fontSize: '16px', fill: '#fff' }
      );
      this.uiGroup.add(chestLabel);
    }

    // Now draw slots (4×5) in each panel
    this.drawSlots(false);  // false => draw player slots
    if (this.showChest) {
      this.drawSlots(true); // true => draw chest slots
    }
  }

  /**
   * Draw a 4×5 grid of slots (48×48 px each + padding) inside either leftPanel or rightPanel.
   * If isChest = true, draw inside rightPanel using this.chestInv; otherwise leftPanel with this.playerInv.
   */
  drawSlots(isChest = false) {
    const panel = isChest ? this.rightPanel : this.leftPanel;
    const inv   = isChest ? this.chestInv   : this.playerInv;

    // Grid dimensions
    const cols = 4, rows = 5;
    const slotSize = 48;
    const padding = 10;

    // Starting top‐left inside the panel (24 px below top for the title bar)
    const startX = panel.x + padding;
    const startY = panel.y + padding + 20;

    for (let row = 0; row < rows; ++row) {
      for (let col = 0; col < cols; ++col) {
        const idx = row * cols + col;
        const x = startX + col * (slotSize + padding);
        const y = startY + row * (slotSize + padding);

        // Draw empty slot rectangle
        const slotRect = new Phaser.Geom.Rectangle(x, y, slotSize, slotSize);
        const slotBg = this.add.graphics();
        slotBg.lineStyle(1, 0xffffff, 0.5);
        slotBg.strokeRectShape(slotRect);
        this.uiGroup.add(slotBg);

        // If there’s an item at this index, draw icon + count
        if (idx < inv.length) {
          const item = inv[idx];

          // Add the icon, make it draggable
          const icon = this.add.image(
            x + slotSize/2,
            y + slotSize/2,
            item.iconKey
          ).setScale(0.5)
            .setDepth(10)
            .setInteractive({ draggable: true });
          this.uiGroup.add(icon);

          // Show stacked count if > 1
          if (item.count > 1) {
            const countText = this.add.text(
              x + slotSize - 12,
              y + slotSize - 14,
              item.count.toString(),
              { fontSize: '12px', fill: '#ffff00' }
            ).setDepth(11);
            this.uiGroup.add(countText);
          }

          // Store custom data so onDragEnd knows where it came from
          icon.setData('owner', isChest ? 'chest' : 'player');
          icon.setData('invIndex', idx);
        }
      }
    }
  }

  /**
   * onDragEnd is called when a draggable icon is dropped.  We detect
   * which panel the pointer is over, move one unit from source→dest,
   * then redraw both panels.
   */
  onDragEnd(pointer, icon, droppedZone) {
    const owner    = icon.getData('owner');     // 'player' or 'chest'
    const invIndex = icon.getData('invIndex');   // index in that array

    // Determine which panel the pointer ended up in:
    let targetOwner = null;
    if (this.leftPanel.contains(pointer.x, pointer.y)) {
      targetOwner = 'player';
    } else if (this.showChest && this.rightPanel.contains(pointer.x, pointer.y)) {
      targetOwner = 'chest';
    }

    // If pointer didn't land in either panel or stayed in the same panel, just redraw:
    if (!targetOwner || targetOwner === owner) {
      this.redraw();
      return;
    }

    // Source/destination arrays
    const sourceInv = (owner === 'player') ? this.playerInv : this.chestInv;
    const destInv   = (targetOwner === 'player') ? this.playerInv : this.chestInv;

    // Remove one count from sourceInv[invIndex]
    const moving = sourceInv[invIndex];
    if (!moving) {
      this.redraw();
      return;
    }
    moving.count -= 1;
    if (moving.count <= 0) {
      sourceInv.splice(invIndex, 1);
    }

    // Add to destination (stack if same iconKey, else push new)
    const existing = destInv.find(i => i.iconKey === moving.iconKey);
    if (existing) {
      existing.count += 1;
    } else {
      destInv.push({ iconKey: moving.iconKey, count: 1 });
    }

    // Finally, redraw both panels
    this.redraw();
  }

  /**
   * Close the inventory.  Emit “inventoryClosed” to MainScene, passing updated playerInv,
   * then stop this scene.
   */
  close() {
    this.scene.get('Main').events.emit('inventoryClosed', {
      playerInv: this.playerInv
    });
    this.scene.stop('InventoryScene');
    this.scene.resume('Main');
  }
}
