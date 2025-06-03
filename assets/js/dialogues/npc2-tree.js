// assets/js/dialogues/npc2-tree.js
// Dialogue tree module for NPC with id "npc2"

export default {
  start: 'greeting',
  nodes: {
    greeting: {
      type: 'text',
      lines: ['Hello traveler!'],
      next: 'offerQuest'
    },
    offerQuest: {
      type: 'choice',
      question: 'Will you help me?',
      options: [
        {
          text: 'Yes, of course!',
          action: (scene) => {
          scene.questManager.accept('quest2');
          scene.openInventory(scene.playerInv, null);
        },
          next: 'questAccepted'
        },
        {
          text: 'Not right now',
          next: 'farewell'
        }
      ]
    },
    questAccepted: {
      type: 'text',
      lines: ['Thank you! Here are 5 coins.']
    },
    farewell: {
      type: 'text',
      lines: ['Safe travels!']
    }
  }
};
