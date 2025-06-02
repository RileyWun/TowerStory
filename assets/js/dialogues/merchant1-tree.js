// assets/js/dialogues/merchant1-tree.js
export default {
  start: 'greeting',
  nodes: {
    greeting: {
      type: 'text',
      lines: ['Welcome to my shop, traveler!'],
      next: 'mainMenu'
    },
    mainMenu: {
      type: 'choice',
      question: 'How can I help you today?',
      options: [
        {
          text: 'I want to trade',
          action: scene => scene.tradeManager.open('merchant1'),
          next: null
        },
        {
          text: 'Do you have a quest for me?',
          action: scene => {
            console.log('Merchant choice “quest” clicked');
            scene.dialogueTree.startDialogue('merchant1Quest');
          },
          next: null
        },
        {
          text: 'Goodbye',
          next: 'farewell'
        }
      ]
    },
    farewell: {
      type: 'text',
      lines: ['Safe travels, and come back soon!']
    }
  }
};
