// assets/js/dialogues/merchant1-quest-tree.js

export default {
  start: 'greeting',
  nodes: {
    greeting: {
      type: 'text',
      lines: [ 'I’m running low on potions—could you bring me 5 healing herbs?' ],
      next: 'offerQuest'
    },
    offerQuest: {
      type: 'choice',
      question: 'Will you accept this quest?',
      options: [
        {
          text: 'Absolutely, I’ll get them for you.',
action: function() {
  this.questManager.accept('merchant1Quest');
},
          next: 'questAccepted'
        },
        {
          text: 'Sorry, I’m busy right now.',
          next: 'farewell'
        }
      ]
    },
    questAccepted: {
      type: 'text',
      lines: [ 'Thank you! I’ll look forward to seeing you again.' ]
    },
    farewell: {
      type: 'text',
      lines: [ 'Safe journeys, then.' ]
    }
  }
};
