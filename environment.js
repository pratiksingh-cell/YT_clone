import * as THREE from "three";

export function setupEnvironment(scene) {
  // 1. Sky Color & Atmospheric Fog
  scene.background = new THREE.Color(0x8cb8ff);
  scene.fog = new THREE.FogExp2(0x8cb8ff, 0.035);

  // 2. Ambient Light (Soft daylight everywhere)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);

  // 3. Directional Sun Light (Casts shadows and highlights block faces)
  const sunLight = new THREE.DirectionalLight(0xffffff, 0.85);
  sunLight.position.set(50, 100, 50);
  scene.add(sunLight);
}
