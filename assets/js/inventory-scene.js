// assets/js/inventory‐scene.js

/**
 * InventoryScene
 *
 * Displays a 4×5 inventory grid (4 columns, 5 rows) on top of a centered
 * semi‐opaque background panel.  Shows the text “Inventory” at the top, then
 * the grid of empty slot outlines with any item icons drawn inside.  Supports
 * drag‐and‐drop to rearrange stacks or move back to equipment.
 *
 * Press ESC or “I” to close.  Emits “inventoryClosed” with updated playerInv
 * when closed.
 */

export class InventoryScene extends Phaser.Scene {
  constructor() {
    super('InventoryScene');
  }

  init(data) {
    // We expect MainScene to pass:
    //   • playerInv: an array of { iconKey, count }
    this.playerInv = data.playerInv || [];
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // 1) Full‐screen dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, W, H);
    this.uiGroup = this.add.group();
    this.uiGroup.add(overlay);

    // 2) Compute panel size & position
    // Inventory grid: 4 columns × 5 rows
    const cols       = 4;
    const rows       = 5;
    const slotSize   = 64;    // each slot is 64×64 px
    const padding    = 12;    // space between slots and around edges
    const titleArea  = 40;    // extra space at top for “Inventory” label

    // Panel width = cols*slotSize + (cols+1)*padding
    // Panel height = titleArea + rows*slotSize + (rows+1)*padding
    const panelWidth  = cols * slotSize + (cols + 1) * padding;
    const panelHeight = titleArea + rows * slotSize + (rows + 1) * padding;

    const panelX = (W - panelWidth) / 2;
    const panelY = (H - panelHeight) / 2;

    // 3) Draw panel background (rounded rect)
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x222222, 0.9);
    panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
    this.uiGroup.add(panelBg);

    // 4) Draw “Inventory” title at top‐center of panel
    const titleText = this.add
      .text(
        panelX + panelWidth / 2,
        panelY + 8,
        'Inventory',
        { fontSize: '20px', fill: '#ffffff' }
      )
      .setOrigin(0.5, 0);
    this.uiGroup.add(titleText);

