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
      question: 'Will you accept my shekels?',
      options: [
        {
          text: 'Yes, I will accept this quest',
          action: () => {
            // Accept quest2 and immediately show inventory with reward
            this.questManager.accept('quest2');
            this.openInventory(this.playerInv, null);
          },
          next: 'questAccepted'
        },
        {
          text: 'I have to think about it, I\'ll talk later',
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
