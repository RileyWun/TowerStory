export default {
  start: 'greeting',
  nodes: {
    greeting: {
      type: 'choice',
      question: 'I’m running low on potions—could you bring me 5 healing herbs?',
      options: [
        {
          text: 'Absolutely, I’ll get them for you.',
          action: function() {
            console.log('merchant1Quest “Yes” clicked');
            // Again, `this` is the Scene:
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
