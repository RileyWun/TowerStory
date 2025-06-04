// assets/js/dialogues/merchant1-quest-tree.js
export default {
  start: 'questPrompt',
  nodes: {
    questPrompt: {
      type: 'choice',
      question: 'I’m running low on potions—could you bring me 5 healing herbs?',
      options: [
        {
          text: 'Sure, I’ll get them.',
          action: scene => {
            console.log('Merchant quest accepted');
            scene.questManager.accept('merchant1Quest');
          },
          next: 'accepted'
        },
        {
          text: 'Not right now.',
          next: 'declined'
        }
      ]
    },
    accepted: {
      type: 'text',
      lines: ['Thank you—and here’s your potion reward!']
    },
    declined: {
      type: 'text',
      lines: ['Very well. Let me know if you change your mind.']
    }
  }
};
