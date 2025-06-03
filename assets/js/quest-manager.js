// assets/js/quest-manager.js

export class QuestManager {
  constructor(scene) {
    this.scene = scene;
    this.quests = [];
    this.loadQuests();
  }

  loadQuests() {
    this.quests = [
      {
        id: 'quest2',
        npcId: 'npc2',
        prompt: 'Will you help me?',
        acceptText: 'Yes, of course!',
        declineText: 'Not right now.',
        reward: 'coin',
        rewardCount: 5
      },   // ← <-- this comma is absolutely required
      {
        id: 'merchant1Quest',        // ← must match exactly the string in startQuest(...)
        npcId: 'merchant1',
        prompt: 'I’m running low on potions—could you bring me 5 healing herbs?',
        acceptText: 'Absolutely, I’ll get them for you.',
        declineText: 'Sorry, I’m busy right now.',
        reward: 'potion',
        rewardCount: 1,
        dialogueFile: 'merchant1-quest-tree.js'
      }
      // …you can add more quests here, each separated by commas…
    ];
  }

  getQuestFor(npcId) {
    return this.quests.find(q => q.npcId === npcId);
  }

  startQuest(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) {
      console.warn(`QuestManager.startQuest: no quest found for ID "${questId}"`);
      return;
    }

    // Launch the ChoiceScene (registered in index.html)
    this.scene.scene.launch('ChoiceScene', {
      question: quest.prompt,
      options: [quest.acceptText, quest.declineText],
      callback: idx => {
        if (idx === 0) {
          this.accept(questId);
          this.scene.scene.launch('DialogueScene', { lines: ['Thank you for helping me!'] });
          this.scene.events.once('dialogueClosed', () => {
            this.scene.scene.stop('DialogueScene');
            this.scene.scene.resume('Main');
          });
        } else {
          this.scene.scene.stop('ChoiceScene');
          this.scene.scene.resume('Main');
        }
      }
    });
    this.scene.scene.pause();
  }

  accept(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) return;

    const inv = this.scene.playerInv;
    let stack = inv.find(i => i && i.iconKey === quest.reward);
    if (stack) {
      stack.count += quest.rewardCount;
    } else {
      let placed = false;
      for (let i = 0; i < inv.length; i++) {
        if (!inv[i]) {
          inv[i] = { iconKey: quest.reward, count: quest.rewardCount };
          placed = true;
          break;
        }
      }
      if (!placed) {
        inv.push({ iconKey: quest.reward, count: quest.rewardCount });
      }
    }

    if (typeof this.scene.openInventory === 'function') {
      this.scene.openInventory(inv, null);
    }
  }
}
