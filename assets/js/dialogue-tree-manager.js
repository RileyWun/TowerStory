// assets/js/dialogue-tree-manager.js

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
      // Show text, then advance on close.
      this.scene.scene.launch('DialogueScene', { lines: node.lines });

      // Once the DialogueScene emits 'dialogueClosed', move to the next node.
      this.scene.events.once('dialogueClosed', () => {
        if (node.next) {
          this._runNode(node.next);
        }
      });
    }
    else if (node.type === 'choice') {
      // Build an array of the option texts:
      const optionsArray = node.options.map(opt => opt.text);

      // Launch the ChoiceScene, passing question, options, and a callback.
      this.scene.scene.launch('ChoiceScene', {
        question: node.question,
        options: optionsArray,
        callback: idx => {
          const chosenOpt = node.options[idx];

          // 1) Run the action, if one was provided:
          if (chosenOpt.action) {
            chosenOpt.action(this.scene);
          }

          // 2) Then follow the 'next' pointer, if present:
          if (chosenOpt.next) {
            this._runNode(chosenOpt.next);
          }
        }
      });
    }
  }
}
