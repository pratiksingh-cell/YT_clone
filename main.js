import * as THREE from "three";
import { AppState, showScreen, showToast } from "./firebase-mgr.js";
import { WorldGenerator } from "./world-gen.js";
import { ChunkManager } from "./chunk-mesh.js";
import { Player } from "./player.js";
import { BlockInteractor } from "./raycaster.js";
import { AutoSaver } from "./autosave.js";
import { HUDInventory } from "./hud-inventory.js";
import { setupEnvironment } from "./environment.js";

let gameInstance = null;

window.addEventListener("launch-3d-world", (e) => {
  const worldData = e.detail;
  launchGame(worldData);
});

function launchGame(world) {
  // FIX 1: Hide the panorama background so it doesn't cover the 3D canvas
  const screenWorlds = document.getElementById("screen-worlds");
  const gameContainer = document.getElementById("game-container");
  const panoramaBg = document.getElementById("panorama-bg");
  
  if (screenWorlds) screenWorlds.classList.add("hidden");
  if (panoramaBg) panoramaBg.classList.add("hidden");
  if (gameContainer) gameContainer.classList.remove("hidden");
  gameContainer.innerHTML = ""; // Clear previous canvas if any

  // 2. Three.js Scene, Camera & Renderer Setup
  const scene = new THREE.Scene();
  setupEnvironment(scene);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  gameContainer.appendChild(renderer.domElement);

  // Handle window resizing
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 3. Initialize Game Engines
  const worldGen = new WorldGenerator(world.seed);
  const modifiedBlocks = world.modifiedBlocks || {};
  
  const chunkManager = new ChunkManager(scene, worldGen, modifiedBlocks);

  // FIX 2: Spawn at Y: 60 instead of 30 so you fall onto the surface safely!
  const spawnPos = world.playerPosition || { x: 8, y: 60, z: 8 };
  const player = new Player(camera, scene, worldGen, modifiedBlocks, spawnPos);

  const autoSaver = new AutoSaver(world.id, modifiedBlocks, player);

  const hudInventory = new HUDInventory(autoSaver, () => {
    // Return to Main Menu callback
    cleanupGame();
    window.dispatchEvent(new CustomEvent("open-worlds-screen"));
  });

  const blockInteractor = new BlockInteractor(
    camera, 
    scene, 
    worldGen, 
    modifiedBlocks, 
    chunkManager, 
    () => hudInventory.getSelectedBlockId()
  );

  // 4. Initial Chunk Load around spawn
  chunkManager.updateAroundPlayer(player.position.x, player.position.z, 2);

  // 5. Game Loop (60 FPS)
  const clock = new THREE.Clock();
  let animationFrameId = null;

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);

    if (!hudInventory.isPaused) {
      player.update(delta);
      blockInteractor.update();
      chunkManager.updateAroundPlayer(player.position.x, player.position.z, 2);
    }

    renderer.render(scene, camera);
  }

  animate();

  // Store cleanup reference
  gameInstance = {
    cleanup: () => {
      cancelAnimationFrame(animationFrameId);
      autoSaver.destroy();
      renderer.dispose();
      if (gameContainer) gameContainer.innerHTML = "";
    }
  };

  showToast(`Joined "${world.worldName}"! Click screen to look around.`);
}

function cleanupGame() {
  if (gameInstance && typeof gameInstance.cleanup === "function") {
    gameInstance.cleanup();
    gameInstance = null;
  }
  const gameContainer = document.getElementById("game-container");
  const panoramaBg = document.getElementById("panorama-bg");
  
  if (gameContainer) gameContainer.classList.add("hidden");
  if (panoramaBg) panoramaBg.classList.remove("hidden"); // Bring menu background back
}
