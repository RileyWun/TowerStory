<!-- … earlier in index.html … -->
<script type="module">
  import { NPCManager } from './assets/js/npc-manager.js';
  import { QuestManager } from './assets/js/quest-manager.js';
  import { DialogueTreeManager } from './assets/js/dialogue-tree-manager.js';
  import { TradeManager } from './assets/js/trade-manager.js';

  window.addEventListener('load', () => {
    class BootScene extends Phaser.Scene {
      constructor(){ super('Boot'); }
      create(){ this.scene.start('Preload'); }
    }

    class PreloadScene extends Phaser.Scene {
      constructor(){ super('Preload'); }
      preload(){
        this.load.tilemapTiledJSON('room','assets/maps/room.json');
        this.load.spritesheet('tileset','assets/tiles/tileset.png',{ frameWidth:38,frameHeight:38 });
        this.load.spritesheet('player','assets/player/Chibi-character-template_skin0_part2_by_AxulArt.png',{ frameWidth:32,frameHeight:32 });
        this.load.image('chest','assets/objects/chest.png');
        this.load.image('npc','assets/objects/npc.png');
        this.load.image('potion','assets/icons/potion.png');
        this.load.image('sword','assets/icons/sword.png');
        this.load.image('coin','assets/icons/coin.png');  <!-- Ensure this key matches the 'coin' passed above -->
      }
      create(){ this.scene.start('Main'); }
    }

    class MainScene extends Phaser.Scene {
      constructor(){ super('Main'); }

      create(){
        const map = this.make.tilemap({ key:'room' });
        map.addTilesetImage('tileset','tileset',map.tileWidth,map.tileHeight);
        this.tileW = map.tileWidth; 
        this.tileH = map.tileHeight;
        this.mapW  = map.width; 
        this.mapH  = map.height;
        this.offsetX = this.scale.width / 2;
        this.offsetY = (this.scale.height - (this.mapW + this.mapH) * (this.tileH / 2)) / 2 + this.tileH / 2;

        // … your existing floor & object setup …
        this.floorData = map.getLayer('Floor').data.map(r => r.map(t => t.index > 0));
        this.collisionData = map.getLayer('Collision').data.map(r => r.map(t => t.index > 0));
        map.getLayer('Floor').data.forEach((row, y) => {
          row.forEach((t, x) => {
            if (t.index > 0) {
              const frame = t.index - 1;
              const sx = (x - y) * (this.tileW / 2) + this.offsetX;
              const sy = (x + y) * (this.tileH / 2) + this.offsetY;
              this.add.image(sx, sy, 'tileset', frame).setDepth(sy);
            }
          });
        });

        // Objects & Chests
        const objs = map.getObjectLayer('Objects').objects;
        const spawn = objs.find(o => o.name === 'PlayerSpawn');
        this.playerInv = [
          { iconKey: 'potion', count: 3 },
          { iconKey: 'sword',  count: 1 }
        ];
        this.chests = [];
        objs.forEach(o => {
          const ix = o.x / this.tileW, 
                iy = o.y / this.tileH;
          const sx = (ix - iy) * (this.tileW / 2) + this.offsetX;
          const sy = (ix + iy) * (this.tileH / 2) + this.offsetY;
          if (o.type === 'Chest') {
            const chest = this.add.image(sx, sy, 'chest')
              .setOrigin(0.5,1)
              .setDepth(sy)
              .setInteractive();
            chest.inventory = [];
            chest.on('pointerdown', () => this.openInventory(this.playerInv, chest.inventory));
            this.chests.push(chest);
          }
        });

        // Player
        this.player = this.add.sprite(0, 0, 'player').setOrigin(0.5, 1);
        this.createPlayerAnims();
        this.playerIsoX = spawn.x / this.tileW;
        this.playerIsoY = spawn.y / this.tileH;
        const px = (this.playerIsoX - this.playerIsoY) * (this.tileW / 2) + this.offsetX;
        const py = (this.playerIsoX + this.playerIsoY) * (this.tileH / 2) + this.offsetY;
        this.player.setPosition(px, py).setDepth(py);

        this.keys = this.input.keyboard.addKeys('W,A,S,D');
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // ** NEW: Create a physics group for dropped loot **
        this.lootGroup = this.physics.add.group();

        // ** NEW: Set up overlap so player "picks up" coins **
        this.physics.add.overlap(
          this.player,
          this.lootGroup,
          this.collectLoot,
          null,
          this
        );

        // Managers
        this.npcManager = new NPCManager(this);
        this.npcManager.createFromObjects(objs);
        this.questManager = new QuestManager(this);
        this.dialogueTree = new DialogueTreeManager(this);
        this.tradeManager   = new TradeManager(this);

        // 1) Load each NPC’s main dialogue tree:
        this.npcManager.npcs.forEach(npc => {
          import(`./assets/js/dialogues/${npc.npcId}-tree.js`)
            .then(mod => this.dialogueTree.registerTree(npc.npcId, mod.default))
            .catch(err => console.warn(`No dialogue module for ${npc.npcId}`, err));
        });

        // 2) Load each quest dialogue tree
        this.questManager.quests.forEach(quest => {
          if (!quest.dialogueFile) return;
          import(`./assets/js/dialogues/${quest.dialogueFile}`)
            .then(mod => {
              this.dialogueTree.registerTree(quest.id, mod.default);
            })
            .catch(err => console.warn(`Failed to load quest tree for ${quest.id}`, err));
        });

        // Conversation & interactions
        this.npcManager.enableConversations('F', npc =>
          this.dialogueTree.startDialogue(npc.npcId)
        );

        // Inventory & chest keys
        this.events.on('inventoryClosed', data => {
          this.playerInv = data.playerInv;
          this.scene.resume();
        });
        this.input.keyboard.on('keydown-I',   () => this.openInventory(this.playerInv, null));
        this.input.keyboard.on('keydown-E', () => {
          const { x, y } = this.player;
          this.chests.forEach(ch => {
            if (Phaser.Math.Distance.Between(x, y, ch.x, ch.y) < 50) {
              this.openInventory(this.playerInv, ch.inventory);
            }
          });
        });
      }

      createPlayerAnims() {
        [
          ['down', 0, 3], ['left', 12, 15],
          ['right', 24, 27], ['up', 36, 39],
          ['down-left', 48, 51], ['down-right', 60, 63],
          ['up-left', 72, 75], ['up-right', 84, 87]
        ].forEach(([k, s, e]) => {
          this.anims.create({
            key: `walk-${k}`,
            frames: this.anims.generateFrameNumbers('player', { start: s, end: e }),
            frameRate: 8,
            repeat: -1
          });
        });
      }

      update(time, delta) {
        const dt = delta / 1000, 
              spd = 3;
        let moved = false, dir = this.lastDir || 'down';
        let nx = this.playerIsoX, 
            ny = this.playerIsoY;
        const { W, A, S, D } = this.keys;

        if (W.isDown) { 
          ny -= spd * dt; 
          dir = 'up'; 
          moved = true; 
          this.player.play('walk-up', true); 
        }
        else if (S.isDown) {
          ny += spd * dt; 
          dir = 'down'; 
          moved = true; 
          this.player.play('walk-down', true);
        }
        if (A.isDown) { 
          nx -= spd * dt; 
          dir = 'left'; 
          moved = true; 
          this.player.play('walk-left', true);
        }
        else if (D.isDown) {
          nx += spd * dt; 
          dir = 'right'; 
          moved = true; 
          this.player.play('walk-right', true);
        }

        const tx = Math.floor(nx), ty = Math.floor(ny);
        if (
          nx >= 0 && nx < this.mapW &&
          ny >= 0 && ny < this.mapH &&
          this.floorData[ty][tx] &&
          !this.collisionData[ty][tx]
        ) {
          this.playerIsoX = nx;
          this.playerIsoY = ny;
        }

        if (!moved) {
          this.player.anims.stop();
          this.player.setFrame({ 
            down: 0, left: 12, right: 24, up: 36 
          }[dir]);
        }
        this.lastDir = dir;

        const sx = (this.playerIsoX - this.playerIsoY) * (this.tileW / 2) + this.offsetX;
        const sy = (this.playerIsoX + this.playerIsoY) * (this.tileH / 2) + this.offsetY;
        this.player.setPosition(sx, sy).setDepth(sy);
      }

      // ** NEW HELPER: Spawn `count` coins at given iso coords **
      spawnLoot(isoX, isoY, key, count) {
        for (let i = 0; i < count; i++) {
          // Spread them randomly within ±0.5 tile so they don’t stack exactly:
          const rx = isoX + Phaser.Math.FloatBetween(-0.3, 0.3);
          const ry = isoY + Phaser.Math.FloatBetween(-0.3, 0.3);

          const tileW = this.tileW, tileH = this.tileH;
          const px = (rx - ry) * (tileW / 2) + this.offsetX;
          const py = (rx + ry) * (tileH / 2) + this.offsetY;

          const loot = this.lootGroup.create(px, py, key)
            .setOrigin(0.5, 1)
            .setDepth(py)
            .setScale(1)
            .refreshBody();

          // Give each coin a small bob‐animation (tween) so it’s easier to see
          this.tweens.add({
            targets: loot,
            y: loot.y - 4,
            duration: 400,
            yoyo: true,
            repeat: -1
          });
        }
      }

      // ** NEW OVERLAP CALLBACK: pick up any coin the player touches **
      collectLoot(playerSprite, lootSprite) {
        // 1) Remove coin sprite from the world
        lootSprite.destroy();

        // 2) Add a coin to the player's inventory array
        const inv = this.playerInv;
        const existing = inv.find(i => i.iconKey === 'coin');
        if (existing) {
          existing.count += 1;
        } else {
          inv.push({ iconKey: 'coin', count: 1 });
        }

        // 3) (Optionally) Fire an event or update the UI right away.
        //    For example, you might want to auto‐refresh an open inventory:
        this.events.emit('inventoryUpdated', { playerInv: inv });
      }

      openInventory(playerInv, chestInv) {
        this.scene.pause();
        this.scene.launch('InventoryScene', { playerInv, chestInv });
      }
      closeInventory() {
        this.scene.stop('InventoryScene');
        this.scene.resume();
      }

      openChoice(question, options, callback) {
        this.scene.pause();
        this.scene.launch('ChoiceScene', { question, options, callback });
      }
    }

    // … DialogueScene, ChoiceScene, TradeScene, InventoryScene, etc. …

    const config = {
      type: Phaser.AUTO,
      parent: 'game-container',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: { default: 'arcade' },
      scene: [ BootScene, PreloadScene, MainScene, DialogueScene, ChoiceScene, TradeScene, InventoryScene ]
    };
    new Phaser.Game(config);
  });
</script>
