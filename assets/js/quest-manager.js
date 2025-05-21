export class QuestManager {
  constructor(scene) {
    this.scene = scene;
    // Map of accepted quests by id
    this.activeQuests = new Map();
    // List of all available quests
    this.quests = [];
    this.loadQuests();
  }

  // In future, load from external JSON or API
  loadQuests() {
    // Example static quest list; replace or extend as needed
    this.quests = [
      {
        id: 'quest1',
        npcId: 'npc1',            // should match the NPC's identifier
        prompt: 'Will you accept this quest?',
        acceptText: 'Yes, I will accept this quest',
        declineText: "I have to think about it, I'll talk to you later",
        reward: 'coin',
        rewardCount: 10
      }
    ];
  }

  /**
   * Get the next quest for a given NPC, if not already accepted.
   * @param {string} npcId
   * @returns {object|null}
   */
  getQuestFor(npcId) {
    return this.quests.find(q => q.npcId === npcId && !this.activeQuests.has(q.id)) || null;
  }

  /**
   * Accept a quest by id: mark active and grant initial reward.
   * @param {string} questId
   */
  accept(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) return;
    // Mark as active
    this.activeQuests.set(questId, quest);
    // Grant reward immediately (could defer until completion)
    if (quest.reward && quest.rewardCount) {
      const inv = this.scene.playerInv;
      const existing = inv.find(item => item.iconKey === quest.reward);
      if (existing) existing.count += quest.rewardCount;
      else inv.push({ iconKey: quest.reward, count: quest.rewardCount });
    }
    console.log(`Quest accepted: ${questId}`);
  }

  /**
   * Placeholder for completing a quest in future
   * @param {string} questId
   */
  complete(questId) {
    if (this.activeQuests.has(questId)) {
      // handle completion logic here
      this.activeQuests.delete(questId);
      console.log(`Quest completed: ${questId}`);
    }
  }

  /**
   * Placeholder for declining or abandoning a quest
   * @param {string} questId
   */
  decline(questId) {
    // simply ensure it's not active
    this.activeQuests.delete(questId);
    console.log(`Quest declined: ${questId}`);
  }
}
