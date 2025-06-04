// assets/js/dialogues/npc2-quest-tree.js

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
action: function() {
  this.questManager.accept('quest2');
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
