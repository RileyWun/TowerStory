// assets/js/quest-manager.js

export class QuestManager {
  constructor(scene) {
    this.scene = scene;
    this.quests = [];
    this.loadQuests();
  }

  /**
   * Populate the list of all available quests.
   * Each quest may specify a `dialogueFile` (the filename under /assets/js/dialogues/)
   * so that we can register its tree dynamically.
   */
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
        acceptText: 'Sure, I’ll get them.',
        declineText: 'Sorry, I’m busy right now.',
        reward: 'potion',
        rewardCount: 1,
        dialogueFile: 'merchant1-quest-tree.js'
      }
      // ← Add more quests here as needed.
    ];
  }

  /**
   * Return the quest object associated with a given npcId, or undefined if none.
   */
  getQuestFor(npcId) {
    return this.quests.find(q => q.npcId === npcId);
  }

  /**
   * Called when the player initiates “Do you have a quest?” with a merchant/NPC.
   * Finds the quest for that NPC and (if the dialogue tree was registered) starts it.
   */
  startQuest(npcId) {
    const quest = this.getQuestFor(npcId);
    if (!quest) {
      console.warn(`QuestManager.startQuest: no quest found for ${npcId}`);
      return;
    }

    // We assume that elsewhere (in MainScene, on startup), you already did:
    // import(`./assets/js/dialogues/${quest.dialogueFile}`)
    //   .then(mod => dialogueTree.registerTree(quest.id, mod.default))
    // So here we simply fire off that quest‐tree by its id:
    this.scene.dialogueTree.startDialogue(quest.id);
  }

  /**
   * Accept a quest by its questId (e.g. “quest2” or “merchant1Quest”), 
   * give the reward to the player’s inventory, and re-open inventory so they see it.
   */
  accept(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) return;

    console.log(`Quest accepted: ${questId}`);

    // Give the reward to playerInv
    const inv = this.scene.playerInv;
    let stack = inv.find(i => i.iconKey === quest.reward);
    if (stack) {
      stack.count += quest.rewardCount;
    } else {
      inv.push({ iconKey: quest.reward, count: quest.rewardCount });
    }

    // Auto-open inventory so the player sees the new item(s):
    if (this.scene.openInventory) {
      this.scene.openInventory(inv, null);
    }
  }

  /**
   * (Optional) Decline a quest. Right now this simply logs, but you can expand it.
   */
  decline(questId) {
    console.log(`Quest declined: ${questId}`);
    // e.g. you could give the NPC a “maybe next time” dialogue.
  }
}
