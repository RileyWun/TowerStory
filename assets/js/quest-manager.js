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
        rewardCount: 5
        // no dialogueFile here (npc2’s tree lives in npc2‐tree.js)
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
      // → Add more quests here as needed
    ];
  }

  /**
   * Find a quest for a given NPC identifier
   */
  getQuestFor(npcId) {
    return this.quests.find(q => q.npcId === npcId);
  }

  /**
   * Kick off an “Accept/Decline” prompt for the specified questId.
   * This launches the ChoiceScene (which must already be registered in index.html).
   */
  startQuest(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) {
      console.warn(`QuestManager.startQuest: no quest found for ID "${questId}"`);
      return;
    }

    // Launch the ChoiceScene that you have registered in index.html:
    this.scene.scene.launch('ChoiceScene', {
      question: quest.prompt,
      options: [quest.acceptText, quest.declineText],
      callback: idx => {
        // idx === 0 → player accepted; idx === 1 → player declined
        if (idx === 0) {
          this.accept(questId);

          // After giving the reward, show a short “Thank you!” dialog:
          this.scene.scene.launch('DialogueScene', {
            lines: ['Thank you for helping me!']
          });
          this.scene.events.once('dialogueClosed', () => {
            // Once the “Thank you…” dialog is closed, stop it and resume Main
            this.scene.scene.stop('DialogueScene');
            this.scene.scene.resume('Main');
          });
        } else {
          // Player declined → simply close ChoiceScene and resume Main
          this.scene.scene.stop('ChoiceScene');
          this.scene.scene.resume('Main');
        }
      }
    });

    // Pause the MainScene while ChoiceScene is up
    this.scene.scene.pause();
  }

  /**
   * Accept a quest by its id and grant the reward to the player's inventory.
   */
  accept(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) return;

    console.log(`Quest accepted: ${questId}`);

    // 1) Give reward to playerInv (stack if possible, else add new stack)
    const inv = this.scene.playerInv;

    // Null‐safe find
    let stack = inv.find(i => i && i.iconKey === quest.reward);
    if (stack) {
      stack.count += quest.rewardCount;
    } else {
      // If there’s an empty (null) slot in inv[], fill that first
      let placed = false;
      for (let i = 0; i < inv.length; i++) {
        if (!inv[i]) {
          inv[i] = { iconKey: quest.reward, count: quest.rewardCount };
          placed = true;
          break;
        }
      }
      if (!placed) {
        // Otherwise push a new stack onto the array
        inv.push({ iconKey: quest.reward, count: quest.rewardCount });
      }
    }

    // 2) Auto‐open the inventory so the player sees the new reward
    if (typeof this.scene.openInventory === 'function') {
      // Pass (playerInv, null) since no chest is open right now
      this.scene.openInventory(inv, null);
    }
  }
}
