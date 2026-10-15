import { db, AppState, showScreen, showToast } from "./firebase-mgr.js";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const screenWorlds = document.getElementById("screen-worlds");
const screenMenu = document.getElementById("screen-menu");

let selectedWorldId = null;
let cachedWorlds = [];

// Convert any string or blank input into a valid numeric terrain seed
function parseSeed(seedInput) {
  const cleaned = seedInput.trim();
  if (!cleaned) {
    return Math.floor(10000000 + Math.random() * 90000000);
  }
  if (!isNaN(cleaned)) {
    return Math.abs(parseInt(cleaned, 10)) || 12345678;
  }
  // Hash string into numeric seed (just like Minecraft Java Edition)
  let hash = 0;
  for (let i = 0; i < cleaned.length; i++) {
    hash = ((hash << 5) - hash) + cleaned.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 87654321;
}

// Inject the World Manager UI and CSS dynamically so you don't have to edit style.css
function initWorldManagerUI() {
  const style = document.createElement("style");
  style.textContent = `
    .world-manager-box {
      width: 680px;
      max-width: 94vw;
      background: rgba(0, 0, 0, 0.78);
      border: 3px solid #555;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: inset 0 0 0 3px #111;
    }
    .world-list-container {
      height: 290px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.65);
      border: 2px solid #444;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .world-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border: 2px solid transparent;
      background: rgba(35, 35, 35, 0.85);
      cursor: pointer;
    }
    .world-item:hover {
      border-color: #777;
    }
    .world-item.selected {
      border-color: #fff;
      background: rgba(65, 65, 65, 0.95);
    }
    .world-title {
      font-size: 1.65rem;
      color: #fff;
    }
    .world-meta {
      font-size: 1.25rem;
      color: #aaa;
    }
    .world-actions-row {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .world-actions-row .mc-btn {
      width: calc(50% - 6px);
      font-size: 1.45rem;
    }
    .mc-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  screenWorlds.innerHTML = `
    <!-- SUB-VIEW 1: WORLD LIST -->
    <div id="view-world-list" class="world-manager-box">
      <h2 class="mc-heading">Select World</h2>
      <div id="world-list" class="world-list-container">
        <p class="mc-label" style="text-align:center; margin-top: 100px;">Loading cloud worlds...</p>
      </div>
      <div class="world-actions-row">
        <button id="btn-play-world" class="mc-btn" disabled>Play Selected World</button>
        <button id="btn-open-create" class="mc-btn">Create New World</button>
      </div>
      <div class="world-actions-row">
        <button id="btn-delete-world" class="mc-btn mc-btn-danger" disabled>Delete Selected World</button>
        <button id="btn-back-menu" class="mc-btn">Cancel / Back</button>
      </div>
    </div>

    <!-- SUB-VIEW 2: CREATE NEW WORLD -->
    <div id="view-world-create" class="world-manager-box hidden">
      <h2 class="mc-heading">Create New World</h2>
      
      <label class="mc-label">World Name:</label>
      <input type="text" id="input-world-name" class="mc-input" value="New World" maxlength="28" />
      
      <label class="mc-label">Game Mode:</label>
      <select id="select-gamemode" class="mc-input">
        <option value="creative">Creative (Unlimited Blocks & Flying)</option>
        <option value="survival">Survival (Standard Gravity & Mining)</option>
      </select>

      <label class="mc-label">World Seed (Leave blank for random seed):</label>
      <input type="text" id="input-world-seed" class="mc-input" placeholder="e.g. 84920194 or DiamondValley" maxlength="32" />

      <div class="world-actions-row" style="margin-top: 10px;">
        <button id="btn-confirm-create" class="mc-btn">Create New World</button>
        <button id="btn-cancel-create" class="mc-btn">Cancel</button>
      </div>
    </div>
  `;

  bindWorldEvents();
}

function bindWorldEvents() {
  const viewList = document.getElementById("view-world-list");
  const viewCreate = document.getElementById("view-world-create");
  const btnPlay = document.getElementById("btn-play-world");
  const btnDelete = document.getElementById("btn-delete-world");

  // Back to Main Menu
  document.getElementById("btn-back-menu").addEventListener("click", () => {
    showScreen(screenMenu);
  });

  // Switch to Create World Form
  document.getElementById("btn-open-create").addEventListener("click", () => {
    document.getElementById("input-world-name").value = "New World";
    document.getElementById("input-world-seed").value = "";
    viewList.classList.add("hidden");
    viewCreate.classList.remove("hidden");
  });

  // Cancel Create World
  document.getElementById("btn-cancel-create").addEventListener("click", () => {
    viewCreate.classList.add("hidden");
    viewList.classList.remove("hidden");
  });

  // Confirm & Save New World to Firestore
  document.getElementById("btn-confirm-create").addEventListener("click", async () => {
    if (!AppState.user) return;

    const nameInput = document.getElementById("input-world-name").value.trim() || "New World";
    const gameMode = document.getElementById("select-gamemode").value;
    const seedInput = document.getElementById("input-world-seed").value;
    const finalSeed = parseSeed(seedInput);

    showToast("Generating world in Firebase...");

    try {
      const newWorldData = {
        ownerId: AppState.user.uid,
        ownerName: AppState.profile ? AppState.profile.username : "Crafter",
        worldName: nameInput,
        seed: finalSeed,
        gameMode: gameMode,
        playerPosition: { x: 8, y: 28, z: 8, rx: 0, ry: 0 },
        modifiedBlocks: {}, // Stores every broken/placed block ("x,y,z": blockId)
        createdAt: Date.now(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "worlds"), newWorldData);
      showToast("World created!");

      viewCreate.classList.add("hidden");
      viewList.classList.remove("hidden");
      await loadUserWorlds(docRef.id);
    } catch (err) {
      alert("Failed to create world: " + err.message);
    }
  });

  // Delete Selected World
  btnDelete.addEventListener("click", async () => {
    if (!selectedWorldId) return;
    const target = cachedWorlds.find(w => w.id === selectedWorldId);
    if (!confirm(`Are you sure you want to permanently delete "${target ? target.worldName : 'this world'}"?`)) {
      return;
    }

    showToast("Deleting world...");
    try {
      await deleteDoc(doc(db, "worlds", selectedWorldId));
      selectedWorldId = null;
      await loadUserWorlds();
      showToast("World deleted.");
    } catch (err) {
      alert("Error deleting world: " + err.message);
    }
  });

  // Launch Selected World
  btnPlay.addEventListener("click", () => {
    const world = cachedWorlds.find(w => w.id === selectedWorldId);
    if (!world) return;

    AppState.activeWorld = world;
    showToast(`Loading "${world.worldName}" (Seed: ${world.seed})...`);

    // Dispatches event that Chunk 3-5 (3D Engine) will listen to
    window.dispatchEvent(new CustomEvent("launch-3d-world", { detail: world }));
  });
}

// Fetch all worlds owned by the logged-in player
async function loadUserWorlds(autoSelectId = null) {
  const listEl = document.getElementById("world-list");
  const btnPlay = document.getElementById("btn-play-world");
  const btnDelete = document.getElementById("btn-delete-world");

  btnPlay.disabled = true;
  btnDelete.disabled = true;
  selectedWorldId = null;
  listEl.innerHTML = `<p class="mc-label" style="text-align:center; margin-top: 100px;">Syncing worlds from Firestore...</p>`;

  try {
    const q = query(
      collection(db, "worlds"),
      where("ownerId", "==", AppState.user.uid)
    );
    const snap = await getDocs(q);

    cachedWorlds = [];
    snap.forEach(docSnap => {
      cachedWorlds.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Sort newest first in browser (avoids needing a composite index in Firebase)
    cachedWorlds.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (cachedWorlds.length === 0) {
      listEl.innerHTML = `<p class="mc-label" style="text-align:center; margin-top: 95px; color:#aaa;">No worlds found. Click "Create New World" below!</p>`;
      return;
    }

    listEl.innerHTML = "";
    cachedWorlds.forEach(w => {
      const modCount = w.modifiedBlocks ? Object.keys(w.modifiedBlocks).length : 0;
      const item = document.createElement("div");
      item.className = "world-item";
      item.innerHTML = `
        <div>
          <div class="world-title">${w.worldName}</div>
          <div class="world-meta">Mode: ${w.gameMode.toUpperCase()} | Seed: ${w.seed}</div>
        </div>
        <div class="world-meta" style="text-align:right;">
          <div>Saved Blocks: ${modCount}</div>
          <div style="color:#55ff55;">Cloud Synced</div>
        </div>
      `;

      item.addEventListener("click", () => {
        document.querySelectorAll(".world-item").forEach(el => el.classList.remove("selected"));
        item.classList.add("selected");
        selectedWorldId = w.id;
        btnPlay.disabled = false;
        btnDelete.disabled = false;
      });

      // Double-click a world to launch immediately
      item.addEventListener("dblclick", () => {
        selectedWorldId = w.id;
        btnPlay.click();
      });

      listEl.appendChild(item);

      if (autoSelectId && w.id === autoSelectId) {
        item.click();
      }
    });

  } catch (err) {
    listEl.innerHTML = `<p class="mc-error">Error loading worlds: ${err.message}</p>`;
  }
}

// Initialize UI on load and listen for the Singleplayer button from Chunk 1
initWorldManagerUI();

window.addEventListener("open-worlds-screen", () => {
  showScreen(screenWorlds);
  loadUserWorlds();
});
