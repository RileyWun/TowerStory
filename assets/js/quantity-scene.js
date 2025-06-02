export class QuantityScene extends Phaser.Scene {
  constructor() {
    super('QuantityScene');
  }

  init(data) {
    // data: { iconKey, maxCount, sellPrice, callback }
    this.iconKey   = data.iconKey;
    this.maxCount  = data.maxCount;
    this.sellPrice = data.sellPrice;
    this.callback  = data.callback; // fn(selectedQuantity)
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const boxW = 300, boxH = 180;
    const boxX = (w - boxW) / 2, boxY = (h - boxH) / 2;

    // Semi‐opaque backdrop
    this.add.graphics()
      .fillStyle(0x000000, 0.7)
      .fillRect(0, 0, w, h);

    // Dialog background
    this.add.rectangle(
      boxX + boxW/2, boxY + boxH/2,
      boxW, boxH,
      0x333333, 0.95
    ).setStrokeStyle(2, 0xffffff);

    // Title: “How many {iconKey} to sell?”
    this.add.text(boxX + 20, boxY + 20,
      `Sell how many ${this.iconKey}?`, {
        fontSize: '18px', fill: '#fff'
      }
    );

    // Show current selection (starts at 1)
    this.selected = 1;
    this.displayText = this.add.text(
      boxX + boxW - 20, boxY + 20,
      `1`, { fontSize: '18px', fill: '#ff0' }
    ).setOrigin(1, 0);

    // Draw the slider line
    const lineY = boxY + 70;
    const lineX1 = boxX + 40;
    const lineX2 = boxX + boxW - 40;
    this.add.line(
      0, 0,
      lineX1, lineY, lineX2, lineY,
      0xffffff
    ).setLineWidth(2);

    // Draw the draggable knob at the leftmost end initially
    this.knob = this.add.circle(lineX1, lineY, 10, 0xffcc00)
      .setInteractive({ draggable: true });
    this.knob.setData('minX', lineX1);
    this.knob.setData('maxX', lineX2);

    // When dragging, clamp X between [minX, maxX] and update selected
    this.input.setDraggable(this.knob);
    this.input.on('drag', (pointer, knob, dragX, dragY) => {
      const minX = knob.getData('minX');
      const maxX = knob.getData('maxX');
      if (dragX < minX) dragX = minX;
      if (dragX > maxX) dragX = maxX;
      knob.x = dragX;
      // Compute fraction = (x − minX)/(maxX − minX)
      const frac = (knob.x - minX) / (maxX - minX);
      // selected = round(frac*(maxCount−1)) + 1
      const sel = Math.round(frac * (this.maxCount - 1)) + 1;
      this.selected = Phaser.Math.Clamp(sel, 1, this.maxCount);
      this.displayText.setText(`${this.selected}`);
    });

    // Show “× sellPrice each” under the slider
    this.add.text(
      boxX + 20, boxY + 100,
      `Price each: ${this.sellPrice}¢`, {
        fontSize: '16px', fill: '#fff'
      }
    );

    // “Confirm” button
    const confirmBtn = this.add.text(
      boxX + 60, boxY + boxH - 40,
      '[ Confirm ]', {
        fontSize: '16px', fill: '#44ff44'
      }
    ).setInteractive();
    confirmBtn.on('pointerdown', () => {
      // Pass back the chosen quantity, then close
      if (this.callback) this.callback(this.selected);
      this.scene.stop('QuantityScene');
      this.scene.resume('TradeScene');
    });

    // “Cancel” button
    const cancelBtn = this.add.text(
      boxX + boxW - 60, boxY + boxH - 40,
      '[ Cancel ]', {
        fontSize: '16px', fill: '#ff4444'
      }
    ).setOrigin(1, 0).setInteractive();
    cancelBtn.on('pointerdown', () => {
      this.scene.stop('QuantityScene');
      this.scene.resume('TradeScene');
    });
  }
}
