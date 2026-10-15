import * as THREE from "three";
import { BLOCK_TYPES } from "./textures.js";

export class Player {
  constructor(camera, scene, worldGenerator, modifiedBlocks, initialPos) {
    this.camera = camera;
    this.scene = scene;
    this.worldGen = worldGenerator;
    this.modifiedBlocks = modifiedBlocks;

    // Player physical dimensions
    this.radius = 0.3;
    this.height = 1.6; // Eye level is ~1.5

    // Position & Velocity
    this.position = new THREE.Vector3(initialPos.x, initialPos.y, initialPos.z);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.camera.position.copy(this.position);

    // Movement flags
    this.moveState = { forward: false, backward: false, left: false, right: false, jump: false, sprinting: false };
    this.isGrounded = false;
    this.flyMode = false; // Toggled in creative mode

    // Mouse look angles
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.enabled = false;

    this.initControls();
  }

  initControls() {
    const canvas = document.body;

    canvas.addEventListener("click", () => {
      if (!this.enabled) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener("pointerlockchange", () => {
      this.enabled = document.pointerLockElement === canvas;
      const crosshair = document.getElementById("crosshair");
      if (crosshair) crosshair.style.display = this.enabled ? "block" : "none";
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.enabled) return;
      const sensitivity = 0.002;
      this.euler.y -= e.movementX * sensitivity;
      this.euler.x -= e.movementY * sensitivity;

      // Clamp vertical look angle so player doesn't flip over
      const HALF_PI = Math.PI / 2 - 0.01;
      this.euler.x = Math.max(-HALF_PI, Math.min(HALF_PI, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });

    document.addEventListener("keydown", (e) => this.onKey(e, true));
    document.addEventListener("keyup", (e) => this.onKey(e, false));
  }

  onKey(e, isDown) {
    switch (e.code) {
      case "KeyW": this.moveState.forward = isDown; break;
      case "KeyS": this.moveState.backward = isDown; break;
      case "KeyA": this.moveState.left = isDown; break;
      case "KeyD": this.moveState.right = isDown; break;
      case "Space": 
        if (isDown && this.isGrounded && !this.flyMode) {
          this.velocity.y = 7.5; // Jump strength
          this.isGrounded = false;
        }
        this.moveState.jump = isDown; 
        break;
      case "ShiftLeft": this.moveState.sprinting = isDown; break;
      case "KeyF": // Toggle Fly Mode (Creative feature)
        if (isDown) {
          this.flyMode = !this.flyMode;
          this.velocity.set(0, 0, 0);
        }
        break;
    }
  }

  // Check if a bounding box collides with any solid block in the world
  checkCollision(pos) {
    const minX = Math.floor(pos.x - this.radius);
    const maxX = Math.floor(pos.x + this.radius);
    const minY = Math.floor(pos.y - this.height);
    const maxY = Math.floor(pos.y);
    const minZ = Math.floor(pos.z - this.radius);
    const maxZ = Math.floor(pos.z + this.radius);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const blockId = this.worldGen.getBlockAt(x, y, z, this.modifiedBlocks);
          if (blockId !== BLOCK_TYPES.AIR && blockId !== BLOCK_TYPES.LEAVES) {
            return true; // Collision detected
          }
        }
      }
    }
    return false;
  }

  update(delta) {
    if (!this.enabled) return;

    const speed = this.moveState.sprinting ? 7.0 : 4.3;

    // Calculate movement direction vector relative to camera rotation
    const dir = new THREE.Vector3();
    if (this.moveState.forward) dir.z -= 1;
    if (this.moveState.backward) dir.z += 1;
    if (this.moveState.left) dir.x -= 1;
    if (this.moveState.right) dir.x += 1;
    dir.normalize();
    dir.applyEuler(new THREE.Euler(0, this.euler.y, 0));

    if (this.flyMode) {
      // Creative flight physics
      this.velocity.x = dir.x * speed * 1.5;
      this.velocity.z = dir.z * speed * 1.5;
      this.velocity.y = 0;
      if (this.moveState.jump) this.velocity.y = 5;
      if (this.moveState.sprinting) this.velocity.y = -5;

      this.position.addScaledVector(this.velocity, delta);
    } else {
      // Standard gravity & friction physics
      this.velocity.x = dir.x * speed;
      this.velocity.z = dir.z * speed;
      this.velocity.y -= 22.0 * delta; // Gravity pull

      // Apply X axis movement & collision check
      this.position.x += this.velocity.x * delta;
      if (this.checkCollision(this.position)) {
        this.position.x -= this.velocity.x * delta;
        this.velocity.x = 0;
      }

      // Apply Z axis movement & collision check
      this.position.z += this.velocity.z * delta;
      if (this.checkCollision(this.position)) {
        this.position.z -= this.velocity.z * delta;
        this.velocity.z = 0;
      }

      // Apply Y axis movement & collision check
      this.position.y += this.velocity.y * delta;
      if (this.checkCollision(this.position)) {
        if (this.velocity.y < 0) {
          this.isGrounded = true; // Landed on ground
        }
        this.position.y -= this.velocity.y * delta;
        this.velocity.y = 0;
      } else {
        this.isGrounded = false;
      }
    }

    // Update camera position to player head
    this.camera.position.copy(this.position);
  }
}
