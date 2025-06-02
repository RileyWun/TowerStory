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
 *         { text: 'Option A', action: someCallback, next: 'nodeAfterA' },
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
   */
  registerTree(npcId, treeDefinition) {
    this.trees[npcId] = treeDefinition;
  }

  /**
   * Start a dialogue for the specified NPC.
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
   * Process a single node in the current tree.
   */
  _runNode(nodeKey) {
    const node = this.currentTree.nodes[nodeKey];
    if (!node) return;

    if (node.type === 'text') {
      // Launch text dialogue
      this.scene.scene.launch('DialogueScene', { lines: node.lines });
      // After dialogue closes, move to next
      this.scene.events.once('dialogueClosed', () => {
        if (node.next) this._runNode(node.next);
      });
    }
    else if (node.type === 'choice') {
      const texts = node.options.map(o => o.text);
      // Launch choice dialogue
const texts = node.options.map(o => o.text);
 // launch built-in ChoiceScene directly
      this.scene.scene.launch('ChoiceScene', {
        question: node.question,
        options: texts,
        callback: idx => {
          const opt = node.options[idx];
          // 1) run the action (if any)
          if (opt.action) {
            opt.action(this.scene);
          }
          // 2) then follow the next link (if any)
          if (opt.next) {
            this._runNode(opt.next);
          }
        }
      });
    }
  }
}
