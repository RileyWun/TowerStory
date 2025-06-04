// assets/js/dialogue-tree-manager.js

export class DialogueTreeManager {
  constructor(scene) {
    this.scene = scene;
    this.trees = {};
    this.currentTree = null;
  }

  registerTree(npcId, treeDefinition) {
    this.trees[npcId] = treeDefinition;
  }

  startDialogue(npcId) {
    console.log(`DialogueTreeManager.startDialogue("${npcId}") called`);
    const tree = this.trees[npcId];
    if (!tree) {
      console.warn(`No dialogue tree found for ${npcId}`);
      return;
    }
    this.currentTree = tree;
    this._runNode(tree.start);
  }

  _runNode(nodeKey) {
    console.log(`_runNode("${nodeKey}")`);
    const node = this.currentTree.nodes[nodeKey];
    if (!node) {
      console.warn(`DialogueTreeManager._runNode: no node "${nodeKey}"`);
      return;
    }

    if (node.type === 'text') {
      // show text, then advance
      this.scene.scene.launch('DialogueScene', { lines: node.lines });
      this.scene.events.once('dialogueClosed', () => {
        if (node.next) this._runNode(node.next);
      });
    }
    else if (node.type === 'choice') {
      console.log(`Launching ChoiceScene for question: "${node.question}"`);
      const texts = node.options.map(o => o.text);
      this.scene.scene.launch('ChoiceScene', {
        question: node.question,
        options: texts,
        callback: idx => {
          const opt = node.options[idx];
          if (opt.action) opt.action.call(this.scene);
          if (opt.next) this._runNode(opt.next);
        }
      });
    }
  }
}
