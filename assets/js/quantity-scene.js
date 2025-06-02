export class QuantityScene extends Phaser.Scene {
  constructor() {
    super('QuantityScene');
  }

  init(data) {
    // data = {
    //   iconKey:   (string),
    //   maxCount:  (integer),
    //   sellPrice: (integer),
    //   callback:  (function(quantity))
    // }
    this.iconKey   = data.iconKey;
    this.maxCount  = data.maxCount;
    this.sellPrice = data.sellPrice;
    this.callback  = data.callback;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // (1) Compute the box’s top‐left corner so box is centered on screen:
    const boxW = 300;
    const boxH = 160;
    const boxX = (W - boxW) / 2;
    const boxY = (H - boxH) / 2;

    // (2) Draw the semi-opaque backdrop
    this.add.graphics()
      .fillStyle(0x000000, 0.7)
      .fillRect(0, 0, W, H);

    // (3) Draw the box itself (with a white stroke):
    this.add
      .rectangle(boxX + boxW/2, boxY + boxH/2, boxW, boxH, 0x333333, 0.95)
      .setStrokeStyle(2, 0xffffff);

    // (4) Title: “Sell how many [iconKey]?”
    this.add.text(
      boxX + 20,
      boxY + 20,
      `Sell how many ${this.iconKey}?`,
      { fontSize: '18px', fill: '#ffffff' }
    );

    // (5) Numeric “Qty: X” immediately under the title
    this.selected = 1; // default selection
    this.displayText = this.add.text(
      boxX + 20,
      boxY + 46,
      `Qty: ${this.selected}`,
      { fontSize: '16px', fill: '#ffcc00' }
    );

    // (6) Draw the slider line, but inset by knobRadius on each side
    const knobRadius = 8;
    const padding    = 20; // original padding from the box edge

    // The “usable” endpoints for the **knob’s center**:
    const minX = boxX + padding + knobRadius;
    const maxX = boxX + boxW - padding - knobRadius;
    const lineY = boxY + 80;

    // Draw a white line from (minX, lineY) to (maxX, lineY):
    this.add.line(0, 0, minX, lineY, maxX, lineY, 0xffffff)
      .setLineWidth(2);

    // (7) Create a draggable knob (an 8px‐radius circle) at minX initially:
    this.knob = this.add.circle(minX, lineY, knobRadius, 0xffcc00)
      .setInteractive({ draggable: true })
      .setData('minX', minX)
      .setData('maxX', maxX);

    // (8) Handle drag: clamp X to [minX, maxX], then recompute “selected”:
    this.input.setDraggable(this.knob);
    this.input.on('drag', (pointer, knob, dragX, dragY) => {
      const left  = knob.getData('minX');
      const right = knob.getData('maxX');

      // Clamp dragX to [left, right]
      let newX = Phaser.Math.Clamp(dragX, left, right);
      knob.x = newX;

      // Compute fraction (0.0 → 1.0) across the line:
      const frac = (newX - left) / (right - left);

      // Map to [1 .. maxCount], rounding to nearest integer:
      let sel = Math.round(frac * (this.maxCount - 1)) + 1;
      sel = Phaser.Math.Clamp(sel, 1, this.maxCount);
      this.selected = sel;

      // Update the “Qty:” text
      this.displayText.setText(`Qty: ${this.selected}`);
    });

    // (9) Show “Price each: …¢” under the slider
    this.add.text(
      boxX + 20,
      boxY + 110,
      `Price each: ${this.sellPrice}¢`,
      { fontSize: '16px', fill: '#ffffff' }
    );

    // (10) “Confirm” button
    const confirmBtn = this.add.text(
      boxX + 60,
      boxY + boxH - 30,
      '[ Confirm ]',
      { fontSize: '16px', fill: '#44ff44' }
    ).setInteractive();
    confirmBtn.on('pointerdown', () => {
      // Call back with chosen quantity, then close out this scene:
      if (this.callback) {
        this.callback(this.selected);
      }
      this.scene.stop('QuantityScene');
      this.scene.resume('TradeScene');
    });

    // (11) “Cancel” button
    const cancelBtn = this.add.text(
      boxX + boxW - 60,
      boxY + boxH - 30,
      '[ Cancel ]',
      { fontSize: '16px', fill: '#ff4444' }
    ).setOrigin(1, 0).setInteractive();
    cancelBtn.on('pointerdown', () => {
      this.scene.stop('QuantityScene');
      this.scene.resume('TradeScene');
    });
  }
}
