/**
 * EquipmentScene
 *
 * 7 slots (head/body/legs/feet/left-hand/right-hand/back).
 * You can drag any *single* item from your playerInv into one of these slots,
 * or drag the equipped item back out to unequip it (returning to your playerInv).
 *
 * Each slot only accepts one item.  “Left hand” and “Right hand” share the rule:
 * you can have only one weapon between those two slots, and only one shield
 * between those two slots (so if you equip a weapon in Left, Right cannot equip a
 * shield unless the weapon has been unequipped).
 *
 * Press ESC or "E" to close, which fires `equipmentChanged` back to MainScene.
 */
export class EquipmentScene extends Phaser.Scene {
  constructor() {
    super('EquipmentScene');
  }

  init(data) {
    // We expect MainScene to pass:
    //   • playerInv: the player’s inventory array (objects { iconKey, count })
    //   • equipped: an object like {
    //         head:    null or { iconKey, count, invIndex },
    //         body:    null or {...},
    //         legs:    null or {...},
    //         feet:    null or {...},
    //         leftHand:   null or {...},
    //         rightHand:  null or {...},
    //         back:    null or {...}
    //     }
    // where each “equipped” slot references exactly one item from playerInv (by index).
    this.playerInv = data.playerInv || [];
    this.equipped  = data.equipped || {
      head:    null,
      body:    null,
      legs:    null,
      feet:    null,
      leftHand:  null,
      rightHand: null,
      back:    null
    };

    // We’ll track a single dragged item from inventory or from an equipped slot:
    // { from: 'inv'|'slot', invIndex?, slotKey? }
    this.draggedItem = null;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background (semi‐dark)
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(0, 0, W, H);
    this.uiGroup = this.add.group();
    this.uiGroup.add(bg);

    // Define the 7 equipment slots in a 2×4 grid form (with one slot centered below)
    // We choose 120×120 px boxes, spaced by 20 px.  Center them on screen.
    const slotSize = 96;
    const padding = 16;
    const centerX = W / 2;
    const centerY = H / 2;

    // Coordinates for each slotKey
    // We’ll position them manually:
    // Row1: head (center‐top)
    // Row2:  body, leftHand, rightHand
    // Row3:  legs, back,   feet
    // Something like this:

    this.slotPositions = {
      head:    { x: centerX,                y: centerY - slotSize*1.5 - padding },
      body:    { x: centerX - (slotSize + padding), y: centerY - slotSize/2 - padding },
      leftHand:{ x: centerX,                y: centerY - slotSize/2 - padding },
      rightHand:{x: centerX + (slotSize + padding), y: centerY - slotSize/2 - padding },
      legs:    { x: centerX - (slotSize + padding), y: centerY + slotSize/2 + padding },
      back:    { x: centerX,                y: centerY + slotSize/2 + padding },
      feet:    { x: centerX + (slotSize + padding), y: centerY + slotSize/2 + padding }
    };

    // Draw each slot’s border + label
    for (const [slotKey, pos] of Object.entries(this.slotPositions)) {
      // Draw a rectangle
      const rect = new Phaser.Geom.Rectangle(
        pos.x - slotSize/2,
        pos.y - slotSize/2,
        slotSize,
        slotSize
      );
      const gfx = this.add.graphics();
      gfx.lineStyle(2, 0xffffff);
      gfx.strokeRectShape(rect);
      this.uiGroup.add(gfx);

      // Add the slot label
      const label = this.add.text(
        pos.x,
        pos.y - slotSize/2 - 16,
        slotKey.charAt(0).toUpperCase() + slotKey.slice(1),
        { fontSize: '14px', fill: '#fff' }
      ).setOrigin(0.5, 1);
      this.uiGroup.add(label);

      // If an item is already equipped here, draw its icon
      const eq = this.equipped[slotKey];
      if (eq) {
        const icon = this.add.image(
          pos.x,
          pos.y,
          eq.iconKey
        ).setScale(0.5)
          .setDepth(10)
          .setInteractive({ draggable: true });
        // Mark this icon’s custom data so we know it’s “from slot”
        icon.setData('fromSlot', slotKey);
        this.uiGroup.add(icon);
      }
    }

    // Draw a small “Close” hint
    const closeText = this.add.text(
      W - 60,
      20,
      '[E] Close',
      { fontSize: '14px', fill: '#fff' }
    );
    this.uiGroup.add(closeText);

    // Next: we need to let the player drag items from their inventory onto these slots.
    // In order to do that, we’ll create a small “inventory pane” at the bottom of this scene,
    // showing all items in playerInv in one row (or scrollable row) so they can drag them onto a slot.

    // Let’s place a horizontal strip at the bottom 120px tall, show all items in playerInv there.
    const invY = H - 120;
    const invRect = new Phaser.Geom.Rectangle(
      20,
      invY,
      W - 40,
      100
    );
    const invBg = this.add.graphics();
    invBg.fillStyle(0x333333, 0.9);
    invBg.fillRectShape(invRect);
    this.uiGroup.add(invBg);

    // Now draw each item from playerInv in a row, sized 64×64 px, spaced by 8px
    // We will allow dragging from these icons into the equipment slots above.
    const slotSizeInv = 64;
    const paddingInv  = 8;
    let drawX = invRect.x + paddingInv;
    let drawY = invRect.y + paddingInv + (slotSizeInv/2);

    for (let idx = 0; idx < this.playerInv.length; idx++) {
      const item = this.playerInv[idx];

      const icon = this.add.image(
        drawX + (slotSizeInv/2),
        drawY,
        item.iconKey
      ).setScale(0.5)
        .setDepth(10)
        .setInteractive({ draggable: true });

      // If stack >1, show count
      if (item.count > 1) {
        const text = this.add.text(
          drawX + slotSizeInv - 14,
          drawY + slotSizeInv/2 - 14,
          item.count.toString(),
          { fontSize: '12px', fill: '#ffff00' }
        );
        this.uiGroup.add(text);
      }

      // Store custom data: it came from inventory, so fromInv: index
      icon.setData('fromInv', idx);

      this.uiGroup.add(icon);

      drawX += slotSizeInv + paddingInv;
    }

    // Set up drag & drop events for all icons in this scene:
    this.input.on('dragstart', (pointer, gameObject) => {
      // We’re beginning to drag from either an equipped slot or an inventory icon.
      const fromSlot = gameObject.getData('fromSlot');
      const fromInv  = gameObject.getData('fromInv');

      this.draggedItem = {
        gameObject,
        fromSlot: fromSlot ?? null,
        fromInv:  (fromSlot == null) ? fromInv : null
      };
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      // As we drag, just move the icon with the pointer
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on('dragend', (pointer, gameObject) => {
      // On drop, see if it’s over one of our equipment slot rectangles
      const dx = gameObject.x;
      const dy = gameObject.y;

      let droppedSlot = null;
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

      // If dropped on a valid slot:
      if (droppedSlot) {
        // Two cases:
        // 1) We dragged from inventory onto slot: equip that item
        // 2) We dragged from an already‐equipped slot onto a different slot: swap slots
        const fromSlot = this.draggedItem.fromSlot;
        const fromInv  = this.draggedItem.fromInv;

        if (fromInv != null) {
          // Equipping brand‐new from inventory
          const item = this.playerInv[fromInv];
          // Enforce “only one weapon between leftHand/rightHand”:
          if (droppedSlot === 'leftHand' || droppedSlot === 'rightHand') {
            // if item.iconKey includes “sword” or “shield”, do we check type? For now, assume iconKey starting with “sword” => weapon,
            // “shield” => shield. You can expand this later by adding a “type” property.
            const isWeapon = item.iconKey.includes('sword');
            const isShield = item.iconKey.includes('shield');

            if (isWeapon) {
              // if rightHand is occupied by a shield, we must unequip it first
              if (droppedSlot === 'leftHand' && this.equipped['rightHand']?.iconKey.includes('shield')) {
                // unequip shield -> to playerInv
                const old = this.equipped['rightHand'];
                this.unequipSlot('rightHand');
              }
              if (droppedSlot === 'rightHand' && this.equipped['leftHand']?.iconKey.includes('shield')) {
                const old = this.equipped['leftHand'];
                this.unequipSlot('leftHand');
              }
            }
            else if (isShield) {
              if (droppedSlot === 'leftHand' && this.equipped['rightHand']?.iconKey.includes('sword')) {
                this.unequipSlot('rightHand');
              }
              if (droppedSlot === 'rightHand' && this.equipped['leftHand']?.iconKey.includes('sword')) {
                this.unequipSlot('leftHand');
              }
            }
            // Otherwise, you can’t equip a non‐weapon/non‐shield in a hand at all:
            else {
              droppedSlot = null;  // invalid drop
            }
          }

          if (droppedSlot) {
            // Remove one item from inventory
            if (--this.playerInv[fromInv].count <= 0) {
              this.playerInv.splice(fromInv, 1);
            }
            // Place it in droppedSlot
            this.equipped[droppedSlot] = { iconKey: item.iconKey, invIndex: fromInv };
          }
        }
        else if (fromSlot != null) {
          // We dragged an already‐equipped item from fromSlot onto droppedSlot:
          // If droppedSlot is null (invalid), we unequip.
          if (droppedSlot !== fromSlot) {
            // Swap the two slot contents
            const temp = this.equipped[droppedSlot];
            this.equipped[droppedSlot] = this.equipped[fromSlot];
            this.equipped[fromSlot] = temp;
          }
          // (If droppedSlot === fromSlot, do nothing)
        }
      }
      // If dropped anywhere else (not on a valid slot), and it was from a slot, unequip it:
      else {
        if (this.draggedItem.fromSlot != null) {
          this.unequipSlot(this.draggedItem.fromSlot);
        }
      }

      // After any equip/unequip, redraw this scene
      this.redrawFully();

      this.draggedItem = null;
    });

    // Redraw the scene items (slots + labels + icons)
    this.redrawFully();

    // ESC or “E” closes the equipment UI
    this.input.keyboard.once('keydown-ESC', () => { this.close(); });
    this.input.keyboard.once('keydown-E',   () => { this.close(); });
  }

  /**
   * Helper to remove whatever is in `slotKey` and return it to the playerInv array.
   */
  unequipSlot(slotKey) {
    const eq = this.equipped[slotKey];
    if (!eq) return;
    const iconKey = eq.iconKey;

    // Add back one unit into inventory
    const found = this.playerInv.find(i => i.iconKey === iconKey);
    if (found) {
      found.count += 1;
    } else {
      this.playerInv.push({ iconKey, count: 1 });
    }

    // Remove from equipment
    this.equipped[slotKey] = null;
  }

  /**
   * Redraw everything completely (slots + inventory row at bottom).  Called whenever
   * we equip/unequip or first create.
   */
  redrawFully() {
    // Clear all UI objects except the full‐screen backdrop (we keep that)
    this.uiGroup.children.each(child => {
      // Do not remove the very first item (the backdrop)
      if (child !== this.uiGroup.getFirst()) {
        child.destroy();
      }
    });

    // Re‐draw all slot borders/labels and currently equipped icons
    const slotSize = 96;

    for (const [slotKey, pos] of Object.entries(this.slotPositions)) {
      // Border
      const rect = new Phaser.Geom.Rectangle(
        pos.x - slotSize/2,
        pos.y - slotSize/2,
        slotSize,
        slotSize
      );
      const gfx = this.add.graphics();
      gfx.lineStyle(2, 0xffffff);
      gfx.strokeRectShape(rect);
      this.uiGroup.add(gfx);

      // Label
      const label = this.add.text(
        pos.x,
        pos.y - slotSize/2 - 16,
        slotKey.charAt(0).toUpperCase() + slotKey.slice(1),
        { fontSize: '14px', fill: '#fff' }
      ).setOrigin(0.5, 1);
      this.uiGroup.add(label);

      // If equipped, draw icon
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

    // Re‐draw bottom inventory row
    const W = this.scale.width;
    const invRect = new Phaser.Geom.Rectangle(
      20,
      this.scale.height - 120,
      W - 40,
      100
    );
    const invBg = this.add.graphics();
    invBg.fillStyle(0x333333, 0.9);
    invBg.fillRectShape(invRect);
    this.uiGroup.add(invBg);

    // Icons
    const slotSizeInv = 64;
    const paddingInv  = 8;
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
        const text = this.add.text(
          drawX + slotSizeInv - 14,
          drawY + slotSizeInv/2 - 14,
          item.count.toString(),
          { fontSize: '12px', fill: '#ffff00' }
        );
        this.uiGroup.add(text);
      }
      icon.setData('fromInv', i);
      this.uiGroup.add(icon);

      drawX += slotSizeInv + paddingInv;
    }

    // Close hint
    const closeText = this.add.text(
      this.scale.width - 60,
      20,
      '[E] Close',
      { fontSize: '14px', fill: '#fff' }
    );
    this.uiGroup.add(closeText);
  }

  close() {
    // Emit back to MainScene, passing both updated playerInv AND equipped object
    this.scene.get('Main').events.emit('equipmentChanged', {
      playerInv: this.playerInv,
      equipped: this.equipped
    });
    this.scene.stop('EquipmentScene');
    this.scene.resume('Main');
  }
}