    // 5) Precompute slot center positions
    this.slotCenters = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = panelX + padding + col * (slotSize + padding) + slotSize / 2;
        const y = panelY + titleArea + padding + row * (slotSize + padding) + slotSize / 2;
        this.slotCenters.push({ x, y });
      }
    }

    // 6) Draw empty slot outlines
    for (let i = 0; i < this.slotCenters.length; i++) {
      const { x, y } = this.slotCenters[i];
      const rect = new Phaser.Geom.Rectangle(
        x - slotSize / 2,
        y - slotSize / 2,
        slotSize,
        slotSize
      );
      const border = this.add.graphics();
      border.lineStyle(2, 0xffffff);
      border.strokeRectShape(rect);
      this.uiGroup.add(border);
    }

    // 7) Draw each inventory item icon inside its slot
    //    If count > 1, draw the count in bottom‐right of slot.
    for (let i = 0; i < this.playerInv.length; i++) {
      const item = this.playerInv[i];
      if (!item) continue;

      // If playerInv is shorter than number of slots, skip empty indices
      if (i >= this.slotCenters.length) break;

      const { x, y } = this.slotCenters[i];
      const icon = this.add
        .image(x, y, item.iconKey)
        .setScale(0.5)
        .setDepth(10)
        .setInteractive({ draggable: true });
      icon.setData('fromInv', i);

      this.uiGroup.add(icon);

      if (item.count > 1) {
        const countText = this.add
          .text(
            x + slotSize / 2 - 14,
            y + slotSize / 2 - 14,
            item.count.toString(),
            { fontSize: '14px', fill: '#ffff00' }
          )
          .setDepth(11);
        this.uiGroup.add(countText);
      }
    }

    // 8) Capture drag events to allow rearranging or splitting stacks
    this.input.on('dragstart', (pointer, gameObject) => {
      this.draggedItem = {
        gameObject,
        fromInv: gameObject.getData('fromInv'),
      };
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on('dragend', (pointer, gameObject) => {
      // Determine if dropped on a valid slot
      const dx = gameObject.x;
      const dy = gameObject.y;
      let targetIndex = null;

      for (let i = 0; i < this.slotCenters.length; i++) {
        const { x, y } = this.slotCenters[i];
        const rect = new Phaser.Geom.Rectangle(
          x - slotSize / 2,
          y - slotSize / 2,
          slotSize,
          slotSize
        );
        if (rect.contains(dx, dy)) {
          targetIndex = i;
          break;
        }
      }

      const { fromInv } = this.draggedItem;
      if (targetIndex !== null && fromInv !== null) {
        // Swap stacks (or move if target slot is empty)
        const a = this.playerInv[fromInv];
        const b = this.playerInv[targetIndex];
        this.playerInv[targetIndex] = a;
        this.playerInv[fromInv]       = b || null;
      }

      // Redraw everything to reflect the new arrangement
      this.redrawAll();

      this.draggedItem = null;
    });

    // 9) Close on ESC or “I”
    this.input.keyboard.once('keydown-ESC', () => this.close());
    this.input.keyboard.once('keydown-I',   () => this.close());
  }

  /**
   * Redraw all icons and slot outlines, preserving the background & title.
   */
  redrawAll() {
    // Keep overlay (index 0) and panelBg (index 1) and titleText (index 2),
    // destroy everything else in uiGroup.
    const children = this.uiGroup.getChildren();
    for (let i = children.length - 1; i >= 3; i--) {
      children[i].destroy();
    }

    const slotSize = 64;
    // 1) Re‐draw slot outlines
    for (let i = 0; i < this.slotCenters.length; i++) {
      const { x, y } = this.slotCenters[i];
      const rect = new Phaser.Geom.Rectangle(
        x - slotSize / 2,
        y - slotSize / 2,
        slotSize,
        slotSize
      );
      const border = this.add.graphics();
      border.lineStyle(2, 0xffffff);
      border.strokeRectShape(rect);
      this.uiGroup.add(border);
    }

    // 2) Re‐draw all inventory icons & counts
    for (let i = 0; i < this.playerInv.length; i++) {
      const item = this.playerInv[i];
      if (!item) continue;
      if (i >= this.slotCenters.length) break;

      const { x, y } = this.slotCenters[i];
      const icon = this.add
        .image(x, y, item.iconKey)
        .setScale(0.5)
        .setDepth(10)
        .setInteractive({ draggable: true });
      icon.setData('fromInv', i);
      this.uiGroup.add(icon);

      if (item.count > 1) {
        const countText = this.add.text(
          x + slotSize / 2 - 14,
          y + slotSize / 2 - 14,
          item.count.toString(),
          { fontSize: '14px', fill: '#ffff00' }
        );
        this.uiGroup.add(countText);
      }
    }

    // 3) Rebind drag events (necessary if icons were recreated)
    this.input.on('dragstart', (pointer, gameObject) => {
      this.draggedItem = {
        gameObject,
        fromInv: gameObject.getData('fromInv'),
      };
    });
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
    });
    this.input.on('dragend', (pointer, gameObject) => {
      // Same drop logic as before
      const dx = gameObject.x;
      const dy = gameObject.y;
      let targetIndex = null;
      for (let i = 0; i < this.slotCenters.length; i++) {
        const { x, y } = this.slotCenters[i];
        const rect = new Phaser.Geom.Rectangle(
          x - slotSize / 2,
          y - slotSize / 2,
          slotSize,
          slotSize
        );
        if (rect.contains(dx, dy)) {
          targetIndex = i;
          break;
        }
      }
      const { fromInv } = this.draggedItem;
      if (targetIndex !== null && fromInv !== null) {
        const a = this.playerInv[fromInv];
        const b = this.playerInv[targetIndex];
        this.playerInv[targetIndex] = a;
        this.playerInv[fromInv]       = b || null;
      }
      this.redrawAll();
      this.draggedItem = null;
    });
  }

  close() {
    this.scene.get('Main').events.emit('inventoryClosed', {
      playerInv: this.playerInv
    });
    this.scene.stop('InventoryScene');
    this.scene.resume('Main');
  }
}
