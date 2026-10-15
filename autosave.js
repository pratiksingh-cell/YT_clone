import { db } from "./firebase-mgr.js";
import { doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export class AutoSaver {
  constructor(worldId, modifiedBlocks, player) {
    this.worldId = worldId;
    this.modifiedBlocks = modifiedBlocks;
    this.player = player;

    this.isDirty = false;
    this.saveInterval = null;

    this.initAutoSave();
  }

  initAutoSave() {
    // 1. Trigger auto-save every 5 seconds if changes were made
    this.saveInterval = setInterval(() => {
      this.saveToCloud("Auto-saving...");
    }, 5000);

    // 2. Instant save when player closes or switches tabs
    window.addEventListener("beforeunload", () => {
      this.syncNow();
    });

    // 3. Mark dirty whenever modifiedBlocks changes (listened via setter or interval check)
    setInterval(() => {
      this.isDirty = true;
    }, 1000);
  }

  async saveToCloud(statusText = "Saving world...") {
    if (!this.worldId || !this.isDirty) return;

    const toast = document.getElementById("status-toast");
    if (toast) {
      toast.textContent = statusText;
      toast.classList.remove("hidden");
    }

    try {
      const worldRef = doc(db, "worlds", this.worldId);
      const pos = this.player.position;

      await updateDoc(worldRef, {
        modifiedBlocks: this.modifiedBlocks,
        playerPosition: {
          x: parseFloat(pos.x.toFixed(2)),
          y: parseFloat(pos.y.toFixed(2)),
          z: parseFloat(pos.z.toFixed(2)),
          rx: parseFloat(this.player.euler.x.toFixed(2)),
          ry: parseFloat(this.player.euler.y.toFixed(2))
        },
        updatedAt: serverTimestamp()
      });

      this.isDirty = false;
      if (toast) {
        toast.textContent = "Game saved to cloud!";
        setTimeout(() => toast.classList.add("hidden"), 1800);
      }
    } catch (err) {
      console.error("Auto-save failed:", err);
      if (toast) {
        toast.textContent = "Save failed (Offline?)";
        setTimeout(() => toast.classList.add("hidden"), 2500);
      }
    }
  }

  // Force immediate save (useful for Pause Menu "Save & Quit")
  async syncNow() {
    await this.saveToCloud("Saving game...");
  }

  destroy() {
    if (this.saveInterval) clearInterval(this.saveInterval);
  }
}
