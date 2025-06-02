export class QuantityScene extends Phaser.Scene {
  constructor() {
    super('QuantityScene');
  }

  init(data) {
    // data = {
    //   iconKey:   (string),   // e.g. 'potion'
    //   maxCount:  (integer),  // e.g. 7
    //   sellPrice: (integer),  // e.g. 5  (cents)
    //   callback:  (function(quantity))  // called when “Confirm” is pressed
    // }
    this.iconKey   = data.iconKey;
    this.maxCount  = data.maxCount;
    this.sellPrice = data.sellPrice;
    this.callback  = data.callback;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // (1) Dimensions for the dialog box
    const boxW = 300;
    const boxH = 160;
    const boxX = (W - boxW) / 2;    // center horizontally
    const boxY = (H - boxH) / 2;    // center vertically

    // (2) Draw the full‐screen semi‐opaque backdrop
    this.add.graphics()
      .fillStyle(0x000000, 0.7)
      .fillRect(0, 0, W, H);

    // (3) Draw the dialog box (dark grey with white stroke)
    this.add
      .rectangle(boxX + boxW/2, boxY + boxH/2, boxW, boxH, 0x333333, 0.95)
      .setStrokeStyle(2, 0xffffff);

    // (4) “Sell how many [item]?” at top
    this.add.text(
      boxX + 20,
      boxY + 20,
      `Sell how many ${this.iconKey}?`,
      { fontSize: '18px', fill: '#ffffff' }
    );

    // (5) “Qty: X” below
    this.selected = 1;
    this.displayText = this.add.text(
      boxX + 20,
      boxY + 46,
      `Qty: ${this.selected}`,
      { fontSize: '16px', fill: '#ffcc00' }
    );

    // (6) Compute slider geometry **relative to boxX, boxY**
    const knobRadius = 8;
    const padding    = 20;         // distance from box’s left/right edge
    const sliderY    = 80;         // vertical position INSIDE the box (relative)
    const lineStartX = padding + knobRadius;             // offset inside box
    const lineEndX   = boxW - padding - knobRadius;      // offset inside box

    // Draw a white line from (lineStartX, sliderY) → (lineEndX, sliderY), 
    // but offset everything by (boxX, boxY):
    this.add.line(
      boxX,          // worldX of the line’s origin
      boxY,          // worldY of the line’s origin
      lineStartX,    // local x1 (inside the box)
      sliderY,       // local y1
      lineEndX,      // local x2 (inside the box)
      sliderY,       // local y2
      0xffffff       // stroke color
    )
    .setOrigin(0, 0)
    .setLineWidth(2);

    // (7) Create the draggable knob at the LEFT endpoint initially:
    const knobWorldY = boxY + sliderY; 
    const knobWorldX = boxX + lineStartX; // this will be the “minX” in world coords

    this.knob = this.add.circle(knobWorldX, knobWorldY, knobRadius, 0xffcc00)
      .setInteractive({ draggable: true });

    // Store the absolute min and max X for the knob’s center:
    this.knob.setData('minX', boxX + lineStartX);
    this.knob.setData('maxX', boxX + lineEndX);

    // (8) Enable dragging and clamp X to [minX..maxX]:
    this.input.setDraggable(this.knob);
    this.input.on('drag', (pointer, knob, dragX, dragY) => {
      const left  = knob.getData('minX');
      const right = knob.getData('maxX');

      // Clamp dragX to within [left, right]:
      const clampedX = Phaser.Math.Clamp(dragX, left, right);
      knob.x = clampedX;

      // Figure out what fraction of the slider this is:
      const frac = (clampedX - left) / (right - left);

      // Map fraction → [1..maxCount], rounding to nearest integer:
      let qty = Math.round(frac * (this.maxCount - 1)) + 1;
      qty = Phaser.Math.Clamp(qty, 1, this.maxCount);
      this.selected = qty;

      // Update “Qty: …” display
      this.displayText.setText(`Qty: ${this.selected}`);
    });

    // (9) Show “Price each: X¢” under the slider:
    this.add.text(
      boxX + 20,
      boxY + 110,
      `Price each: ${this.sellPrice}¢`,
      { fontSize: '16px', fill: '#ffffff' }
    );

    // (10) “Confirm” button at bottom left
    const confirmBtn = this.add.text(
      boxX + 60,
      boxY + boxH - 30,
      '[ Confirm ]',
      { fontSize: '16px', fill: '#44ff44' }
    ).setInteractive();
    confirmBtn.on('pointerdown', () => {
      // invoke the callback with the chosen quantity, then close:
      if (this.callback) {
        this.callback(this.selected);
      }
      this.scene.stop('QuantityScene');
      this.scene.resume('TradeScene');
    });

    // (11) “Cancel” button at bottom right
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
