// assets/js/equipment‐scene.js

/**
 * EquipmentScene
 *
 * 7 slots (head/body/legs/feet/left-hand/right-hand/back).
 * Each slot is 80×80px, spaced out with extra padding, and all are
 * drawn on top of a semi‐opaque background rectangle.
 *
 * Drag any item from the bottom inventory strip into one of these slots
 * to equip it (subject to “one weapon / one shield between left/right hand” rule).
 * Drag an equipped item back into empty space to unequip it (it returns to playerInv).
 *
 * Press ESC or “E” to close, which emits `equipmentChanged` back to MainScene,
 * passing the updated `playerInv` array and `equipped` object.
 */
export class EquipmentScene extends Phaser.Scene {
  constructor() {
    super('EquipmentScene');
  }

  init(data) {
    // We expect MainScene to pass:
    //   • playerInv: the player’s inventory array [{ iconKey, count }, …]
    //   • equipped:   an object with 7 keys (head, body, legs, feet, leftHand, rightHand, back)
    //                each value is either null or { iconKey, invIndex }
    this.playerInv = data.playerInv || [];
    this.equipped  = data.equipped || {
      head:     null,
      body:     null,
      legs:     null,
      feet:     null,
      leftHand:  null,
      rightHand: null,
      back:     null
    };

    // We’ll use this to keep track of any dragged icon:
    // { gameObject, fromSlot, fromInv }
    this.draggedItem = null;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Draw a semi‐opaque full‐screen dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, W, H);
    this.uiGroup = this.add.group();
    this.uiGroup.add(overlay);

    // —――――――――――――――――――――――――――――――――――――――
    // 1) Draw the background panel behind the equipment grid
    // —――――――――――――――――――――――――――――――――――――――
    // We'll make the panel just large enough to comfortably contain all 7 slots + padding.
    // Slot size: 80px; padding between slots: 20px
    const slotSize = 80;
    const padding  = 20;

    // The equipment layout (we want it approximately centered).  We'll compute the
    // panel width/height based on slot arrangement:
    //
    //    [ head   ]
    //
    // [ body ][ leftHand ][ rightHand ]
    //
    // [ legs  ][   back   ][  feet    ]
    //
    // In other words:
    // - top row has 1 slot (head), centered.
    // - middle row has 3 slots (body, leftHand, rightHand).
    // - bottom row has 3 slots (legs, back, feet).
    //
    // Panel width = 3 * slotSize + 4 * padding  (left margin + between slots + right margin)
    // Panel height = (1 * slotSize + padding) + (slotSize + padding) + (slotSize + padding)
    //              = 3*slotSize + 4*padding

    const panelCols = 3;
    const panelRows = 3; // (we’re treating “head” row as a full‐width band)

    const panelWidth  = panelCols * slotSize + (panelCols + 1) * padding;
    const panelHeight = 3 * slotSize + 4 * padding;

    const panelX = (W - panelWidth) / 2;
    const panelY = (H - panelHeight) / 2;

