// assets/js/dialogues/npc2-quest-tree.js

export default {
  start: 'greeting',
  nodes: {
    greeting: {
      type: 'text',
      lines: ['Hello traveler! Will you help me?'],
      next: 'offerQuest'
    },
    offerQuest: {
      type: 'choice',
      question: 'Will you accept this quest?',
      options: [
        {
          text: 'Yes, of course!',
          action: () => {
            console.log('NPC2 quest “Yes” clicked');
            this.scene.questManager.accept('quest2');
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
      lines: ['Safe travels, then.']
    }
  }
};
