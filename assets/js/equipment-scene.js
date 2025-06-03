/**
 * EquipmentScene
 *
 * This scene displays a small “Equipment” panel with seven slots:
 *   • Head       (helmet, hats, etc.)
 *   • Body       (armor, tunics, etc.)
 *   • Legs       (pants, greaves, etc.)
 *   • Feet       (boots, sandals, etc.)
 *   • Left Hand  (shield or one-handed weapon)
 *   • Right Hand (weapon or shield)
 *   • Back       (secondary weapon, backpack, cloak, etc.)
 *
 * You should launch it from MainScene via:
 *
 *   this.scene.pause();
 *   this.scene.launch('EquipmentScene', {
 *     playerInv: this.playerInv,
 *     playerEquipment: this.playerEquipment
 *   });
 *
 * When the player closes (Esc or “E” again), we emit “equipmentClosed” back to MainScene,
 * passing both the updated playerInv array and the updated playerEquipment object.
 *
 * Dragging:
 *   • You can drag any equipped icon out of a slot.  When you drop it onto an Inventory slot,
 *     the item is removed from equipment and inserted into the first empty inventory slot
 *     (or stacked, if it matches an existing stack).  Conversely, you can drag from inventory
 *     into a compatible equipment slot (e.g. a “sword” into Right Hand).
 *
 * This version only handles “unequip → inventory.”  If you want “equip from inventory,” you
 * can check the item’s type and drop it into the correct equipment slot.  (That code path is
 * marked below as TODO – you can extend it once you have weapon/armor item-type data.)
 */

export class EquipmentScene extends Phaser.Scene {
  constructor() {
    super('EquipmentScene');
  }