    // Draw the panel background (a rounded rectangle for style)
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x222222, 0.85);
    panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 12);
    this.uiGroup.add(panelBg);

    // —――――――――――――――――――――――――――――――――――――――
    // 2) Compute exact positions for each slot key
    // —――――――――――――――――――――――――――――――――――――――
    //
    // For convenience, we’ll pre‐compute the (x,y) of each slot’s center.
    // Let's call “slot grid origins” as follows:
    //
    //   Row 0: head sits in the center column of a 3‐column grid.
    //   Row 1: body is in column 0, leftHand in column 1, rightHand in column 2.
    //   Row 2: legs in column 0, back in column 1, feet in column 2.
    //
    // Then we shift everything by panelX + padding to find pixel coords.

    this.slotPositions = {};

    const gridX = (col) => panelX + padding + col * (slotSize + padding) + slotSize/2;
    const gridY = (row) => panelY + padding + row * (slotSize + padding) + slotSize/2;

    // head  = row 0, col 1
    this.slotPositions.head = {
      x: gridX(1),
      y: gridY(0)
    };

    // body      = row 1, col 0
    // leftHand  = row 1, col 1
    // rightHand = row 1, col 2
    this.slotPositions.body = {
      x: gridX(0),
      y: gridY(1)
    };
    this.slotPositions.leftHand = {
      x: gridX(1),
      y: gridY(1)
    };
    this.slotPositions.rightHand = {
      x: gridX(2),
      y: gridY(1)
    };

    // legs = row 2, col 0
    // back = row 2, col 1
    // feet = row 2, col 2
    this.slotPositions.legs = {
      x: gridX(0),
      y: gridY(2)
    };
    this.slotPositions.back = {
      x: gridX(1),
      y: gridY(2)
    };
    this.slotPositions.feet = {
      x: gridX(2),
      y: gridY(2)
    };

    // —――――――――――――――――――――――――――――――――――――――
    // 3) Draw each slot & its label, plus any currently‐equipped icon
    // —――――――――――――――――――――――――――――――――――――――
    for (const [slotKey, pos] of Object.entries(this.slotPositions)) {
      // Draw the slot border (white outline)
      const rect = new Phaser.Geom.Rectangle(
        pos.x - slotSize/2,
        pos.y - slotSize/2,
        slotSize,
        slotSize
      );
      const border = this.add.graphics();
      border.lineStyle(2, 0xffffff);
      border.strokeRectShape(rect);
      this.uiGroup.add(border);

      // Add the text label slightly above the slot
      const label = this.add.text(
        pos.x,
        pos.y - slotSize/2 - 16,
        slotKey.charAt(0).toUpperCase() + slotKey.slice(1),
        { fontSize: '14px', fill: '#ffffff' }
      ).setOrigin(0.5, 1);
      this.uiGroup.add(label);

      // If something is already equipped here, draw its icon (draggable)
      const eq = this.equipped[slotKey];
      if (eq) {
        const icon = this.add.image(
          pos.x,
          pos.y,
          eq.iconKey
        ).setScale(0.5)
          .setDepth(10)
          .setInteractive({ draggable: true });

        // Tag it so we know it came from this slot
        icon.setData('fromSlot', slotKey);

        this.uiGroup.add(icon);
      }
    }

    // —――――――――――――――――――――――――――――――――――――――
    // 4) Draw bottom “inventory strip” so players can drag items into slots
    // —――――――――――――――――――――――――――――――――――――――
    const invPanelHeight = 120;
    const invPanelY = panelY + panelHeight + padding;

    const invRect = new Phaser.Geom.Rectangle(
      panelX,
      invPanelY,
      panelWidth,
      invPanelHeight
    );
    const invBg = this.add.graphics();
    invBg.fillStyle(0x333333, 0.9);
    invBg.fillRoundedRect(invRect.x, invRect.y, invRect.width, invRect.height, 8);
    this.uiGroup.add(invBg);

    // Draw each item in playerInv as a 64×64 icon, spaced by 12px
    const slotSizeInv = 64;
    const paddingInv  = 12;
    let drawX = invRect.x + paddingInv;
    let drawY = invRect.y + paddingInv + slotSizeInv/2;

    for (let i = 0; i < this.playerInv.length; i++) {
      const item = this.playerInv[i];
      const icon = this.add.image(
        drawX + slotSizeInv/2,
        drawY,
        item.iconKey
      ).setScale(0.5)
        .setDepth(10)
        .setInteractive({ draggable: true });

      // If count > 1, display the count at bottom‐right of icon
      if (item.count > 1) {
        const countText = this.add.text(
          drawX + slotSizeInv - 14,
          drawY + slotSizeInv/2 - 14,
          item.count.toString(),
          { fontSize: '12px', fill: '#ffff00' }
        );
        this.uiGroup.add(countText);
      }

      // Tag it so we know it came from inventory index i
      icon.setData('fromInv', i);
      this.uiGroup.add(icon);

      drawX += slotSizeInv + paddingInv;
    }

    // Add a “Close” hint in the top‐right corner of the panel background
    const closeHint = this.add.text(
      panelX + panelWidth - 60,
      panelY + 8,
      '[E] Close',
      { fontSize: '14px', fill: '#ffffff' }
    );
    this.uiGroup.add(closeHint);

    // —――――――――――――――――――――――――――――――――――――――
    // 5) Set up drag events for all draggable icons we created
    // —――――――――――――――――――――――――――――――――――――――
    this.input.on('dragstart', (pointer, gameObject) => {
      // Record where the drag started from:
      const fromSlot = gameObject.getData('fromSlot');
      const fromInv  = gameObject.getData('fromInv');
      this.draggedItem = {
        gameObject,
        fromSlot: fromSlot != null ? fromSlot : null,
        fromInv:  fromInv != null   ? fromInv  : null
      };
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      // Simply move the icon with the pointer
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on('dragend', (pointer, gameObject) => {
      // When drag ends, see if we dropped over any valid slot
      const dx = gameObject.x;
      const dy = gameObject.y;
      let droppedSlot = null;

      // Check each slot’s rectangle
      for (const [slotKey, pos] of Object.entries(this.slotPositions)) {
        const rect = new Phaser.Geom.Rectangle(
          pos.x - slotSize/2,
          pos.y - slotSize/2,
          slotSize,
          slotSize
        );
        if (rect.contains(dx, dy)) {
          droppedSlot = slotKey;
          break;
        }
      }

      // If we dropped on a valid slot, attempt to equip (or swap)
      if (droppedSlot) {
        const { fromSlot, fromInv } = this.draggedItem;

        // Case A: dragged from inventory → equip into droppedSlot
        if (fromInv != null) {
          const item = this.playerInv[fromInv];

          // Enforce “only one weapon between leftHand/rightHand” logic:
          if (droppedSlot === 'leftHand' || droppedSlot === 'rightHand') {
            // Suppose iconKey containing "sword" means weapon; "shield" means shield
            const isWeapon = item.iconKey.includes('sword');
            const isShield = item.iconKey.includes('shield');
            if (isWeapon) {
              // If the opposite hand has a shield equipped, unequip it first:
              const opposite = (droppedSlot === 'leftHand') ? 'rightHand' : 'leftHand';
              if (this.equipped[opposite]?.iconKey.includes('shield')) {
                this.unequipSlot(opposite);
              }
            }
            else if (isShield) {
              const opposite = (droppedSlot === 'leftHand') ? 'rightHand' : 'leftHand';
              if (this.equipped[opposite]?.iconKey.includes('sword')) {
                this.unequipSlot(opposite);
              }
            }
            else {
              // Non‐weapon, non‐shield items cannot go in a hand slot:
              droppedSlot = null;
            }
          }

          if (droppedSlot) {
            // Remove one unit from playerInv
            if (--this.playerInv[fromInv].count <= 0) {
              this.playerInv.splice(fromInv, 1);
            }
            // Equip it into droppedSlot
            this.equipped[droppedSlot] = {
              iconKey: item.iconKey,
              invIndex: fromInv
            };
          }
        }
        // Case B: dragged from one slot to another (swap)
        else if (fromSlot != null) {
          if (droppedSlot !== fromSlot) {
            // Swap contents
            const temp = this.equipped[droppedSlot];
            this.equipped[droppedSlot] = this.equipped[fromSlot];
            this.equipped[fromSlot] = temp;
          }
          // If dropped on same slot, do nothing
        }
      }
      // If we did not drop on any valid slot and we started from an equipped slot:
      else {
        if (this.draggedItem.fromSlot != null) {
          this.unequipSlot(this.draggedItem.fromSlot);
        }
      }

      // Redraw entire scene to reflect any changes
      this.redrawFully();
      this.draggedItem = null;
    });

    // ESC or “E” closes equipment UI
    this.input.keyboard.once('keydown-ESC', () => this.close());
    this.input.keyboard.once('keydown-E',   () => this.close());
  }

  /**
   * Helper: Unequip whatever’s in `slotKey` by putting it back into playerInv.
   */
  unequipSlot(slotKey) {
    const eq = this.equipped[slotKey];
    if (!eq) return;
    const iconKey = eq.iconKey;

    // Return one unit to inventory (stack if exists)
    const stack = this.playerInv.find(i => i.iconKey === iconKey);
    if (stack) {
      stack.count += 1;
    } else {
      this.playerInv.push({ iconKey, count: 1 });
    }

    // Remove from that equip slot
    this.equipped[slotKey] = null;
  }

  /**
   * Re‐draw everything except the background overlay:
   *   • Redraw slot outlines + labels + equipped icons
   *   • Redraw the bottom inventory strip
   */
  redrawFully() {
    // Keep the very first child (the overlay); destroy everything else
    const children = this.uiGroup.getChildren();
    for (let i = children.length - 1; i >= 1; i--) {
      children[i].destroy();
    }

    const slotSize = 80;
    const padding  = 20;

    // 1) Re‐draw slot frames and labels and any equipped icon
    for (const [slotKey, pos] of Object.entries(this.slotPositions)) {
      const rect = new Phaser.Geom.Rectangle(
        pos.x - slotSize/2,
        pos.y - slotSize/2,
        slotSize,
        slotSize
      );
      const border = this.add.graphics();
      border.lineStyle(2, 0xffffff);
      border.strokeRectShape(rect);
      this.uiGroup.add(border);

      const label = this.add.text(
        pos.x,
        pos.y - slotSize/2 - 16,
        slotKey.charAt(0).toUpperCase() + slotKey.slice(1),
        { fontSize: '14px', fill: '#ffffff' }
      ).setOrigin(0.5, 1);
      this.uiGroup.add(label);

      const eq = this.equipped[slotKey];
      if (eq) {
        const icon = this.add.image(
          pos.x,
          pos.y,
          eq.iconKey
        ).setScale(0.5)
          .setDepth(10)
          .setInteractive({ draggable: true });
        icon.setData('fromSlot', slotKey);
        this.uiGroup.add(icon);
      }
    }

    // 2) Re‐draw bottom inventory strip
    const W = this.scale.width;
    // Recompute panelX/panelWidth to know where to place inventory strip
    const panelCols = 3;
    const panelRows = 3;
    const slotW2 = slotSize;
    const pad2   = padding;
    // panelWidth = 3*slotSize + 4*padding
    const panelWidth  = panelCols * slotW2 + (panelCols + 1) * pad2;
    const panelHeight = panelRows * slotW2 + (panelRows + 1) * pad2;
    const panelX = (W - panelWidth) / 2;
    const panelY = (this.scale.height - panelHeight) / 2;

    const invPanelY = panelY + panelHeight + pad2;
    const invRect = new Phaser.Geom.Rectangle(
      panelX,
      invPanelY,
      panelWidth,
      120
    );
    const invBg = this.add.graphics();
    invBg.fillStyle(0x333333, 0.9);
    invBg.fillRoundedRect(invRect.x, invRect.y, invRect.width, invRect.height, 8);
    this.uiGroup.add(invBg);

    const slotSizeInv = 64;
    const paddingInv  = 12;
    let drawX = invRect.x + paddingInv;
    let drawY = invRect.y + paddingInv + slotSizeInv/2;

    for (let i = 0; i < this.playerInv.length; i++) {
      const item = this.playerInv[i];
      const icon = this.add.image(
        drawX + slotSizeInv/2,
        drawY,
        item.iconKey
      ).setScale(0.5)
        .setDepth(10)
        .setInteractive({ draggable: true });

      if (item.count > 1) {
        const ct = this.add.text(
          drawX + slotSizeInv - 14,
          drawY + slotSizeInv/2 - 14,
          item.count.toString(),
          { fontSize: '12px', fill: '#ffff00' }
        );
        this.uiGroup.add(ct);
      }
      icon.setData('fromInv', i);
      this.uiGroup.add(icon);

      drawX += slotSizeInv + paddingInv;
    }

    const closeHint = this.add.text(
      panelX + panelWidth - 60,
      panelY + 8,
      '[E] Close',
      { fontSize: '14px', fill: '#ffffff' }
    );
    this.uiGroup.add(closeHint);
  }

  close() {
    // Emit back to MainScene with updated playerInv + equipped
    this.scene.get('Main').events.emit('equipmentChanged', {
      playerInv: this.playerInv,
      equipped:  this.equipped
    });
    this.scene.stop('EquipmentScene');
    this.scene.resume('Main');
  }
}
