// ─────────────────────────────────────────────────────────────────────────────
// Trade Scene (drag‐&‐drop between merchant and player, with pricing)
// ─────────────────────────────────────────────────────────────────────────────
class TradeScene extends Phaser.Scene {
  constructor() {
    super('TradeScene');
  }

  init(data) {
    // data.npcId tells us which merchant we’re trading with
    this.npcId = data.npcId;

    // Example price tables: in a real game, load from JSON or server.
    // ‘sellPrice’ is how much merchant pays the player (buy‐from‐player).
    // ‘buyPrice’  is how much merchant charges the player (sell‐to‐player).
    this.priceTable = {
      // For simplicity, same merchant1 has these prices:
      potion:   { buyPrice: 10, sellPrice: 5 },
      sword:    { buyPrice: 50, sellPrice: 25 },
      healingHerb: { buyPrice: 3, sellPrice: 1 }
    };

    // Merchant’s stock (array of { iconKey, count })
    // You can pull this from a server or a data file; hardcoded here for demo:
    this.merchantStock = [
      { iconKey: 'potion', count:  5 },
      { iconKey: 'sword',  count:  2 }
    ];

    // Player’s inventory & currency come directly from MainScene
    this.playerInv = this.scene.get('Main').playerInv;
    // Let’s track player coins separately for easier buy/sell:
    this.playerCoins = this.scene.get('Main').playerCoins || 100;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Semi‐transparent backdrop
    this.add.graphics()
      .fillStyle(0x000000, 0.8)
      .fillRect(w/4, h/4, w/2, h/2);

    // Draw two panels: left=merchant, right=player
    const panelW = 200, panelH = 300;
    const leftX  = w/4 + 20;
    const topY   = h/4 + 20;
    this.merchantPanel = this.add.rectangle(
      leftX + panelW/2, topY + panelH/2,
      panelW, panelH,
      0x333333, 0.9
    );
    this.merchantTitle = this.add.text(leftX + 10, topY + 10,
      `Shop with ${this.npcId}`, { fontSize: '18px', fill: '#fff' }
    );

    this.playerPanel = this.add.rectangle(
      w/4 + 20 + panelW + 40 + panelW/2,
      topY + panelH/2,
      panelW, panelH,
      0x333333, 0.9
    );
    this.playerTitle = this.add.text(
      w/4 + 20 + panelW + 40 + 10, topY + 10,
      'Your Inventory', { fontSize: '18px', fill: '#fff' }
    );

    // Draw player “coin balance” above player panel
    this.coinText = this.add.text(
      w/4 + 20 + panelW + 40 + panelW - 10,
      topY - 10,
      `Coins: ${this.playerCoins}`, { fontSize: '16px', fill: '#ff0' }
    ).setOrigin(1, 0);

    // Close button
    this.closeBtn = this.add.text(w/2, h - 70, '[ Close ]', {
      fontSize: '18px', fill: '#ff4444'
    }).setOrigin(0.5)
      .setInteractive()
      .on('pointerdown', () => this.close());

    // Input keys for close
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-I',   () => this.close());

    // Prepare groups to hold slots/icons
    this.uiGroup = this.add.group();

    // Panel coords for drop checks
    this.leftPanelX  = leftX;
    this.leftPanelY  = topY;
    this.rightPanelX = w/4 + 20 + panelW + 40;
    this.rightPanelY = topY;

    // Draw initial slots
    this.drawMerchantSlots();
    this.drawPlayerSlots();

    // Enable drag & drop
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

  // Draw merchant stock slots
  drawMerchantSlots() {
    // Clear old
    if (this.merchantSlots) {
      this.merchantSlots.forEach(s => s.icon.destroy());
      this.merchantSlots = [];
    } else {
      this.merchantSlots = [];
    }
    const cols = 2, rows = 3;
    const startX = this.leftPanelX;
    const startY = this.leftPanelY + 40;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        if (idx >= this.merchantStock.length) break;
        const stock = this.merchantStock[idx];
        const x = startX + col *  (this.slotSize + 40);
        const y = startY + row * (this.slotSize + 40);

        // Draw slot background
        const slotBg = this.add.rectangle(
          x + this.slotSize/2, y + this.slotSize/2,
          this.slotSize, this.slotSize,
          0x555555
        ).setStrokeStyle(2, 0xffffff);
        this.uiGroup.add(slotBg);

        // Icon
        const icon = this.add.image(x + this.slotSize/2, y + this.slotSize/2, stock.iconKey)
          .setDisplaySize(32, 32)
          .setInteractive({ draggable: true })
          .setData('from', 'merchant')
          .setData('stockIndex', idx);

        // Label with “count × price”
        const priceInfo = this.priceTable[stock.iconKey];
        const priceText = priceInfo ? priceInfo.buyPrice : '?';
        const labelText = `${stock.count} × ${priceText}¢`;
        const lbl = this.add.text(x + this.slotSize - 4, y + this.slotSize - 4, labelText, {
          fontSize: '12px', fill: '#ff0'
        }).setOrigin(1);

        this.uiGroup.add(icon);
        this.uiGroup.add(lbl);

        this.merchantSlots.push({ icon, stack: stock });
      }
    }
  }

  // Draw player inventory slots, similar to InventoryScene
  drawPlayerSlots() {
    if (this.playerSlots) {
      this.playerSlots.forEach(s => s.icon.destroy());
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

        // Slot background
        const slotBg = this.add.rectangle(
          x + this.slotSize/2, y + this.slotSize/2,
          this.slotSize, this.slotSize,
          0x444444
        ).setStrokeStyle(2, 0xffffff);
        this.uiGroup.add(slotBg);

        // Icon
        const icon = this.add.image(x + this.slotSize/2, y + this.slotSize/2, stack.iconKey)
          .setDisplaySize(32, 32)
          .setInteractive({ draggable: true })
          .setData('from', 'player')
          .setData('invIndex', idx);

        // Count text
        const countText = this.add.text(
          x + this.slotSize - 6, y + this.slotSize - 6,
          `${stack.count}`, { fontSize: '14px', fill: '#fff' }
        ).setOrigin(1);

        this.uiGroup.add(icon);
        this.uiGroup.add(countText);
        this.playerSlots.push({ icon, stack });
      }
    }
  }

  // Called on drag end to process buy/sell or revert
  handleDrop(icon, dropX, dropY) {
    const from = icon.getData('from');

    if (from === 'merchant' && this.isInsidePlayerPanel(dropX, dropY)) {
      // Attempt to BUY
      this.attemptBuy(icon.getData('stockIndex'));
      return;
    }
    if (from === 'player' && this.isInsideMerchantPanel(dropX, dropY)) {
      // Attempt to SELL
      this.attemptSell(icon.getData('invIndex'));
      return;
    }

    // Otherwise, just redraw to snap back
    this.redrawAll();
  }

  // Check drop zones
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

  attemptBuy(stockIndex) {
    const stock = this.merchantStock[stockIndex];
    if (!stock) return;

    const priceInfo = this.priceTable[stock.iconKey];
    if (!priceInfo) return;

    const cost = priceInfo.buyPrice;
    if (this.playerCoins < cost) {
      // Not enough coins
      this.showFlashMessage('Not enough coins!', 0xff4444);
      this.redrawAll();
      return;
    }

    // Deduct coins, add item to playerInv, reduce merchant stock
    this.playerCoins -= cost;
    this.addToInventory(this.playerInv, stock.iconKey, 1);
    stock.count -= 1;
    if (stock.count <= 0) {
      this.merchantStock.splice(stockIndex, 1);
    }

    this.showFlashMessage(`Bought 1 ${stock.iconKey}`, 0x44ff44);
    this.redrawAll();
  }

  attemptSell(invIndex) {
    const stack = this.playerInv[invIndex];
    if (!stack) return;

    const priceInfo = this.priceTable[stack.iconKey];
    if (!priceInfo) return;

    const payment = priceInfo.sellPrice;
    this.playerCoins += payment;
    this.addToInventory(this.merchantStock, stack.iconKey, 1);
    stack.count -= 1;
    if (stack.count <= 0) {
      this.playerInv.splice(invIndex, 1);
    }

    this.showFlashMessage(`Sold 1 ${stack.iconKey}`, 0x44ff44);
    this.redrawAll();
  }

  addToInventory(arr, iconKey, qty) {
    const existing = arr.find(i => i.iconKey === iconKey);
    if (existing) {
      existing.count += qty;
    } else {
      arr.push({ iconKey, count: qty });
    }
  }

  // Re‐render everything (slots, icons, coin text)
  redrawAll() {
    this.uiGroup.clear(true, true);
    this.drawMerchantSlots();
    this.drawPlayerSlots();
    this.coinText.setText(`Coins: ${this.playerCoins}`);
  }

  // Small floating text at center of TradeScene for feedback
  showFlashMessage(text, color = 0xffffff) {
    const w = this.scale.width, h = this.scale.height;
    const msg = this.add.text(w/2, h/2, text, {
      fontSize: '20px', fill: `#${color.toString(16)}` 
    }).setOrigin(0.5);
    this.time.delayedCall(1000, () => msg.destroy());
  }

  close() {
    // Pass updated inventory & coin count back to MainScene
    const main = this.scene.get('Main');
    main.playerInv = this.playerInv;
    main.playerCoins = this.playerCoins;
    this.scene.stop('TradeScene');
    main.scene.resume('Main');
  }
}
