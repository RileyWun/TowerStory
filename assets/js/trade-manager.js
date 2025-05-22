// assets/js/trade-manager.js
// TradeManager handles buying and selling UI invocation and data

export class TradeManager {
  constructor(scene) {
    this.scene = scene;
    this.offers = {};
    this.loadOffers();
  }

  /**
   * Hardcode or load merchant offers: mapping npcId to arrays of { iconKey, buyPrice, sellPrice }
   */
  loadOffers() {
    this.offers = {
      merchant1: [
        { iconKey: 'potion', buyPrice: 3, sellPrice: 1 },
        { iconKey: 'sword',  buyPrice: 10, sellPrice: 5 }
      ]
      // Add more merchants and their inventories here
    };
  }

  /**
   * Open the trade interface for a given merchant NPC.
   * This should launch a TradeScene or similar UI to handle buy/sell actions.
   * @param {string} npcId
   */
  open(npcId) {
    const items = this.offers[npcId] || [];
    // Launch a TradeScene, passing in the items and current player inventory
    if (this.scene.scene.isActive('TradeScene')) {
      this.scene.scene.stop('TradeScene');
    }
    this.scene.scene.pause('Main');
    this.scene.scene.launch('TradeScene', {
      merchantId: npcId,
      offers: items,
      playerInv: this.scene.playerInv
    });
  }

  /**
   * Save changes after trade (optional for persistence)
   */
  save() {
    // e.g. send to server or localStorage
  }
}
