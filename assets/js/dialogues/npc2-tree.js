export default {
  start: 'greeting',
  nodes: {
    greeting: {
      type: 'text',
      lines: [ 'Hello traveler!' ],
      next: 'offerQuest'
    },
    offerQuest: {
      type: 'choice',
      question: 'Will you help me?',
      options: [
        {
          text: 'Yes, of course!',
          action: function() {
            console.log('npc2Quest “Yes” clicked');
            // Here, `this` is the Scene, so:
            this.questManager.accept('quest2');
          },
          next: 'questAccepted'
        },
        {
          text: 'Not right now.',
          next: 'farewell'
        }
      ]
    },
    questAccepted: {
      type: 'text',
      lines: [ 'Thank you! 5 coins have been added to your inventory.' ]
    },
    farewell: {
      type: 'text',
      lines: [ 'Safe travels!' ]
    }
  }
};
