// assets/js/trade-manager.js
export class TradeManager {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * Opens the trade UI for the given NPC.
   * @param {string} npcId
   */
  open(npcId) {
    // pause the main scene
    this.scene.scene.pause('Main');
    // launch TradeScene, passing the npcId
    this.scene.scene.launch('TradeScene', { npcId });
  }

  /**
   * Closes the trade UI and resumes the main game.
   */
  close() {
    this.scene.scene.stop('TradeScene');
    this.scene.scene.resume('Main');
  }
}
