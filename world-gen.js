import { BLOCK_TYPES } from "./textures.js";

// Simple reliable pseudo-random number generator seeded by the world seed
function createPseudoRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// 2D Simplex/Perlin-style noise approximation for browser terrain generation
class SimpleNoise {
  constructor(seed) {
    const rnd = createPseudoRandom(seed);
    this.p = new Uint8Array(512);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = perm[i];
      perm[i] = perm[j];
      perm[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.p[i] = perm[i & 255];
    }
  }

  noise2D(xin, yin) {
    // Fast gradient noise implementation
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    
    let s = (xin + yin) * F2;
    let i = Math.floor(xin + s);
    let j = Math.floor(yin + s);
    
    let t = (i + j) * G2;
    let X0 = i - t;
    let Y0 = j - t;
    let x0 = xin - X0;
    let y0 = yin - Y0;
    
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    
    let x1 = x0 - i1 + G2;
    let y1 = y0 - j1 + G2;
    let x2 = x0 - 1.0 + 2.0 * G2;
    let y2 = y0 - 1.0 + 2.0 * G2;
    
    let ii = i & 255;
    let jj = j & 255;
    
    let gi0 = this.p[ii + this.p[jj]] % 12;
    let gi1 = this.p[ii + i1 + this.p[jj + j1]] % 12;
    let gi2 = this.p[ii + 1 + this.p[jj + 1]] % 12;
    
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.grad(gi0, x0, y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.grad(gi1, x1, y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.grad(gi2, x2, y2);
    }
    return 70.0 * (n0 + n1 + n2);
  }

  grad(hash, x, y) {
    let h = hash & 7;
    let u = h < 4 ? x : y;
    let v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
}

export class WorldGenerator {
  constructor(seed) {
    this.seed = seed;
    this.noise = new SimpleNoise(seed);
    this.rnd = createPseudoRandom(seed + 999);
  }

  // Determines the block ID for any 3D coordinate (x, y, z) in the world
  getBlockAt(x, y, z, modifiedBlocks = {}) {
    // 1. Check if player has broken or placed a block here (Delta override)
    const key = `${x},${y},${z}`;
    if (key in modifiedBlocks) {
      return modifiedBlocks[key];
    }

    // 2. Bedrock floor at bottom of world (y = 0)
    if (y === 0) {
      return BLOCK_TYPES.BEDROCK;
    }
    if (y < 0 || y > 64) {
      return BLOCK_TYPES.AIR;
    }

    // 3. Procedural terrain height from multi-octave noise
    let nx = x * 0.015;
    let nz = z * 0.015;
    let heightNoise = this.noise.noise2D(nx, nz) * 12 + this.noise.noise2D(nx * 3, nz * 3) * 4;
    let surfaceHeight = Math.floor(24 + heightNoise);

    if (y > surfaceHeight) {
      // Check for trees on surface (every few blocks)
      if (y > surfaceHeight && y <= surfaceHeight + 5 && surfaceHeight >= 18) {
        // Simple procedural tree placement check
        const treeCheckRnd = createPseudoRandom(this.seed + x * 73856093 ^ z * 19349663);
        if (treeCheckRnd() < 0.008 && x % 6 === 0 && z % 6 === 0) {
          const trunkHeight = 4;
          if (y <= surfaceHeight + trunkHeight) {
            return BLOCK_TYPES.WOOD;
          }
          if (y === surfaceHeight + trunkHeight + 1 || y === surfaceHeight + trunkHeight + 2) {
            // Leaf canopy
            let distFromCenter = Math.abs(x % 6 - 3) + Math.abs(z % 6 - 3);
            if (distFromCenter <= 3) return BLOCK_TYPES.LEAVES;
          }
        }
      }
      return BLOCK_TYPES.AIR;
    }

    // 4. Caves (carved out underground using 3D noise approximation)
    if (y < surfaceHeight - 3) {
      let caveNoise = Math.abs(this.noise.noise2D(x * 0.05, y * 0.05) + this.noise.noise2D(z * 0.05, y * 0.05));
      if (caveNoise < 0.18 && y > 2) {
        return BLOCK_TYPES.AIR; // Cave opening
      }
    }

    // 5. Soil layers
    if (y === surfaceHeight) {
      return BLOCK_TYPES.GRASS;
    }
    if (y >= surfaceHeight - 3) {
      return BLOCK_TYPES.DIRT;
    }

    return BLOCK_TYPES.STONE;
  }
}
