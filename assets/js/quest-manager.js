
import { ChoiceScene } from './dialogue-tree-manager.js';

export class QuestManager {
  constructor(scene) {
    this.scene = scene;

    // Fill this.quests in loadQuests()
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
        // no dialogueFile – this quest’s dialog lives directly in npc2-tree.js
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
   * Return the quest object for a given NPC ID (or undefined if none).
   */
  getQuestFor(npcId) {
    return this.quests.find(q => q.npcId === npcId);
  }

  /**
   * Kick off the “Accept/Decline” prompt for the specified questId.
   * This will launch a ChoiceScene with the quest.prompt and quest.acceptText / declineText.
   */
  startQuest(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) {
      console.warn(`QuestManager.startQuest: no quest found for ID "${questId}"`);
      return;
    }

    // Launch Phaser’s ChoiceScene (which you already have registered in index.html).
    // We pass in question = quest.prompt, options = [acceptText, declineText], callback = idx => { … }
    this.scene.scene.launch('ChoiceScene', {
      question: quest.prompt,
      options: [quest.acceptText, quest.declineText],
      callback: idx => {
        // idx === 0 ⇒ accepted; idx === 1 ⇒ declined
        if (idx === 0) {
          // Player accepted
          this.accept(questId);
          // After granting the reward, show a short “Thank you” text dialog:
          this.scene.scene.launch('DialogueScene', {
            lines: ['Thank you for helping me!']
          });
          // When that text dialog closes, resume main.
          this.scene.events.once('dialogueClosed', () => {
            this.scene.scene.stop('DialogueScene');
          });
        } else {
          // Player declined – just close ChoiceScene and resume
          this.scene.scene.stop('ChoiceScene');
          this.scene.resume();
        }
      }
    });

    // Pause the main scene temporarily while ChoiceScene is open:
    this.scene.scene.pause();
  }

  /**
   * Accept a quest by its id and grant the reward to the player’s inventory.
   * (The “reward” is a { iconKey, count }.)
   */
  accept(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) return;

    console.log(`Quest accepted: ${questId}`);

    // 1) Give reward to playerInv (stack if possible, else add new stack)
    const inv = this.scene.playerInv;

    // Find an existing stack (only if i !== null)
    let stack = inv.find(i => i && i.iconKey === quest.reward);
    if (stack) {
      stack.count += quest.rewardCount;
    } else {
      // If inventory has any null/empty slots, fill that; otherwise push new.
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

    // 2) Auto‐open inventory so the player can see the new coins/potions
    if (typeof this.scene.openInventory === 'function') {
      // Pass (playerInv, null) because there's no chest open right now
      this.scene.openInventory(inv, null);
    }
  }
}
