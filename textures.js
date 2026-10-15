import * as THREE from "three";

// Block ID definitions matching standard Minecraft IDs
export const BLOCK_TYPES = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,
  LEAVES: 5,
  BRICK: 6,
  GLASS: 7,
  BEDROCK: 8
};

// Helper: Generates a 16x16 pixel art canvas and converts it to a Three.js Texture
function createPixelTexture(drawFunction) {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  
  // Disable smoothing for sharp pixelated edges
  ctx.imageSmoothingEnabled = false;
  drawFunction(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

// Procedural 16x16 Textures for each block type
export const Textures = {
  // 1. Grass (Green top, side has grass overhang over dirt, bottom is dirt)
  grassTop: createPixelTexture((ctx) => {
    ctx.fillStyle = "#5c9e31";
    ctx.fillRect(0, 0, 16, 16);
    // Add subtle noise dots for natural variation
    ctx.fillStyle = "#6cb938";
    for (let i = 0; i < 25; i++) {
      ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
    }
  }),

  grassSide: createPixelTexture((ctx) => {
    // Dirt base
    ctx.fillStyle = "#866043";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#735137";
    for (let i = 0; i < 20; i++) {
      ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
    }
    // Grass top layer with jagged overhang
    ctx.fillStyle = "#5c9e31";
    ctx.fillRect(0, 0, 16, 5);
    ctx.fillRect(0, 5, 1, 2);
    ctx.fillRect(2, 5, 1, 3);
    ctx.fillRect(5, 5, 2, 2);
    ctx.fillRect(9, 5, 1, 3);
    ctx.fillRect(12, 5, 2, 2);
  }),

  // 2. Dirt
  dirt: createPixelTexture((ctx) => {
    ctx.fillStyle = "#866043";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#634731";
    for (let i = 0; i < 35; i++) {
      ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
    }
  }),

  // 3. Stone
  stone: createPixelTexture((ctx) => {
    ctx.fillStyle = "#7a7a7a";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#5e5e5e";
    for (let i = 0; i < 30; i++) {
      ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
    }
    ctx.fillStyle = "#9a9a9a";
    for (let i = 0; i < 15; i++) {
      ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
    }
  }),

  // 4. Wood Log (Bark sides, concentric rings on top)
  woodSide: createPixelTexture((ctx) => {
    ctx.fillStyle = "#5c3e1e";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#3d2712";
    for (let x = 2; x < 16; x += 4) {
      ctx.fillRect(x, 0, 2, 16);
    }
  }),

  woodTop: createPixelTexture((ctx) => {
    ctx.fillStyle = "#b59157";
    ctx.fillRect(0, 0, 16, 16);
    ctx.strokeStyle = "#8c6b38";
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, 10, 10);
    ctx.strokeRect(6, 6, 4, 4);
  }),

  // 5. Leaves
  leaves: createPixelTexture((ctx) => {
    ctx.fillStyle = "#2d631e";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#3d8228";
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
    }
    // Transparent holes
    ctx.clearRect(2, 2, 2, 2);
    ctx.clearRect(11, 4, 2, 2);
    ctx.clearRect(6, 11, 2, 2);
  }),

  // 6. Brick
  brick: createPixelTexture((ctx) => {
    ctx.fillStyle = "#8c4232";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#d1d1d1"; // Mortar lines
    for (let y = 0; y < 16; y += 4) {
      ctx.fillRect(0, y, 16, 1);
    }
    ctx.fillRect(4, 0, 1, 4);
    ctx.fillRect(12, 4, 1, 4);
    ctx.fillRect(7, 8, 1, 4);
    ctx.fillRect(2, 12, 1, 4);
    ctx.fillRect(13, 12, 1, 4);
  }),

  // 7. Glass
  glass: createPixelTexture((ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 16, 16);
    // Shiny corner glare
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillRect(2, 2, 3, 3);
  }),

  // 8. Bedrock
  bedrock: createPixelTexture((ctx) => {
    ctx.fillStyle = "#222222";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#111111";
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
    }
    ctx.fillStyle = "#444444";
    for (let i = 0; i < 15; i++) {
      ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
    }
  })
};

// Generates the standard 6-face material array for any block ID
export function getBlockMaterials(blockId) {
  switch (blockId) {
    case BLOCK_TYPES.GRASS:
      // Order: [right, left, top, bottom, front, back]
      return [
        new THREE.MeshLambertMaterial({ map: Textures.grassSide }),
        new THREE.MeshLambertMaterial({ map: Textures.grassSide }),
        new THREE.MeshLambertMaterial({ map: Textures.grassTop }),
        new THREE.MeshLambertMaterial({ map: Textures.dirt }),
        new THREE.MeshLambertMaterial({ map: Textures.grassSide }),
        new THREE.MeshLambertMaterial({ map: Textures.grassSide })
      ];

    case BLOCK_TYPES.DIRT:
      return new THREE.MeshLambertMaterial({ map: Textures.dirt });

    case BLOCK_TYPES.STONE:
      return new THREE.MeshLambertMaterial({ map: Textures.stone });

    case BLOCK_TYPES.WOOD:
      return [
        new THREE.MeshLambertMaterial({ map: Textures.woodSide }),
        new THREE.MeshLambertMaterial({ map: Textures.woodSide }),
        new THREE.MeshLambertMaterial({ map: Textures.woodTop }),
        new THREE.MeshLambertMaterial({ map: Textures.woodTop }),
        new THREE.MeshLambertMaterial({ map: Textures.woodSide }),
        new THREE.MeshLambertMaterial({ map: Textures.woodSide })
      ];

    case BLOCK_TYPES.LEAVES:
      return new THREE.MeshLambertMaterial({ map: Textures.leaves, transparent: true, alphaTest: 0.5 });

    case BLOCK_TYPES.BRICK:
      return new THREE.MeshLambertMaterial({ map: Textures.brick });

    case BLOCK_TYPES.GLASS:
      return new THREE.MeshLambertMaterial({ map: Textures.glass, transparent: true, opacity: 0.85, depthWrite: false });

    case BLOCK_TYPES.BEDROCK:
      return new THREE.MeshLambertMaterial({ map: Textures.bedrock });

    default:
      return new THREE.MeshLambertMaterial({ color: 0xff00ff }); // Magenta error block
  }
}
