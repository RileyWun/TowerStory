// assets/js/dialogues/merchant1-tree.js
// Dialogue and trade tree for merchant NPC "merchant1"

export default {
  start: 'greeting',
  nodes: {
    greeting: {
      type: 'text',
      lines: [
        'Welcome, traveler! I am the local merchant.',
        'What can I do for you today?'
      ],
      next: 'mainMenu'
    },
    mainMenu: {
      type: 'choice',
      question: 'Please select an option:',
      options: [
        {
          text: 'Trade (buy/sell items)',
          action: scene => {
            // Opens the merchant trade interface
            if (scene.tradeManager) {
              scene.tradeManager.open('merchant1');
            } else {
              console.warn('TradeManager not initialized');
            }
          },
          next: 'farewell'
        },
        {
          text: 'Any quests for me?',
          next: 'offerQuest'
        },
        {
          text: 'Goodbye',
          next: 'farewell'
        }
      ]
    },
    offerQuest: {
      type: 'choice',
      question: 'I’m running low on potions—could you bring me 5 healing herbs?',
      options: [
        {
          text: 'Absolutely, I’ll get them for you.',
          action: scene => {
            // Accept a merchant-specific quest
            scene.questManager.accept('merchant1Quest');
            scene.openInventory(scene.playerInv, null);
          },
          next: 'questAccepted'
        },
        {
          text: 'Sorry, I’m busy right now.',
          next: 'mainMenu'
        }
      ]
    },
    questAccepted: {
      type: 'text',
      lines: [
        'Thank you! Return when you've collected 5 healing herbs.'
      ],
      next: 'mainMenu'
    },
    farewell: {
      type: 'text',
      lines: [
        'Safe travels, friend.'
      ]
    }
  }
};
