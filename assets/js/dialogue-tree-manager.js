/**
 * DialogueTreeManager
 * 
 * Handles conversation flows as dialogue trees with text and choice nodes.
 * Each tree is defined as:
 * {
 *   start: 'nodeKey',
 *   nodes: {
 *     nodeKey: {
 *       type: 'text',           // 'text' or 'choice'
 *       lines: ['line1', ...],  // for text nodes
 *       next: 'nextNodeKey'     // optional next node
 *     },
 *     nodeKey2: {
 *       type: 'choice',
 *       question: 'Question text',
 *       options: [
 *         { text: 'Option A', next: 'nodeAfterA' },
 *         { text: 'Option B', next: 'nodeAfterB' }
 *       ]
 *     }
 *   }
 * }
 */
export class DialogueTreeManager {
  constructor(scene) {
    this.scene = scene;
    this.trees = {};
    this.currentTree = null;
  }

  /**
   * Register a dialogue tree for a given npcId.
   * @param {string} npcId
   * @param {object} treeDefinition
   */
  registerTree(npcId, treeDefinition) {
    this.trees[npcId] = treeDefinition;
  }

  /**
   * Kick off a dialogue for the specified NPC.
   * @param {string} npcId
   */
  startDialogue(npcId) {
    const tree = this.trees[npcId];
    if (!tree) {
      console.warn(`No dialogue tree found for ${npcId}`);
      return;
    }
    this.currentTree = tree;
    this._runNode(tree.start);
  }

  /**
   * Internal: process a single node.
   * @param {string} nodeKey
   */
  _runNode(nodeKey) {
    const node = this.currentTree.nodes[nodeKey];
    if (!node) return;
    if (node.type === 'text') {
      // show text, then advance
      this.scene.openDialogue(node.lines);
      // after dialogue closes, run next
      this.scene.events.once('dialogueClosed', () => {
        if (node.next) this._runNode(node.next);
      });
    }
    else if (node.type === 'choice') {
      const texts = node.options.map(o => o.text);
      this.scene.openChoice(node.question, texts, index => {
        const opt = node.options[index];
        if (opt.next) this._runNode(opt.next);
      });
    }
  }
}
