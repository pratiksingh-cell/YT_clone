import * as THREE from "three";
import { BLOCK_TYPES } from "./textures.js";

export class BlockInteractor {
  constructor(camera, scene, worldGenerator, modifiedBlocks, chunkManager, getSelectedBlockId) {
    this.camera = camera;
    this.scene = scene;
    this.worldGen = worldGenerator;
    this.modifiedBlocks = modifiedBlocks;
    this.chunkManager = chunkManager;
    this.getSelectedBlockId = getSelectedBlockId;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 6.0; // Maximum reach distance (6 blocks)

    // Create wireframe box to highlight targeted block
    const wireGeo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    this.selectionBox = new THREE.Mesh(wireGeo, wireMat);
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);

    this.currentTarget = null;
    this.initListeners();
  }

  initListeners() {
    window.addEventListener("mousedown", (e) => {
      if (document.pointerLockElement !== document.body) return;
      if (!this.currentTarget) return;

      const { x, y, z, normal } = this.currentTarget;

      if (e.button === 0) {
        // Left Click: Break Block
        this.modifiedBlocks[`${x},${y},${z}`] = BLOCK_TYPES.AIR;
        this.chunkManager.refreshChunkAt(x, z);

      } else if (e.button === 2) {
        // Right Click: Place Block
        const placeX = x + normal.x;
        const placeY = y + normal.y;
        const placeZ = z + normal.z;

        // Prevent placing blocks inside the player's body
        const camPos = this.camera.position;
        const distSq = (placeX + 0.5 - camPos.x) ** 2 + (placeY + 0.5 - camPos.y) ** 2 + (placeZ + 0.5 - camPos.z) ** 2;
        if (distSq > 0.75) {
          const selectedBlockId = this.getSelectedBlockId();
          this.modifiedBlocks[`${placeX},${placeY},${placeZ}`] = selectedBlockId;
          this.chunkManager.refreshChunkAt(placeX, placeZ);
        }
      }
    });

    // Disable browser context menu on right click so placing works smoothly
    window.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  update() {
    if (document.pointerLockElement !== document.body) {
      this.selectionBox.visible = false;
      this.currentTarget = null;
      return;
    }

    // Cast ray from center of screen
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    
    // Gather all loaded chunk meshes for raycasting
    const intersectableObjects = [];
    for (const chunkGroup of this.chunkManager.loadedChunks.values()) {
      chunkGroup.traverse(child => {
        if (child.isInstancedMesh) intersectableObjects.push(child);
      });
    }

    const intersects = this.raycaster.intersectObjects(intersectableObjects, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const instanceId = hit.instanceId;
      const instancedMesh = hit.object;

      // Extract exact block position from instance matrix
      const matrix = new THREE.Matrix4();
      instancedMesh.getMatrixAt(instanceId, matrix);
      const position = new THREE.Vector3().setFromMatrixPosition(matrix);

      const blockX = Math.floor(position.x);
      const blockY = Math.floor(position.y);
      const blockZ = Math.floor(position.z);

      // Calculate face normal for block placement
      const normal = hit.face.normal.clone();
      normal.transformDirection(instancedMesh.matrixWorld);
      normal.round();

      this.selectionBox.position.set(blockX + 0.5, blockY + 0.5, blockZ + 0.5);
      this.selectionBox.visible = true;

      this.currentTarget = { x: blockX, y: blockY, z: blockZ, normal };
    } else {
      this.selectionBox.visible = false;
      this.currentTarget = null;
    }
  }
}
