// assets/js/quest-manager.js

export class QuestManager {
  constructor(scene) {
    this.scene = scene;
    this.quests = [];
    this.loadQuests();
  }

  /**
   * Populate the list of all available quests
   */
  loadQuests() {
    this.quests = [
      {
        id: 'quest2',        // matches npcId 'npc2'
        npcId: 'npc2',
        prompt: 'Will you help me?',
        acceptText: 'Yes, of course!',
        declineText: 'Not right now.',
        reward: 'coin',
        rewardCount: 5       // ← added comma below
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
    ];
    // Add more quests here if needed
  }

  /**
   * Find a quest for a given NPC identifier
   */
  getQuestFor(npcId) {
    return this.quests.find(q => q.npcId === npcId);
  }

  /**
   * Accept a quest by its id and grant the reward
   */
  accept(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) return;
    console.log(`Quest accepted: ${questId}`);
    // Give reward to player inventory
    const inv = this.scene.playerInv;
    let stack = inv.find(i => i.iconKey === quest.reward);
    if (stack) stack.count += quest.rewardCount;
    else inv.push({ iconKey: quest.reward, count: quest.rewardCount });
    // Auto-open inventory to show the reward
    if (this.scene.openInventory) {
      this.scene.openInventory(inv, null);
    }
  }
}
