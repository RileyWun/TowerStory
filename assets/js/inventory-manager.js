// ─────────────────────────────────────────────────────────────────────────────
// Inventory Scene (drag‐&‐drop between player and chest slots)
// ─────────────────────────────────────────────────────────────────────────────
class InventoryScene extends Phaser.Scene {
  constructor() {
    super('InventoryScene');
  }

  init(data) {
    // data.playerInv: array of { iconKey, count }
    // data.chestInv:  array of { iconKey, count }   (or [])
    this.playerInv = data.playerInv;
    this.chestInv  = data.chestInv || [];
    this.showChest = data.chestInv !== null;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Semi‐transparent backdrop
    this.add.graphics()
      .fillStyle(0x000000, 0.7)
      .fillRect(50, 50, w - 100, h - 100);

    // Define panel dimensions
    this.panelW = 200;
    this.panelH = 300;
    this.slotSize = 48;
    this.slotPadding = 10;
    this.cols = 4; // 4 columns to give more space (adjust as needed)
    this.rows = 2; // 2 rows per panel

    // Player panel (left)
    const px = 80;
    const py = 80;
    this.playerPanel = this.add.rectangle(
      px + this.panelW/2, py + this.panelH/2,
      this.panelW, this.panelH,
      0x222222, 0.9
    );
    this.playerTitle = this.add.text(px + 10, py + 10, 'Your Inventory', {
      fontSize: '16px', fill: '#fff'
    });

    // Chest panel (right), if present
    if (this.showChest) {
      const cx = w - 80 - this.panelW;
      const cy = 80;
      this.chestPanel = this.add.rectangle(
        cx + this.panelW/2, cy + this.panelH/2,
        this.panelW, this.panelH,
        0x222222, 0.9
      );
      this.chestTitle = this.add.text(cx + 10, cy + 10, 'Chest Contents', {
        fontSize: '16px', fill: '#fff'
      });
      this.chestPanelX = cx; // store left‐edge for drop logic
      this.chestPanelY = cy;
    }

    // “Close” button
    this.closeBtn = this.add.text(w/2, h - 70, '[ Close ]', {
      fontSize: '18px', fill: '#ff4444'
    })
    .setOrigin(0.5)
    .setInteractive();
    this.closeBtn.on('pointerdown', () => this.close());

    // Input keys for closing
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-I',   () => this.close());

    // Group to hold all slot icons/texts so we can clear/re-draw easily
    this.uiGroup = this.add.group();

    // Draw initial slots/icons
    this.drawSlots();

    // Make icons draggable
    this.input.setTopOnly(true);
    this.input.on('dragstart', (pointer, gameObject) => {
      // Bring to top so it’s not hidden behind others
      this.children.bringToTop(gameObject);
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on('dragend', (pointer, gameObject) => {
      this.handleDrop(gameObject, pointer.x, pointer.y);
    });
  }

  // Draw player & chest slots + icons
  drawSlots() {
    // Clear previous icons/slots
    this.uiGroup.clear(true, true);

    const startX = 80;
    const startY = 80 + 30; // leave room for title

    // PLAYER SLOTS (4×2)
    this.playerSlots = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const x = startX + col * (this.slotSize + this.slotPadding);
        const y = startY + row * (this.slotSize + this.slotPadding);

        // Draw slot background
        const slotBg = this.add.rectangle(
          x + this.slotSize/2, y + this.slotSize/2,
          this.slotSize, this.slotSize,
          0x444444
        ).setStrokeStyle(2, 0xffffff);
        this.uiGroup.add(slotBg);

        this.playerSlots.push({ x, y, occupied: false, index: row * this.cols + col });
      }
    }

    // Place player items
    this.playerIcons = [];
    this.playerInv.forEach((stack, idx) => {
      if (idx >= this.rows * this.cols) return; // beyond slot count

      const slot = this.playerSlots[idx];
      const iconX = slot.x + this.slotSize/2;
      const iconY = slot.y + this.slotSize/2;

      // Create icon sprite
      const icon = this.add.image(iconX, iconY, stack.iconKey)
        .setDisplaySize(32, 32)
        .setData('from', 'player')
        .setData('stackIndex', idx)
        .setInteractive({ draggable: true });

      // Draw count text
      const countText = this.add.text(
        slot.x + this.slotSize - 8, slot.y + this.slotSize - 8,
        `${stack.count}`, { fontSize: '14px', fill: '#fff' }
      ).setOrigin(1);
      icon.setData('countText', countText);

      this.uiGroup.add(icon);
      this.uiGroup.add(countText);
      this.playerIcons.push(icon);
      slot.occupied = true;
    });

    // CHEST SLOTS (if any)
    if (this.showChest) {
      this.chestSlots = [];
      const cx = this.chestPanelX;
      const cy = this.chestPanelY + 30;

      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const x = cx + col * (this.slotSize + this.slotPadding);
          const y = cy + row * (this.slotSize + this.slotPadding);

          // Draw slot background
          const slotBg = this.add.rectangle(
            x + this.slotSize/2, y + this.slotSize/2,
            this.slotSize, this.slotSize,
            0x444444
          ).setStrokeStyle(2, 0xffffff);
          this.uiGroup.add(slotBg);

          this.chestSlots.push({ x, y, occupied: false, index: row * this.cols + col });
        }
      }

