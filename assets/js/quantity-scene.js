export class QuantityScene extends Phaser.Scene {
  constructor() {
    super('QuantityScene');
  }

  init(data) {
    // data passed in: { iconKey, maxCount, sellPrice, callback }
    this.iconKey   = data.iconKey;
    this.maxCount  = data.maxCount;
    this.sellPrice = data.sellPrice;
    this.callback  = data.callback; // function(selectedQuantity)
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Define box dimensions
    const boxW = 300;
    const boxH = 160;
    const boxX = (w - boxW) / 2;
    const boxY = (h - boxH) / 2;

    // 1) Semi-opaque full-screen backdrop
    this.add.graphics()
      .fillStyle(0x000000, 0.7)
      .fillRect(0, 0, w, h);

    // 2) Dialog background rectangle (slightly inset)
    this.add.rectangle(
      boxX + boxW / 2,
      boxY + boxH / 2,
      boxW,
      boxH,
      0x333333,
      0.95
    )
    .setStrokeStyle(2, 0xffffff);

    // 3) Title text: “Sell how many {iconKey}?”
    const title = `Sell how many ${this.iconKey}?`;
    this.add.text(
      boxX + 20,
      boxY + 20,
      title,
      { fontSize: '18px', fill: '#ffffff' }
    );

    // 4) Numeric display (initially “1”) just below the title
    this.selected = 1;
    this.displayText = this.add.text(
      boxX + 20,
      boxY + 46,
      `Qty: ${this.selected}`,
      { fontSize: '16px', fill: '#ffcc00' }
    );

    // 5) Draw the horizontal slider line inside the box
    //    We leave 20px padding on each side
    const linePadding = 20;
    const lineX1 = boxX + linePadding;
    const lineX2 = boxX + boxW - linePadding;
    const lineY  = boxY + 80;

    this.add.line(
      0, 0,
      lineX1, lineY,
      lineX2, lineY,
      0xffffff
    )
    .setLineWidth(2);

    // 6) Create a draggable knob (8px radius) at the left end
    this.knob = this.add.circle(lineX1, lineY, 8, 0xffcc00)
      .setInteractive({ draggable: true });
    // store minX/maxX on it
    this.knob.setData('minX', lineX1);
    this.knob.setData('maxX', lineX2);

    // 7) Handle dragging: clamp between minX and maxX, recalc quantity
    this.input.setDraggable(this.knob);
    this.input.on('drag', (pointer, knob, dragX, dragY) => {
      const minX = knob.getData('minX');
      const maxX = knob.getData('maxX');

      // Clamp the knob’s X
      if (dragX < minX) dragX = minX;
      if (dragX > maxX) dragX = maxX;
      knob.x = dragX;

      // Compute fraction of the track [0..1]:
      const frac = (knob.x - minX) / (maxX - minX);
      // Convert to a quantity between 1 and maxCount:
      let sel = Math.round(frac * (this.maxCount - 1)) + 1;
      sel = Phaser.Math.Clamp(sel, 1, this.maxCount);
      this.selected = sel;

      // Update numeric display
      this.displayText.setText(`Qty: ${this.selected}`);
    });

    // 8) “Price each: {sellPrice}¢” under the slider
    this.add.text(
      boxX + 20,
      boxY + 110,
      `Price each: ${this.sellPrice}¢`,
      { fontSize: '16px', fill: '#ffffff' }
    );

    // 9) “Confirm” button
    const confirmBtn = this.add.text(
      boxX + 60,
      boxY + boxH - 30,
      '[ Confirm ]',
      { fontSize: '16px', fill: '#44ff44' }
    )
    .setInteractive();
    confirmBtn.on('pointerdown', () => {
      // Invoke callback with the chosen quantity, then close
      if (this.callback) {
        this.callback(this.selected);
      }
      this.scene.stop('QuantityScene');
      this.scene.resume('TradeScene');
    });

    // 10) “Cancel” button
    const cancelBtn = this.add.text(
      boxX + boxW - 60,
      boxY + boxH - 30,
      '[ Cancel ]',
      { fontSize: '16px', fill: '#ff4444' }
    )
    .setOrigin(1, 0)
    .setInteractive();
    cancelBtn.on('pointerdown', () => {
      this.scene.stop('QuantityScene');
      this.scene.resume('TradeScene');
    });
  }
}
