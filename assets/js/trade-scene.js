export class TradeScene extends Phaser.Scene {
  constructor() {
    super('TradeScene');
  }

  init(data) {
    // Which merchant?
    this.npcId = data.npcId;

    // Set up price table:
    // buyPrice = how much the player pays to BUY (player → merchant),
    // sellPrice = how much merchant pays to BUY from player.
    this.priceTable = {
      potion:      { buyPrice: 10, sellPrice: 5 },
      sword:       { buyPrice: 50, sellPrice: 25 },
      healingHerb: { buyPrice: 3,  sellPrice: 1 }
      // …add more as needed…
    };

    // Merchant’s initial stock (hard-coded for now)
    this.merchantStock = [
      { iconKey: 'potion', count: 5 },
      { iconKey: 'sword',  count: 2 }
    ];

    // Pull the player’s inventory & coin stack out of MainScene:
    const main = this.scene.get('Main');
    this.playerInv = main.playerInv;            // reference to the array
    this.playerCoins = 0;

    // Look for a “coin” stack in playerInv, extract its count, and remove that stack.
    const coinIndex = this.playerInv.findIndex(item => item.iconKey === 'coin');
    if (coinIndex >= 0) {
      this.playerCoins = this.playerInv[coinIndex].count;
      // remove the coin stack from inventory so we don’t draw it as an icon
      this.playerInv.splice(coinIndex, 1);
    }

    // Now playerInv contains only non-coin items, and playerCoins has the actual coin count.
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // 1) Draw a semi-transparent backdrop
    this.add.graphics()
      .fillStyle(0x000000, 0.8)
      .fillRect(w / 4, h / 4, w / 2, h / 2);

    // 2) Define slot size + padding so that drawMerchantSlots() and drawPlayerSlots() can use them:
    this.slotSize    = 48;
    this.slotPadding = 20;

    // 3) Draw merchant panel (left) and player panel (right)
    const panelW = 200;
    const panelH = 300;
    const leftX  = w / 4 + 20;
    const topY   = h / 4 + 20;

    // Merchant panel background
    this.merchantPanel = this.add.rectangle(
      leftX + panelW / 2, topY + panelH / 2,
      panelW, panelH,
      0x333333, 0.9
    );
    this.merchantTitle = this.add.text(
      leftX + 10, topY + 10,
      `Shop: ${this.npcId}`, { fontSize: '18px', fill: '#fff' }
    );

    // Player panel background
    const rightX = leftX + panelW + 40;
    this.playerPanel = this.add.rectangle(
      rightX + panelW / 2, topY + panelH / 2,
      panelW, panelH,
      0x333333, 0.9
    );
    this.playerTitle = this.add.text(
      rightX + 10, topY + 10,
      'Your Inventory', { fontSize: '18px', fill: '#fff' }
    );

    // 4) Draw “Coins:” text above the player panel
    this.coinText = this.add.text(
      rightX + panelW - 10, topY - 10,
      `Coins: ${this.playerCoins}`, { fontSize: '16px', fill: '#ff0' }
    ).setOrigin(1, 0);

    // 5) “Close” button
    this.closeBtn = this.add.text(w / 2, h - 70, '[ Close ]', {
      fontSize: '18px', fill: '#ff4444'
    }).setOrigin(0.5).setInteractive();
    this.closeBtn.on('pointerdown', () => this.close());

    // 6) Allow ESC or “I” to close
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-I',   () => this.close());

    // 7) Prepare a group to hold all slot icons/text
    this.uiGroup = this.add.group();

    // 8) Save panel coordinates for drop detection
    this.leftPanelX  = leftX;
    this.leftPanelY  = topY;
    this.rightPanelX = rightX;
    this.rightPanelY = topY;

    // 9) Draw initial slots for merchant and player
    this.drawMerchantSlots();
    this.drawPlayerSlots();

    // 10) Enable drag & drop on each icon
    this.input.setTopOnly(true);
    this.input.on('dragstart', (pointer, gameObject) => {
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

  // ────────────────────────────────────────────────────────────────────────────
  // Draw merchant stock slots/icons
  // ────────────────────────────────────────────────────────────────────────────
  drawMerchantSlots() {
    // Clear previous merchant icons
    if (this.merchantSlots) {
      this.merchantSlots.forEach(s => {
        s.icon.destroy();
        if (s.countText) s.countText.destroy();
      });
    }
    this.merchantSlots = [];

    // We’ll lay out up to 2 columns × 3 rows (adjust as needed)
    const cols = 2, rows = 3;
    const startX = this.leftPanelX;
    const startY = this.leftPanelY + 40;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        if (idx >= this.merchantStock.length) break;
        const stack = this.merchantStock[idx];
        const x = startX + col * (this.slotSize + 40);
        const y = startY + row * (this.slotSize + 40);

        // Draw slot background
        const slotBg = this.add.rectangle(
          x + this.slotSize / 2, y + this.slotSize / 2,
          this.slotSize, this.slotSize,
          0x555555
        ).setStrokeStyle(2, 0xffffff);
        this.uiGroup.add(slotBg);

        // Draw the icon
        const icon = this.add.image(x + this.slotSize / 2, y + this.slotSize / 2, stack.iconKey)
          .setDisplaySize(32, 32)
          .setInteractive({ draggable: true })
          .setData('from', 'merchant')
          .setData('stockIndex', idx);

        // Draw a label: “count × buyPrice”
        const priceInfo = this.priceTable[stack.iconKey] || {};
        const priceLabel = priceInfo.buyPrice != null ? priceInfo.buyPrice : '?';
        const labelText = `${stack.count} × ${priceLabel}¢`;
        const countText = this.add.text(
          x + this.slotSize - 4, y + this.slotSize - 4,
          labelText,
          { fontSize: '12px', fill: '#ff0' }
        ).setOrigin(1);

        this.uiGroup.add(icon);
        this.uiGroup.add(countText);
        this.merchantSlots.push({ icon, stack, countText });
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Draw player inventory slots/icons (non-coin items only)
  // ────────────────────────────────────────────────────────────────────────────
  drawPlayerSlots() {
    if (this.playerSlots) {
      this.playerSlots.forEach(s => {
        s.icon.destroy();
        if (s.countText) s.countText.destroy();
      });
    }
    this.playerSlots = [];

    const cols = 4, rows = 2;
    const startX = this.rightPanelX;
    const startY = this.rightPanelY + 40;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        if (idx >= this.playerInv.length) break;
        const stack = this.playerInv[idx];
        const x = startX + col * (this.slotSize + 20);
        const y = startY + row * (this.slotSize + 20);

        // Draw slot background
        const slotBg = this.add.rectangle(
          x + this.slotSize / 2, y + this.slotSize / 2,
          this.slotSize, this.slotSize,
          0x444444
        ).setStrokeStyle(2, 0xffffff);
        this.uiGroup.add(slotBg);

        // Draw the icon
        const icon = this.add.image(x + this.slotSize / 2, y + this.slotSize / 2, stack.iconKey)
          .setDisplaySize(32, 32)
          .setInteractive({ draggable: true })
          .setData('from', 'player')
          .setData('invIndex', idx);

        // Draw count text
        const countText = this.add.text(
          x + this.slotSize - 6, y + this.slotSize - 6,
          `${stack.count}`, { fontSize: '14px', fill: '#fff' }
        ).setOrigin(1);

        this.uiGroup.add(icon);
        this.uiGroup.add(countText);
        this.playerSlots.push({ icon, stack, countText });
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Called on dragend: attempt buy/sell or snap back
  // ────────────────────────────────────────────────────────────────────────────
  handleDrop(icon, dropX, dropY) {
    const from = icon.getData('from');

    // If dragging a merchant icon into player panel → BUY
    if (from === 'merchant' && this.isInsidePlayerPanel(dropX, dropY)) {
      this.attemptBuy(icon.getData('stockIndex'));
      return;
    }
    // If dragging a player icon into merchant panel → SELL
    if (from === 'player' && this.isInsideMerchantPanel(dropX, dropY)) {
      this.attemptSell(icon.getData('invIndex'));
      return;
    }

    // Otherwise, snap everything back by re-drawing
    this.redrawAll();
  }

  isInsidePlayerPanel(x, y) {
    return (
      x >= this.rightPanelX &&
      x <= this.rightPanelX + 200 &&
      y >= this.rightPanelY &&
      y <= this.rightPanelY + 300
    );
  }

  isInsideMerchantPanel(x, y) {
    return (
      x >= this.leftPanelX &&
      x <= this.leftPanelX + 200 &&
      y >= this.leftPanelY &&
      y <= this.leftPanelY + 300
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Attempt to buy one unit of the merchantStock[stockIndex]
  // ────────────────────────────────────────────────────────────────────────────
  attemptBuy(stockIndex) {
    const stack = this.merchantStock[stockIndex];
    if (!stack) {
      this.redrawAll();
      return;
    }
    const priceInfo = this.priceTable[stack.iconKey] || {};
    if (priceInfo.buyPrice == null) {
      this.showFlashMessage('Cannot buy this!', 0xff4444);
      this.redrawAll();
      return;
    }
    const cost = priceInfo.buyPrice;
    if (this.playerCoins < cost) {
      this.showFlashMessage('Not enough coins!', 0xff4444);
      this.redrawAll();
      return;
    }

    // Deduct coins, add item to playerInv, decrement merchant stock
    this.playerCoins -= cost;
    this.addToInventory(this.playerInv, stack.iconKey, 1);
    stack.count -= 1;
    if (stack.count <= 0) {
      this.merchantStock.splice(stockIndex, 1);
    }

    this.showFlashMessage(`Bought 1 ${stack.iconKey}`, 0x44ff44);
    this.redrawAll();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Attempt to sell one unit from playerInv[invIndex]
  // ────────────────────────────────────────────────────────────────────────────
  attemptSell(invIndex) {
const stack = this.playerInv[invIndex];
   if (!stack) {
     this.redrawAll();
     return;
   }
   const priceInfo = this.priceTable[stack.iconKey] || {};
   if (priceInfo.sellPrice == null) {
     this.showFlashMessage('Cannot sell this!', 0xff4444);
     this.redrawAll();
     return;
   }

   // Instead of selling exactly 1, launch QuantityScene so user can pick [1..stack.count]
   const maxCount  = stack.count;
   const sellPrice = priceInfo.sellPrice;

   // Pause this TradeScene before launching quantity selector:
   this.scene.pause('TradeScene');
   this.scene.launch('QuantityScene', {
     iconKey:   stack.iconKey,
     maxCount:  maxCount,
     sellPrice: sellPrice,
     callback: selectedQty => {
       // When user confirms, actually sell 'selectedQty' items:
       const totalPayment = sellPrice * selectedQty;
       this.playerCoins += totalPayment;
       // Move sold items into merchantStock:
       this.addToInventory(this.merchantStock, stack.iconKey, selectedQty);
       // Decrease or remove from playerInv:
       stack.count -= selectedQty;
       if (stack.count <= 0) {
         this.playerInv.splice(invIndex, 1);
       }
       this.showFlashMessage(`Sold ${selectedQty} ${stack.iconKey}`, 0x44ff44);
       this.redrawAll();
     }
   });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Utility: add qty of iconKey to arr (stacking if exists)
  // ────────────────────────────────────────────────────────────────────────────
  addToInventory(arr, iconKey, qty) {
    const existing = arr.find(i => i.iconKey === iconKey);
    if (existing) {
      existing.count += qty;
    } else {
      arr.push({ iconKey, count: qty });
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Completely redraw merchant + player panels + coin text
  // ────────────────────────────────────────────────────────────────────────────
  redrawAll() {
    this.uiGroup.clear(true, true);
    this.drawMerchantSlots();
    this.drawPlayerSlots();
    this.coinText.setText(`Coins: ${this.playerCoins}`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Flash a brief message in the center for feedback
  // ────────────────────────────────────────────────────────────────────────────
  showFlashMessage(text, color = 0xffffff) {
    const w = this.scale.width;
    const h = this.scale.height;
    const msg = this.add.text(w/2, h/2, text, {
      fontSize: '20px', fill: `#${color.toString(16)}` 
    }).setOrigin(0.5);
    this.time.delayedCall(1000, () => msg.destroy());
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Close the trade, write back playerInv + playerCoins into MainScene, resume
  // ────────────────────────────────────────────────────────────────────────────
  close() {
    const main = this.scene.get('Main');
    main.playerInv   = this.playerInv;
    main.playerCoins = this.playerCoins;
    this.scene.stop('TradeScene');
    main.scene.resume('Main');
  }
}
