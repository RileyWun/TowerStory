// merchant1-quest-tree.js
export default {
  start: 'questPrompt',
  nodes: {
    questPrompt: {
      type: 'choice',
      question: 'I’m running low on potions—could you bring me 5 healing herbs?',
      options: [
        {
          text: 'Absolutely, I’ll get them for you.',
          action: scene => scene.questManager.accept('merchant1Quest'),
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
      lines: ['Thank you — here is your reward!']
    },
    declined: {
      type: 'text',
      lines: ['Very well. Come back if you change your mind.']
    }
  }
};
