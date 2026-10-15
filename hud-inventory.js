import { BLOCK_TYPES } from "./textures.js";

export class HUDInventory {
  constructor(autoSaver, onReturnToMenu) {
    this.autoSaver = autoSaver;
    this.onReturnToMenu = onReturnToMenu;

    // Hotbar items mapping to Block IDs
    this.hotbarItems = [
      { id: BLOCK_TYPES.GRASS, name: "Grass" },
      { id: BLOCK_TYPES.DIRT, name: "Dirt" },
      { id: BLOCK_TYPES.STONE, name: "Stone" },
      { id: BLOCK_TYPES.WOOD, name: "Wood Log" },
      { id: BLOCK_TYPES.LEAVES, name: "Leaves" },
      { id: BLOCK_TYPES.BRICK, name: "Bricks" },
      { id: BLOCK_TYPES.GLASS, name: "Glass" },
      { id: BLOCK_TYPES.BEDROCK, name: "Bedrock" },
      { id: BLOCK_TYPES.AIR, name: "Empty" }
    ];

    this.selectedIndex = 0;
    this.isPaused = false;

    this.initUI();
  }

  initUI() {
    // Inject CSS for HUD and Pause Menu
    const style = document.createElement("style");
    style.textContent = `
      #crosshair {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 18px;
        height: 18px;
        pointer-events: none;
        z-index: 100;
        display: none;
      }
      #crosshair::before, #crosshair::after {
        content: '';
        position: absolute;
        background: rgba(255, 255, 255, 0.85);
      }
      #crosshair::before { top: 8px; left: 0; width: 18px; height: 2px; }
      #crosshair::after { top: 0; left: 8px; width: 2px; height: 18px; }

      #hotbar-container {
        position: fixed;
        bottom: 15px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 4px;
        background: rgba(0, 0, 0, 0.4);
        padding: 5px;
        border: 2px solid rgba(0,0,0,0.6);
        z-index: 100;
      }
      .hotbar-slot {
        width: 48px;
        height: 48px;
        background: rgba(120, 120, 120, 0.4);
        border: 3px solid #373737;
        border-top-color: #8b8b8b;
        border-left-color: #8b8b8b;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        color: #fff;
        position: relative;
        cursor: pointer;
      }
      .hotbar-slot.selected {
        border-color: #ffffff;
        background: rgba(160, 160, 160, 0.6);
        transform: scale(1.05);
      }
      .slot-number {
        position: absolute;
        top: 2px;
        left: 4px;
        font-size: 0.9rem;
        color: #fff;
        text-shadow: 1px 1px 0 #000;
      }

      #pause-menu {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      .pause-box {
        background: rgba(0, 0, 0, 0.82);
        border: 3px solid #555;
        padding: 30px;
        width: 380px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        align-items: center;
      }
    `;
    document.head.appendChild(style);

    // Create DOM Elements
    const crosshair = document.createElement("div");
    crosshair.id = "crosshair";
    document.body.appendChild(crosshair);

    const hotbar = document.createElement("div");
    hotbar.id = "hotbar-container";
    document.body.appendChild(hotbar);

    this.renderHotbar();
    this.initListeners();
  }

  renderHotbar() {
    const hotbar = document.getElementById("hotbar-container");
    if (!hotbar) return;

    hotbar.innerHTML = "";
    this.hotbarItems.forEach((item, idx) => {
      const slot = document.createElement("div");
      slot.className = `hotbar-slot ${idx === this.selectedIndex ? "selected" : ""}`;
      slot.innerHTML = `
        <span class="slot-number">${idx + 1}</span>
        <span style="font-size:0.8rem; text-align:center; text-shadow:1px 1px #000;">${item.name}</span>
      `;
      slot.addEventListener("click", () => {
        this.selectedIndex = idx;
        this.renderHotbar();
      });
      hotbar.appendChild(slot);
    });
  }

  initListeners() {
    // Number keys 1-9 & Scroll wheel
    window.addEventListener("keydown", (e) => {
      if (e.code >= "Digit1" && e.code <= "Digit9") {
        const num = parseInt(e.code.replace("Digit3", "3").replace("Digit", ""), 10) - 1;
        if (num >= 0 && num < 9) {
          this.selectedIndex = num;
          this.renderHotbar();
        }
      }

      if (e.code === "Escape") {
        if (document.pointerLockElement === document.body) {
          document.exitPointerLock();
        } else {
          this.togglePauseMenu(true);
        }
      }
    });

    window.addEventListener("wheel", (e) => {
      if (document.pointerLockElement !== document.body) return;
      if (e.deltaY > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % 9;
      } else {
        this.selectedIndex = (this.selectedIndex - 1 + 9) % 9;
      }
      this.renderHotbar();
    });

    // Detect when pointer lock is dropped (ESC pressed) to show Pause Menu
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement !== document.body && !this.isPaused) {
        // Only trigger pause if game canvas is active
        const gameContainer = document.getElementById("game-container");
        if (gameContainer && !gameContainer.classList.contains("hidden")) {
          this.togglePauseMenu(true);
        }
      }
    });
  }

  togglePauseMenu(pause) {
    this.isPaused = pause;
    let menu = document.getElementById("pause-menu");

    if (pause) {
      if (!menu) {
        menu = document.createElement("div");
        menu.id = "pause-menu";
        menu.innerHTML = `
          <div class="pause-box">
            <h2 class="mc-heading">Game Menu</h2>
            <button id="btn-resume" class="mc-btn">Resume Game</button>
            <button id="btn-save-quit" class="mc-btn mc-btn-danger">Save & Quit to Menu</button>
          </div>
        `;
        document.body.appendChild(menu);

        document.getElementById("btn-resume").addEventListener("click", () => {
          this.togglePauseMenu(false);
          document.body.requestPointerLock();
        });

        document.getElementById("btn-save-quit").addEventListener("click", async () => {
          if (this.autoSaver) {
            await this.autoSaver.syncNow();
          }
          this.togglePauseMenu(false);
          if (menu) menu.remove();
          this.onReturnToMenu();
        });
      }
      menu.classList.remove("hidden");
    } else {
      if (menu) menu.classList.add("hidden");
    }
  }

  getSelectedBlockId() {
    return this.hotbarItems[this.selectedIndex].id;
  }
}
