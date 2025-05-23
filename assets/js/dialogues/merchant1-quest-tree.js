// merchant1-quest-tree.js
export default {
  start: 'questPrompt',
  nodes: {
    questPrompt: {
      type: 'choice',
      question: 'Could you fetch me 5 healing herbs for a potion?',
      options: [
        {
          text: 'Sure, I’ll get them.',
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
