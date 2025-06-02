// assets/js/quantity-scene.js

export class QuantityScene extends Phaser.Scene {
  constructor() {
    super('QuantityScene');
  }

  init(data) {
    // data passed in from TradeScene:
    // {
    //   iconKey:   string,   // e.g. 'potion'
    //   maxCount:  integer,  // how many the player has
    //   sellPrice: integer,  // coin price per unit
    //   callback:  function(quantity)  // called on “Confirm”
    // }
    this.iconKey   = data.iconKey;
    this.maxCount  = data.maxCount;
    this.sellPrice = data.sellPrice;
    this.callback  = data.callback;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ——————————————————————————————————————————
    // (1) Draw the semi‐transparent backdrop
    // ——————————————————————————————————————————
    this.add.graphics()
      .fillStyle(0x000000, 0.7)
      .fillRect(0, 0, W, H);

    // ——————————————————————————————————————————
    // (2) Dialogue box dimensions (centered in screen)
    // ——————————————————————————————————————————
    const boxW = 300;
    const boxH = 160;
    const boxX = (W - boxW) / 2;
    const boxY = (H - boxH) / 2;

    // Draw a dark rectangle with a white border
    this.add
      .rectangle(boxX + boxW / 2, boxY + boxH / 2, boxW, boxH, 0x333333, 0.95)
      .setStrokeStyle(2, 0xffffff);

    // ——————————————————————————————————————————
    // (3) “Sell how many [item]?” text
    // ——————————————————————————————————————————
    this.add.text(
      boxX + 20,
      boxY + 20,
      `Sell how many ${this.iconKey}?`,
      { fontSize: '18px', fill: '#ffffff' }
    );

    // ——————————————————————————————————————————
    // (4) “Qty: X” (starts at 1)
    // ——————————————————————————————————————————
    this.selected = 1;
    this.displayText = this.add.text(
      boxX + 20,
      boxY + 46,
      `Qty: ${this.selected}`,
      { fontSize: '16px', fill: '#ffcc00' }
    );

    // ——————————————————————————————————————————
    // (5) Compute slider line endpoints (world coords):
    //     - we inset by 20 px on each side
    //     - this guarantees the knob (radius 8) won’t break out
    // ——————————————————————————————————————————
    const sliderPadding = 20;    // px padding from box’s left/right
    const lineStartX = boxX + sliderPadding;
    const lineEndX   = boxX + boxW - sliderPadding;
    const sliderY    = boxY + 80;  // vertical position inside box

    // Draw the white line from (lineStartX, sliderY) → (lineEndX, sliderY)
    this.add
      .line(0, 0, lineStartX, sliderY, lineEndX, sliderY, 0xffffff)
      .setOrigin(0, 0)
      .setLineWidth(2);

    // ——————————————————————————————————————————
    // (6) Create the draggable knob (circle of radius 8 px)
    //     Place it initially at the LEFT endpoint
    // ——————————————————————————————————————————
    const knobRadius = 8;
    const knobWorldX = lineStartX; 
    const knobWorldY = sliderY;

    this.knob = this.add.circle(knobWorldX, knobWorldY, knobRadius, 0xffcc00)
      .setInteractive({ draggable: true });

    // Store the absolute min/max X for the knob’s center:
    this.knob.setData('minX', lineStartX);
    this.knob.setData('maxX', lineEndX);

    // Enable dragging and clamp X to [minX..maxX]
    this.input.setDraggable(this.knob);
    this.input.on('drag', (pointer, knob, dragX, dragY) => {
      const left  = knob.getData('minX');
      const right = knob.getData('maxX');

      // Clamp dragX to within [left, right]:
      const clampedX = Phaser.Math.Clamp(dragX, left, right);
      knob.x = clampedX;

      // Fraction along the slider [0..1]:
      const frac = (clampedX - left) / (right - left);

      // Map fraction to an integer quantity in [1..maxCount]:
      let qty = Math.round(frac * (this.maxCount - 1)) + 1;
      qty = Phaser.Math.Clamp(qty, 1, this.maxCount);
      this.selected = qty;

      // Update the “Qty: …” display
      this.displayText.setText(`Qty: ${this.selected}`);
    });

    // ——————————————————————————————————————————
    // (7) Show “Price each: …” below the slider
    // ——————————————————————————————————————————
    this.add.text(
      boxX + 20,
      boxY + 110,
      `Price each: ${this.sellPrice}¢`,
      { fontSize: '16px', fill: '#ffffff' }
    );

    // ——————————————————————————————————————————
    // (8) “Confirm” and “Cancel” buttons
    // ——————————————————————————————————————————
    const confirmBtn = this.add.text(
      boxX + 60,
      boxY + boxH - 30,
      '[ Confirm ]',
      { fontSize: '16px', fill: '#44ff44' }
    ).setInteractive();

    confirmBtn.on('pointerdown', () => {
      // Call the provided callback with chosen quantity
      if (this.callback) {
        this.callback(this.selected);
      }
      this.scene.stop('QuantityScene');
      this.scene.resume('TradeScene');
    });

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
