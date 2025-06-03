// assets/js/dialogues/merchant1-tree.js

export default {
  start: 'greeting',
  nodes: {
    greeting: {
      type: 'choice',
      question: 'Hello traveler! What can I do for you?',
      options: [
        {
          text: 'Do you have a quest for me?',
          action: scene => {
            console.log('Merchant choice “quest” clicked');
            scene.questManager.startQuest('merchant1Quest');  // must match exactly
          },
          next: null
        },
        {
          text: 'Let me see your wares.',
          action: scene => {
            scene.scene.launch('TradeScene', { npcId: 'merchant1' });
            scene.scene.pause();
          },
          next: 'close'
        }
      ]
    },
    close: {
      type: 'text',
      lines: ['Safe travels!']
    }
  }
};
