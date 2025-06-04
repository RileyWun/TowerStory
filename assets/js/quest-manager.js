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
        rewardCount: 5,
        dialogueFile: 'npc2-quest-tree.js'
      },
      {
        id: 'merchant1Quest',
        npcId: 'merchant1',
        prompt: 'I’m running low on potions—could you bring me 5 healing herbs?',
        acceptText: 'Absolutely, I’ll get them for you.',
        declineText: 'Sorry, I’m busy right now.',
        reward: 'potion',
        rewardCount: 1,
        dialogueFile: 'merchant1-quest-tree.js'
      }
      // …more quests…
    ];
  }

  getQuestFor(npcId) {
    return this.quests.find(q => q.npcId === npcId);
  }

  /**
   * If you pass a questId, fall back to finding that quest by its ID.
   * Otherwise look it up by npcId as before.
   */
  startQuest(key) {
    console.log(`QuestManager.startQuest(${key}) called`);

    // First try looking up by npcId
    let quest = this.quests.find(q => q.npcId === key);

    // If none found, try by quest.id directly
    if (!quest) {
      quest = this.quests.find(q => q.id === key);
    }

    if (!quest) {
      console.warn(`QuestManager.startQuest: no quest found for "${key}"`);
      return;
    }
    console.log(`QuestManager.startQuest: found quest "${quest.id}"`);

    // Launch its dialogue tree by quest.id (must have been registered earlier)
    this.scene.dialogueTree.startDialogue(quest.id);
  }

  accept(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) return;

    console.log(`Quest accepted: ${questId}`);

    const inv = this.scene.playerInv;
    let stack = inv.find(i => i.iconKey === quest.reward);
    if (stack) {
      stack.count += quest.rewardCount;
    } else {
      inv.push({ iconKey: quest.reward, count: quest.rewardCount });
    }

    if (this.scene.openInventory) {
      this.scene.openInventory(inv, null);
    }
  }

  decline(questId) {
    console.log(`Quest declined: ${questId}`);
  }
}
