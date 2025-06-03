// assets/js/quest-manager.js

export class QuestManager {
  constructor(scene) {
    this.scene = scene;
    this.quests = [];
    this.loadQuests();

    // (Optional) You can uncomment the next line to verify at runtime that both quests loaded:
    // console.log('QuestManager loaded with quests:', this.quests);
  }

  /**
   * Populate the list of all available quests.
   * Make sure there is a comma between each object in the array.
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
        rewardCount: 5
      }, // ← you must have this comma here
      {
        id: 'merchant1Quest',       // must match exactly what merchant1-tree.js calls
        npcId: 'merchant1',
        prompt: 'I’m running low on potions—could you bring me 5 healing herbs?',
        acceptText: 'Absolutely, I’ll get them for you.',
        declineText: 'Sorry, I’m busy right now.',
        reward: 'potion',
        rewardCount: 1,
        dialogueFile: 'merchant1-quest-tree.js'
      }
      // ← if you add more quests, each needs its own comma separation
    ];
  }

  /**
   * Return the quest object whose npcId matches the given string,
   * or undefined if none found.
   */
  getQuestFor(npcId) {
    return this.quests.find(q => q.npcId === npcId);
  }

  /**
   * Begin the accept/decline prompt for a specific questId.
   * This will launch the already-registered ChoiceScene and pause Main.
   */
  startQuest(questId) {
    console.log(`QuestManager.startQuest(${questId}) called`);
    const quest = this.quests.find(q => q.id === questId);

    if (!quest) {
      console.warn(`QuestManager.startQuest: no quest found for ID "${questId}"`);
      return;
    }
    console.log(`QuestManager.startQuest: found quest "${quest.id}"`);

    // Launch the ChoiceScene (registered in index.html under the key 'ChoiceScene'):
    this.scene.scene.launch('ChoiceScene', {
      question: quest.prompt,
      options: [quest.acceptText, quest.declineText],
      callback: idx => {
        // idx === 0 → accepted; idx === 1 → declined
        if (idx === 0) {
          this.accept(questId);

          // After granting the reward, show a short “Thank you” dialog:
          this.scene.scene.launch('DialogueScene', {
            lines: ['Thank you for helping me!']
          });
          this.scene.events.once('dialogueClosed', () => {
            this.scene.scene.stop('DialogueScene');
            this.scene.scene.resume('Main');
          });
        } else {
          // Player declined: just close ChoiceScene and resume Main
          this.scene.scene.stop('ChoiceScene');
          this.scene.scene.resume('Main');
        }
      }
    });

    // Pause the Main scene while the ChoiceScene is open:
    this.scene.scene.pause();
  }

  /**
   * Accept a quest by its ID; grant its reward to the player’s inventory.
   */
  accept(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) return;

    console.log(`Quest accepted: ${questId}`);

    // 1) Give reward to the player’s inventory (stack if possible, else new slot)
    const inv = this.scene.playerInv;
    let stack = inv.find(i => i && i.iconKey === quest.reward);

    if (stack) {
      stack.count += quest.rewardCount;
    } else {
      // Look for a null/empty slot
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

    // 2) Auto-open the inventory so the player can see the reward
    if (typeof this.scene.openInventory === 'function') {
      this.scene.openInventory(inv, null);
    }
  }
}