  init(data) {
    // Expecting:
    //   data.playerInv       = [... ]   (array of { iconKey, count } or null)
    //   data.playerEquipment = { head:..., body:..., legs:..., feet:...,
    //                            leftHand:..., rightHand:..., back:... }
    //    each field is either null or { iconKey, count }.
    this.playerInv       = Array.isArray(data.playerInv) ? data.playerInv : [];
    this.playerEquipment = data.playerEquipment || {
      head:      null,
      body:      null,
      legs:      null,
      feet:      null,
      leftHand:  null,
      rightHand: null,
      back:      null
    };
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // 1) Background overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, W, H);

    // 2) Panel geometry
    // We want a smaller box in the center. We'll make it 350×400 pixels.
    const panelW = 350;
    const panelH = 400;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    // 3) Draw panel background (rounded rect)
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x2c2c2c, 0.95);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);

    // 4) Title “Equipment” at top‐center
    const titleText = this.add.text(
      panelX + panelW / 2,
      panelY + 16,
      'Equipment',
      { fontSize: '24px', fill: '#ffffff', fontStyle: 'bold' }
    ).setOrigin(0.5, 0);

    // 5) Define the seven equipment slot rectangles
    //    We'll arrange them roughly in a “cross” pattern:
    //
    //         [  Head  ]
    //            |
    //      [Body]–[Back]–[RightHand]
    //            |
    //    [LeftHand]-[Legs]-[Feet]
    //
    // Positions are relative to panelX/panelY. Each slot is 64×64 px.
    const slotSize = 64;
    const borderColor = 0xffffff;
    const borderWidth = 2;

    // Helper for making a slot object:
    const makeSlot = (key, x, y, label) => {
      return { key, x: panelX + x, y: panelY + y, label };
    };

    // We pick offsets so that the cross is centered.
    this.equipmentSlots = [
      makeSlot('head',      panelW / 2 - slotSize / 2, 50,  'Head'),
      makeSlot('body',      panelW / 2 - slotSize / 2 - 80, 130, 'Body'),
      makeSlot('back',      panelW / 2 - slotSize / 2 + 0, 130, 'Back'),
      makeSlot('rightHand', panelW / 2 - slotSize / 2 + 80, 130, 'Right Hand'),
      makeSlot('leftHand',  panelW / 2 - slotSize / 2 - 80, 230, 'Left Hand'),
      makeSlot('legs',      panelW / 2 - slotSize / 2 + 0,  230, 'Legs'),
      makeSlot('feet',      panelW / 2 - slotSize / 2 + 80, 230, 'Feet')
    ];

    // 6) Draw empty slot outlines & labels
    this.equipmentSlots.forEach(slot => {
      const rect = new Phaser.Geom.Rectangle(
        slot.x, slot.y,
        slotSize, slotSize
      );
      const g = this.add.graphics();
      g.lineStyle(borderWidth, borderColor);
      g.strokeRectShape(rect);

      // Label above each slot
      const txt = this.add.text(
        slot.x + slotSize / 2,
        slot.y + slotSize + 4,
        slot.label,
        { fontSize: '14px', fill: '#ffffff' }
      ).setOrigin(0.5, 0);
    });

    // 7) Draw currently equipped items (if any)
    //    Each equipment slot may hold exactly one item.  We skip null slots.
    //    We tag each icon with { from: 'equip', slotKey: <slot.key> } so
    //    drag/drop logic can know how to unequip it.

    this.equipmentIcons = {}; // map slotKey → Phaser.GameObject

    this.equipmentSlots.forEach(slot => {
      const item = this.playerEquipment[slot.key];
      if (!item) return;

      // Determine center of this slot:
      const cx = slot.x + slotSize / 2;
      const cy = slot.y + slotSize / 2;

      // Draw the icon (scaled to 0.5)
      const icon = this.add
        .image(cx, cy, item.iconKey)
        .setScale(0.5)
        .setDepth(10)
        .setInteractive({ draggable: true });

      // Store metadata for drag/drop:
      icon.setData('from', 'equip');
      icon.setData('slotKey', slot.key);

      this.equipmentIcons[slot.key] = icon;
    });

    // 8) DRAG & DROP: Unequip → Inventory
    //
    //    If the player drags an equipped icon anywhere within the panel,
    //    we interpret that as “unequip.”  We then place it back into the
    //    first available inventory slot (or stack if same iconKey exists).
    //
    //    NOTE: We do NOT support “equip from inventory” here—you can extend
    //    this handler to detect dropping onto a specific slot (e.g. head/body).
    //
    this.input.on('dragstart', (pointer, gameObject) => {
      const from     = gameObject.getData('from');
      const slotKey  = gameObject.getData('slotKey');
      if (from === 'equip' && slotKey) {
        this.dragInfo = { from, slotKey, gameObject };
      } else {
        this.dragInfo = null;
      }
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      // Move the icon with the pointer
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on('dragend', (pointer, gameObject) => {
      if (!this.dragInfo) return;
      const { from, slotKey } = this.dragInfo;
      if (from !== 'equip') return;

      // UNEQUIP: remove from equipment, put into inventory

      const item = this.playerEquipment[slotKey];
      if (!item) {
        // Shouldn't happen, but just in case:
        this.redrawEquipment();  // put icon back into its slot
        this.dragInfo = null;
        return;
      }

      // 8a) Add to playerInv
      let stacked = false;
      for (let i = 0; i < this.playerInv.length; i++) {
        const stack = this.playerInv[i];
        if (stack && stack.iconKey === item.iconKey) {
          // same type → stack counts
          stack.count += item.count;
          stacked = true;
          break;
        }
      }
      if (!stacked) {
        // find first null slot or push new
        let placed = false;
        for (let i = 0; i < this.playerInv.length; i++) {
          if (!this.playerInv[i]) {
            this.playerInv[i] = { iconKey: item.iconKey, count: item.count };
            placed = true;
            break;
          }
        }
        if (!placed) {
          this.playerInv.push({ iconKey: item.iconKey, count: item.count });
        }
      }

      // 8b) Remove from equipment
      this.playerEquipment[slotKey] = null;

      // 8c) Remove the dragged icon
      if (this.equipmentIcons[slotKey]) {
        this.equipmentIcons[slotKey].destroy();
        delete this.equipmentIcons[slotKey];
      }

      // 8d) Redraw the inventory (notify MainScene)
      //      We emit immediately so that MainScene can re-open inventory if needed.
      const main = this.scene.get('Main');
      main.events.emit('unequipped', {
        playerInv: this.playerInv,
        playerEquipment: this.playerEquipment
      });

      // Finally, close the equipment panel:
      this.closeScene();
    });

    // 9) Allow closing on ESC or “E”
    this.input.keyboard.once('keydown-ESC', () => this.closeScene());
    this.input.keyboard.once('keydown-E',   () => this.closeScene());
  }

  /**
   * If, for some reason, we want to re-draw all equipped icons
   * (e.g. after a failed drag or refresh), we can destroy existing
   * icons and recreate them.  (Not strictly needed now.)
   */
  redrawEquipment() {
    // Destroy existing icons
    for (const key in this.equipmentIcons) {
      this.equipmentIcons[key].destroy();
    }
    this.equipmentIcons = {};

    // Re-draw all non-null equipment slots
    const slotSize = 64;
    this.equipmentSlots.forEach(slot => {
      const item = this.playerEquipment[slot.key];
      if (!item) return;

      const cx = slot.x + slotSize / 2;
      const cy = slot.y + slotSize / 2;
      const icon = this.add
        .image(cx, cy, item.iconKey)
        .setScale(0.5)
        .setDepth(10)
        .setInteractive({ draggable: true });
      icon.setData('from', 'equip');
      icon.setData('slotKey', slot.key);
      this.equipmentIcons[slot.key] = icon;
    });
  }

  /**
   * Closes the equipment panel, emits data back to MainScene, and resumes.
   */
  closeScene() {
    const main = this.scene.get('Main');
    main.events.emit('equipmentClosed', {
      playerInv:       this.playerInv,
      playerEquipment: this.playerEquipment
    });
    this.scene.stop('EquipmentScene');
    this.scene.resume('Main');
  }
}
