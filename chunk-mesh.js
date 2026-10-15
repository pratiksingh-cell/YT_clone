import * as THREE from "three";
import { BLOCK_TYPES, getBlockMaterials } from "./textures.js";

const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 64;

export class ChunkManager {
  constructor(scene, worldGenerator, modifiedBlocks) {
    this.scene = scene;
    this.worldGen = worldGenerator;
    this.modifiedBlocks = modifiedBlocks;
    this.loadedChunks = new Map(); // "chunkX,chunkZ" -> THREE.Group
    
    // Pre-create box geometry for standard blocks to maximize performance
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  }

  // Load or render a chunk at specific chunk coordinates (cx, cz)
  loadChunk(cx, cz) {
    const chunkKey = `${cx},${cz}`;
    if (this.loadedChunks.has(chunkKey)) return;

    const chunkGroup = new THREE.Group();
    chunkGroup.userData = { cx, cz };

    const startX = cx * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;

    // Temporary storage for block IDs in this chunk
    const blockMatrix = new Uint8Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);

    const getIndex = (x, y, z) => x + CHUNK_SIZE * (y + WORLD_HEIGHT * z);

    // 1. Populate block IDs from world generator & delta saves
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
          const worldX = startX + x;
          const worldZ = startZ + z;
          const blockId = this.worldGen.getBlockAt(worldX, y, worldZ, this.modifiedBlocks);
          blockMatrix[getIndex(x, y, z)] = blockId;
        }
      }
    }

    // 2. Build instanced or individual meshes for visible blocks only (culling interior faces)
    const instancesByBlock = {};

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
          const blockId = blockMatrix[getIndex(x, y, z)];
          if (blockId === BLOCK_TYPES.AIR) continue;

          // Check if block is fully surrounded by other solid blocks (face culling)
          const isSurrounded = 
            x > 0 && x < CHUNK_SIZE - 1 &&
            z > 0 && z < CHUNK_SIZE - 1 &&
            y > 0 && y < WORLD_HEIGHT - 1 &&
            blockMatrix[getIndex(x + 1, y, z)] !== BLOCK_TYPES.AIR &&
            blockMatrix[getIndex(x - 1, y, z)] !== BLOCK_TYPES.AIR &&
            blockMatrix[getIndex(x, y + 1, z)] !== BLOCK_TYPES.AIR &&
            blockMatrix[getIndex(x, y - 1, z)] !== BLOCK_TYPES.AIR &&
            blockMatrix[getIndex(x, y, z + 1)] !== BLOCK_TYPES.AIR &&
            blockMatrix[getIndex(x, y, z - 1)] !== BLOCK_TYPES.AIR;

          if (isSurrounded) continue; // Skip rendering hidden interior blocks

          const worldX = startX + x;
          const worldZ = startZ + z;

          if (!instancesByBlock[blockId]) {
            instancesByBlock[blockId] = [];
          }
          instancesByBlock[blockId].push(new THREE.Vector3(worldX + 0.5, y + 0.5, worldZ + 0.5));
        }
      }
    }

    // 3. Create meshes for each block type in the chunk
    for (const [blockIdStr, positions] of Object.entries(instancesByBlock)) {
      const blockId = parseInt(blockIdStr, 10);
      const materials = getBlockMaterials(blockId);
      
      // Use InstancedMesh for extreme performance when there are many identical blocks
      const count = positions.length;
      const instancedMesh = new THREE.InstancedMesh(this.boxGeometry, materials, count);
      
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        dummy.position.copy(positions[i]);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;
      chunkGroup.add(instancedMesh);
    }

    this.scene.add(chunkGroup);
    this.loadedChunks.set(chunkKey, chunkGroup);
  }

  // Unload chunk to free memory when player walks far away
  unloadChunk(cx, cz) {
    const chunkKey = `${cx},${cz}`;
    const chunkGroup = this.loadedChunks.get(chunkKey);
    if (chunkGroup) {
      this.scene.remove(chunkGroup);
      chunkGroup.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.loadedChunks.delete(chunkKey);
    }
  }

  // Update visible chunks around player position
  updateAroundPlayer(playerX, playerZ, renderDistance = 2) {
    const playerCX = Math.floor(playerX / CHUNK_SIZE);
    const playerCZ = Math.floor(playerZ / CHUNK_SIZE);

    const activeKeys = new Set();

    for (let x = -renderDistance; x <= renderDistance; x++) {
      for (let z = -renderDistance; z <= renderDistance; z++) {
        const cx = playerCX + x;
        const cz = playerCZ + z;
        activeKeys.add(`${cx},${cz}`);
        this.loadChunk(cx, cz);
      }
    }

    // Unload chunks outside render distance
    for (const [chunkKey] of this.loadedChunks.entries()) {
      if (!activeKeys.has(chunkKey)) {
        const [cx, cz] = chunkKey.split(",").map(Number);
        this.unloadChunk(cx, cz);
      }
    }
  }

  // Refresh a specific chunk when a block is broken or placed
  refreshChunkAt(worldX, worldZ) {
    const cx = Math.floor(worldX / CHUNK_SIZE);
    const cz = Math.floor(worldZ / CHUNK_SIZE);
    this.unloadChunk(cx, cz);
    this.loadChunk(cx, cz);
  }
}