      // Place chest items
      this.chestIcons = [];
      this.chestInv.forEach((stack, idx) => {
        if (idx >= this.rows * this.cols) return;

        const slot = this.chestSlots[idx];
        const iconX = slot.x + this.slotSize/2;
        const iconY = slot.y + this.slotSize/2;

        const icon = this.add.image(iconX, iconY, stack.iconKey)
          .setDisplaySize(32, 32)
          .setData('from', 'chest')
          .setData('stackIndex', idx)
          .setInteractive({ draggable: true });

        const countText = this.add.text(
          slot.x + this.slotSize - 8, slot.y + this.slotSize - 8,
          `${stack.count}`, { fontSize: '14px', fill: '#fff' }
        ).setOrigin(1);
        icon.setData('countText', countText);

        this.uiGroup.add(icon);
        this.uiGroup.add(countText);
        this.chestIcons.push(icon);
        slot.occupied = true;
      });
    }
  }

  // Called on dragend: tries to move between player/chest or revert
  handleDrop(icon, dropX, dropY) {
    const src = icon.getData('from');       // 'player' or 'chest'
    const idx = icon.getData('stackIndex'); // index into that array

    // 1) Check if dropped into the opposite panel
    if (src === 'player' && this.showChest && this.isInsideChestPanel(dropX, dropY)) {
      this.transferItem('player', idx, 'chest');
      this.redrawBoth();
      return;
    }
    if (src === 'chest' && this.isInsidePlayerPanel(dropX, dropY)) {
      this.transferItem('chest', idx, 'player');
      this.redrawBoth();
      return;
    }

    // 2) Otherwise, snap back to original slot
    this.redrawBoth();
  }

  isInsidePlayerPanel(x, y) {
    // Left panel: x in [80, 80+panelW], y in [80, 80+panelH]
    return x >= 80 && x <= 80 + this.panelW && y >= 80 && y <= 80 + this.panelH;
  }

  isInsideChestPanel(x, y) {
    if (!this.showChest) return false;
    // Right panel: x in [chestPanelX, chestPanelX+panelW], y in [chestPanelY, chestPanelY+panelH]
    return (
      x >= this.chestPanelX &&
      x <= this.chestPanelX + this.panelW &&
      y >= this.chestPanelY &&
      y <= this.chestPanelY + this.panelH
    );
  }

  transferItem(fromPanel, fromIdx, toPanel) {
    let fromArr, toArr;
    if (fromPanel === 'player') {
      fromArr = this.playerInv;
      toArr = this.chestInv;
    } else {
      fromArr = this.chestInv;
      toArr = this.playerInv;
    }

    const stack = fromArr[fromIdx];
    if (!stack) return;

    // If the same icon already exists in destination, just add counts
    const existing = toArr.find(i => i.iconKey === stack.iconKey);
    if (existing) {
      existing.count += stack.count;
    } else {
      toArr.push({ iconKey: stack.iconKey, count: stack.count });
    }

    // Remove it entirely from the source array
    fromArr.splice(fromIdx, 1);
  }

  redrawBoth() {
    // Clear everything and draw fresh
    this.uiGroup.clear(true, true);
    this.drawSlots();
  }

  close() {
    this.scene.stop('InventoryScene');
    this.scene.resume('Main');
  }
}
