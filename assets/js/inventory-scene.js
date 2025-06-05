// assets/js/inventory-scene.js

/**
 * InventoryScene
 *
 * Supports:
 *   • A single “Inventory” panel (4×5 grid) when chestInv===null
 *   • A two-panel layout (“Inventory” on left, “Chest” on right)
 *     (each 4×5) when data.chestInv is an array.
 *
 * Drag-and-drop between any slots (player↔player or chest↔chest or player↔chest).
 * Drawing of item icons and stack counts (if >1) is automatic.
 * When closed (Esc or “I”), emits “inventoryClosed” from MainScene with
 *    { playerInv: [...], chestInv: [...] }
 */

export class InventoryScene extends Phaser.Scene {
  constructor() {
    super('InventoryScene');
  }

  init(data) {
    // data.playerInv must be an array of objects { iconKey, count }
    this.playerInv = Array.isArray(data.playerInv) ? data.playerInv : [];
    // data.chestInv is either null (no chest) or an array like playerInv
    this.chestInv = Array.isArray(data.chestInv) ? data.chestInv : null;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // 1) Full-screen semi-opaque overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, W, H);

    // We will keep every UI piece in this.group so we can clear/redraw easily
    this.group = this.add.group();
    this.group.add(overlay);

    // 2) Common layout parameters
    const cols       = 4;
    const rows       = 5;
    const slotSize   = 64;   // each slot is 64×64
    const padding    = 12;   // space around slots
    const titleArea  = 40;   // space for “Inventory” or “Chest” label

    // Panel width = cols*slotSize + (cols+1)*padding
    // Panel height = titleArea + rows*slotSize + (rows+1)*padding
    const panelWidth  = cols * slotSize + (cols + 1) * padding;
    const panelHeight = titleArea + rows * slotSize + (rows + 1) * padding;

    if (this.chestInv) {
      // TWO-PANEL MODE:  Player on left, Chest on right, panels side by side

      // total width = panelWidth*2 + padding (in between)
      const totalWidth = panelWidth * 2 + padding;
      const startX     = (W - totalWidth) / 2;
      const panelY     = (H - panelHeight) / 2;

      // Player panel coords
      this.playerPanel = {
        x: startX,
        y: panelY,
        w: panelWidth,
        h: panelHeight
      };
      // Chest panel coords
      this.chestPanel = {
        x: startX + panelWidth + padding,
        y: panelY,
        w: panelWidth,
        h: panelHeight
      };

      // Draw player panel background
      const pBg = this.add.graphics();
      pBg.fillStyle(0x222222, 0.9);
      pBg.fillRoundedRect(this.playerPanel.x, this.playerPanel.y, panelWidth, panelHeight, 8);
      this.group.add(pBg);

      // Draw chest panel background
      const cBg = this.add.graphics();
      cBg.fillStyle(0x222222, 0.9);
      cBg.fillRoundedRect(this.chestPanel.x, this.chestPanel.y, panelWidth, panelHeight, 8);
      this.group.add(cBg);

      // Draw “Inventory” title
      const t1 = this.add.text(
        this.playerPanel.x + panelWidth / 2,
        this.playerPanel.y + 8,
        'Inventory',
        { fontSize: '20px', fill: '#ffffff' }
      ).setOrigin(0.5, 0);
      this.group.add(t1);

      // Draw “Chest” title
      const t2 = this.add.text(
        this.chestPanel.x + panelWidth / 2,
        this.chestPanel.y + 8,
        'Chest',
        { fontSize: '20px', fill: '#ffffff' }
      ).setOrigin(0.5, 0);
      this.group.add(t2);

      // Compute slot centers for player (left) and for chest (right)
      this.playerSlotCenters = [];
      this.chestSlotCenters  = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Player slot:
          const px = this.playerPanel.x +
                     padding +
                     col * (slotSize + padding) +
                     slotSize / 2;
          const py = this.playerPanel.y +
                     titleArea +
                     padding +
                     row * (slotSize + padding) +
                     slotSize / 2;
          this.playerSlotCenters.push({ x: px, y: py });

          // Chest slot:
          const cx = this.chestPanel.x +
                     padding +
                     col * (slotSize + padding) +
                     slotSize / 2;
          const cy = this.chestPanel.y +
                     titleArea +
                     padding +
                     row * (slotSize + padding) +
                     slotSize / 2;
          this.chestSlotCenters.push({ x: cx, y: cy });
        }
      }

    } else {
      // SINGLE-PANEL MODE: Center the player panel
      const panelX = (W - panelWidth) / 2;
      const panelY = (H - panelHeight) / 2;

      this.playerPanel = { x: panelX, y: panelY, w: panelWidth, h: panelHeight };

      // Draw player panel background
      const pBg = this.add.graphics();
      pBg.fillStyle(0x222222, 0.9);
      pBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
      this.group.add(pBg);

      // Draw “Inventory” title
      const t1 = this.add.text(
        panelX + panelWidth / 2,
        panelY + 8,
        'Inventory',
        { fontSize: '20px', fill: '#ffffff' }
      ).setOrigin(0.5, 0);
      this.group.add(t1);

      // Compute slot centers
      this.playerSlotCenters = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = panelX +
                    padding +
                    col * (slotSize + padding) +
                    slotSize / 2;
          const y = panelY +
                    titleArea +
                    padding +
                    row * (slotSize + padding) +
                    slotSize / 2;
          this.playerSlotCenters.push({ x, y });
        }
      }
      // No chest slots in single-panel mode
      this.chestSlotCenters = null;
    }

    // 3) Draw empty slot outlines for whichever panels exist
    const borderColor = 0xffffff;
    const borderWidth = 2;

    // Draw player slots
    for (let i = 0; i < this.playerSlotCenters.length; i++) {
      const { x, y } = this.playerSlotCenters[i];
      const rect = new Phaser.Geom.Rectangle(
        x - slotSize / 2,
        y - slotSize / 2,
        slotSize,
        slotSize
      );
      const g = this.add.graphics();
      g.lineStyle(borderWidth, borderColor);
      g.strokeRectShape(rect);
      this.group.add(g);
    }

    // Draw chest slots (if any)
    if (this.chestSlotCenters) {
      for (let i = 0; i < this.chestSlotCenters.length; i++) {
        const { x, y } = this.chestSlotCenters[i];
        const rect = new Phaser.Geom.Rectangle(
          x - slotSize / 2,
          y - slotSize / 2,
          slotSize,
          slotSize
        );
        const g = this.add.graphics();
        g.lineStyle(borderWidth, borderColor);
        g.strokeRectShape(rect);
        this.group.add(g);
      }
    }

    // 4) Draw the item icons + counts
    //    We tag each icon with a data field that tells us where it came from:
    //      • { from: 'player', index: i }
    //      • { from: 'chest',  index: i }
    //    Then the drag/drop handler will consult those fields.

    // Draw player icons
    for (let i = 0; i < this.playerInv.length; i++) {
      if (!this.playerInv[i]) continue;
      if (i >= this.playerSlotCenters.length) break;

      const { x, y } = this.playerSlotCenters[i];
      const icon = this.add
        .image(x, y, this.playerInv[i].iconKey)
        .setScale(0.5)
        .setDepth(10)
        .setInteractive({ draggable: true });
      icon.setData('from', 'player');
      icon.setData('index', i);
      this.group.add(icon);

      if (this.playerInv[i].count > 1) {
        const countText = this.add.text(
          x + slotSize / 2 - 14,
          y + slotSize / 2 - 14,
          this.playerInv[i].count.toString(),
          { fontSize: '14px', fill: '#ffff00' }
        ).setDepth(11);
        this.group.add(countText);
      }
    }

    // Draw chest icons (if any)
    if (this.chestSlotCenters) {
      for (let i = 0; i < this.chestInv.length; i++) {
        if (!this.chestInv[i]) continue;
        if (i >= this.chestSlotCenters.length) break;

        const { x, y } = this.chestSlotCenters[i];
        const icon = this.add
          .image(x, y, this.chestInv[i].iconKey)
          .setScale(0.5)
          .setDepth(10)
          .setInteractive({ draggable: true });
        icon.setData('from', 'chest');
        icon.setData('index', i);
        this.group.add(icon);

        if (this.chestInv[i].count > 1) {
          const countText = this.add.text(
            x + slotSize / 2 - 14,
            y + slotSize / 2 - 14,
            this.chestInv[i].count.toString(),
            { fontSize: '14px', fill: '#ffff00' }
          ).setDepth(11);
          this.group.add(countText);
        }
      }
    }

    // 5) DRAG & DROP HANDLING
    //    When a drag starts, we record { from, index, gameObject } in this.dragInfo.
    //    On drag end, we compute which slot (player or chest) it was dropped over.
    //    Then we swap the stacks in the two arrays.
    this.input.on('dragstart', (pointer, gameObject) => {
      const from   = gameObject.getData('from');   // 'player' or 'chest'
      const index  = gameObject.getData('index');  // numeric slot index
      this.dragInfo = { from, index, gameObject };
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on('dragend', (pointer, gameObject) => {
      const { from, index } = this.dragInfo;
      const dx = gameObject.x;
      const dy = gameObject.y;

      let dropTarget = null;
      let dropIndex  = null;

      // Check if we dropped onto a player slot
      for (let i = 0; i < this.playerSlotCenters.length; i++) {
        const { x, y } = this.playerSlotCenters[i];
        const rect = new Phaser.Geom.Rectangle(
          x - slotSize / 2,
          y - slotSize / 2,
          slotSize,
          slotSize
        );
        if (rect.contains(dx, dy)) {
          dropTarget = 'player';
          dropIndex  = i;
          break;
        }
      }

      // If not onto player, check chest (if any)
      if (!dropTarget && this.chestSlotCenters) {
        for (let i = 0; i < this.chestSlotCenters.length; i++) {
          const { x, y } = this.chestSlotCenters[i];
          const rect = new Phaser.Geom.Rectangle(
            x - slotSize / 2,
            y - slotSize / 2,
            slotSize,
            slotSize
          );
          if (rect.contains(dx, dy)) {
            dropTarget = 'chest';
            dropIndex  = i;
            break;
          }
        }
      }

      // If we found a valid drop:
      if (dropTarget && dropIndex !== null) {
        if (from === 'player' && dropTarget === 'player') {
          // swap two player slots
          const a = this.playerInv[index];
          const b = this.playerInv[dropIndex];
          this.playerInv[dropIndex] = a;
          this.playerInv[index]     = b || null;
        }
        else if (from === 'chest' && dropTarget === 'chest') {
          // swap two chest slots
          const a = this.chestInv[index];
          const b = this.chestInv[dropIndex];
          this.chestInv[dropIndex] = a;
          this.chestInv[index]      = b || null;
        }
        else if (from === 'player' && dropTarget === 'chest') {
          // move from player→chest
          const a = this.playerInv[index];
          const b = this.chestInv[dropIndex];
          this.chestInv[dropIndex] = a;
          this.playerInv[index]    = b || null;
        }
        else if (from === 'chest' && dropTarget === 'player') {
          // move from chest→player
          const a = this.chestInv[index];
          const b = this.playerInv[dropIndex];
          this.playerInv[dropIndex] = a;
          this.chestInv[index]      = b || null;
        }
      }

      // Redraw everything from scratch
      this.redraw();
      this.dragInfo = null;
    });

    // 6) Close on ESC or “I”
    this.input.keyboard.once('keydown-ESC', () => this.close());
    this.input.keyboard.once('keydown-I',   () => this.close());
  }

  /**
   * Re-draw the entire UI (except overlay & panel backgrounds & titles).
   * Called after any drag/drop rearrangement.
   */
  redraw() {
    // Destroy everything except the first 3 children in this.group:
    //   0 = overlay, 1 = playerPanel bg, 2 = chestPanel bg (if present),
    //   3 = Inventory title, 4 = Chest title (if present).
    // To keep it simple, we’ll “keep the background & title indices”
    // and destroy any child after that index.  Then we re-draw slot outlines
    // and icons & counts from scratch.
    const children = this.group.getChildren();
    let keepCount  = this.chestInv ? 5 : 3;
    //   [0] overlay
    //   [1] player panel bg
    //   [2] chest panel bg or inventory title if no chest
    //   [3] inventory title or chest title if no chest
    //   [4] chest title (only if chestInv)
    for (let i = children.length - 1; i >= keepCount; i--) {
      children[i].destroy();
    }

    // Re-draw slot outlines
    const slotSize = 64;
    const borderWidth = 2;
    const borderColor = 0xffffff;
    // Player slots
    for (let i = 0; i < this.playerSlotCenters.length; i++) {
      const { x, y } = this.playerSlotCenters[i];
      const rect = new Phaser.Geom.Rectangle(
        x - slotSize / 2,
        y - slotSize / 2,
        slotSize,
        slotSize
      );
      const g = this.add.graphics();
      g.lineStyle(borderWidth, borderColor);
      g.strokeRectShape(rect);
      this.group.add(g);
    }
    // Chest slots
    if (this.chestSlotCenters) {
      for (let i = 0; i < this.chestSlotCenters.length; i++) {
        const { x, y } = this.chestSlotCenters[i];
        const rect = new Phaser.Geom.Rectangle(
          x - slotSize / 2,
          y - slotSize / 2,
          slotSize,
          slotSize
        );
        const g = this.add.graphics();
        g.lineStyle(borderWidth, borderColor);
        g.strokeRectShape(rect);
        this.group.add(g);
      }
    }

    // Re-draw player icons & counts
    for (let i = 0; i < this.playerInv.length; i++) {
      const item = this.playerInv[i];
      if (!item) continue;
      if (i >= this.playerSlotCenters.length) break;
      const { x, y } = this.playerSlotCenters[i];
      const icon = this.add
        .image(x, y, item.iconKey)
        .setScale(0.5)
        .setDepth(10)
        .setInteractive({ draggable: true });
      icon.setData('from', 'player');
      icon.setData('index', i);
      this.group.add(icon);
      if (item.count > 1) {
        const countText = this.add.text(
          x + slotSize / 2 - 14,
          y + slotSize / 2 - 14,
          item.count.toString(),
          { fontSize: '14px', fill: '#ffff00' }
        ).setDepth(11);
        this.group.add(countText);
      }
    }

    // Re-draw chest icons & counts (if applicable)
    if (this.chestSlotCenters) {
      for (let i = 0; i < this.chestInv.length; i++) {
        const item = this.chestInv[i];
        if (!item) continue;
        if (i >= this.chestSlotCenters.length) break;
        const { x, y } = this.chestSlotCenters[i];
        const icon = this.add
          .image(x, y, item.iconKey)
          .setScale(0.5)
          .setDepth(10)
          .setInteractive({ draggable: true });
        icon.setData('from', 'chest');
        icon.setData('index', i);
        icon.on('dragstart', () => this.children.bringToTop(icon));
        icon.on('drag', (pointer, dragX, dragY) => { icon.x = dragX; icon.y = dragY; });
        icon.on('dragend', (pointer, dragX, dragY) => { this.onDragEndItem(icon, dragX, dragY); });
        this.group.add(icon);
        if (item.count > 1) {
          const countText = this.add.text(
            x + slotSize / 2 - 14,
            y + slotSize / 2 - 14,
            item.count.toString(),
            { fontSize: '14px', fill: '#ffff00' }
          ).setDepth(11);
          this.group.add(countText);
        }
      }
    }

    // Re-bind drag events for the new icons
    this.input.on('dragstart', (pointer, gameObject) => {
      const from   = gameObject.getData('from');
      const index  = gameObject.getData('index');
      this.dragInfo = { from, index, gameObject };
    });
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
    });
    this.input.on('dragend', (pointer, gameObject) => {
      // Identical logic to above: determine dropTarget & dropIndex
      const { from, index } = this.dragInfo;
      const dx = gameObject.x;
      const dy = gameObject.y;

      let dropTarget = null;
      let dropIndex  = null;

      // Player slots
      for (let i = 0; i < this.playerSlotCenters.length; i++) {
        const { x, y } = this.playerSlotCenters[i];
        const rect = new Phaser.Geom.Rectangle(
          x - slotSize / 2,
          y - slotSize / 2,
          slotSize,
          slotSize
        );
        if (rect.contains(dx, dy)) {
          dropTarget = 'player';
          dropIndex  = i;
          break;
        }
      }
      // Chest slots (if any)
      if (!dropTarget && this.chestSlotCenters) {
        for (let i = 0; i < this.chestSlotCenters.length; i++) {
          const { x, y } = this.chestSlotCenters[i];
          const rect = new Phaser.Geom.Rectangle(
            x - slotSize / 2,
            y - slotSize / 2,
            slotSize,
            slotSize
          );
          if (rect.contains(dx, dy)) {
            dropTarget = 'chest';
            dropIndex  = i;
            break;
          }
        }
      }

      // Perform the move/swap
      if (dropTarget && dropIndex !== null) {
        if (from === 'player' && dropTarget === 'player') {
          const a = this.playerInv[index];
          const b = this.playerInv[dropIndex];
          this.playerInv[dropIndex] = a;
          this.playerInv[index]     = b || null;
        }
        else if (from === 'chest' && dropTarget === 'chest') {
          const a = this.chestInv[index];
          const b = this.chestInv[dropIndex];
          this.chestInv[dropIndex] = a;
          this.chestInv[index]     = b || null;
        }
        else if (from === 'player' && dropTarget === 'chest') {
          const a = this.playerInv[index];
          const b = this.chestInv[dropIndex];
          this.chestInv[dropIndex] = a;
          this.playerInv[index]    = b || null;
        }
        else if (from === 'chest' && dropTarget === 'player') {
          const a = this.chestInv[index];
          const b = this.playerInv[dropIndex];
          this.playerInv[dropIndex] = a;
          this.chestInv[index]      = b || null;
        }
      }

      this.redraw();
      this.dragInfo = null;
    });
  }

  /**
   * Called when ESC or “I” is pressed.  Emit updated arrays, then close.
   */
  closeScene() {
    // Tell MainScene that we are closing, passing back both inventories
    const main = this.scene.get('Main');
    main.events.emit('inventoryClosed', {
      playerInv: this.playerInv,
      chestInv:  this.chestInv,   // will be null if no chest was open
    });
    this.scene.stop('InventoryScene');
    this.scene.resume('Main');
  }
}
