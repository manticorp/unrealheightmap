import type * as THREE_NS from "three";

/**
 * Interactive 3D preview of the export area. three.js is loaded on first use
 * so it doesn't add to the page's initial download.
 */

export type PreviewMeshData = {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  topVertexCount: number;
  gridHeights: Float32Array;
  /** Heights (metres) of each top vertex, when the top surface isn't the full grid (simplified meshes). */
  vertexHeights?: Float32Array;
  uvs?: Float32Array;
  units: 'm' | 'mm';
};

/** Where the light comes from. `null` keeps the fixed hillshade-style light. */
export type PreviewSun = {
  /** Unit vector towards the sun, +x east, +y north, +z up. */
  direction: [number, number, number];
  /** Degrees above the horizon; below 0 is night. */
  altitude: number;
  shadows: boolean;
};

export type PreviewColouring = {
  /** Paint terrain at or below this height (metres) as water. null = no water. */
  waterLevel: number | null;
};

type ThreeModule = typeof THREE_NS;

// Hypsometric-ish ramp from low to high ground
const RAMP: [number, [number, number, number]][] = [
  [0.00, [0.29, 0.45, 0.24]],
  [0.35, [0.55, 0.58, 0.33]],
  [0.60, [0.62, 0.52, 0.38]],
  [0.85, [0.55, 0.53, 0.52]],
  [1.00, [0.95, 0.95, 0.96]],
];
const WATER: [number, number, number] = [0.23, 0.43, 0.65];
const SIDES: [number, number, number] = [0.36, 0.30, 0.25];

const rampColour = (t: number): [number, number, number] => {
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i - 1];
      const [t1, c1] = RAMP[i];
      const f = (t - t0) / (t1 - t0 || 1);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return RAMP[RAMP.length - 1][1];
};

export const previewColours = (data: PreviewMeshData, colouring: PreviewColouring): Float32Array => {
  const count = data.positions.length / 3;
  const colours = new Float32Array(count * 3);
  let min = Infinity, max = -Infinity;
  const heights = data.vertexHeights ?? data.gridHeights;
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    if (h < min) min = h;
    if (h > max) max = h;
  }
  const range = max - min || 1;
  for (let v = 0; v < count; v++) {
    let c: [number, number, number];
    if (v < data.topVertexCount) {
      const h = heights[v];
      c = colouring.waterLevel !== null && h <= colouring.waterLevel ? WATER : rampColour((h - min) / range);
    } else {
      c = SIDES;
    }
    colours[v * 3] = c[0];
    colours[v * 3 + 1] = c[1];
    colours[v * 3 + 2] = c[2];
  }
  return colours;
};

export class TerrainPreview {
  container: HTMLElement;
  THREE: ThreeModule | null = null;
  renderer: THREE_NS.WebGLRenderer | null = null;
  scene: THREE_NS.Scene | null = null;
  camera: THREE_NS.PerspectiveCamera | null = null;
  controls: any = null;
  mesh: THREE_NS.Mesh | null = null;
  resizeObserver: ResizeObserver | null = null;
  frame = 0;
  hasFramed = false;
  sunLight: THREE_NS.DirectionalLight | null = null;
  ambient: THREE_NS.HemisphereLight | null = null;
  sun: PreviewSun | null = null;
  texture: THREE_NS.Texture | null = null;
  lastData: PreviewMeshData | null = null;
  lastColouring: PreviewColouring | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async init() {
    if (this.renderer) return;
    const [THREE, {OrbitControls}] = await Promise.all([
      import(/* webpackChunkName: "three" */ "three"),
      import(/* webpackChunkName: "three" */ "three/examples/jsm/controls/OrbitControls.js"),
    ]);
    this.THREE = THREE;
    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x1f2d3b);
    this.container.appendChild(renderer.domElement);
    this.renderer = renderer;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    this.ambient = new THREE.HemisphereLight(0xdde8ff, 0x3a3020, 1.2);
    scene.add(this.ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-1, 1, 1.2); // low-ish sun from the north-west, like a hillshade
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);
    scene.add(sun.target);
    this.sunLight = sun;
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.up.set(0, 0, 1); // terrain is Z-up
    this.camera = camera;

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.addEventListener('change', () => this.requestRender());

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  /** Swap in a new mesh. Keeps the current camera unless `reframe` is set. */
  setMesh(data: PreviewMeshData, colouring: PreviewColouring, reframe: boolean = false) {
    const THREE = this.THREE;
    if (!THREE || !this.scene || !this.camera) return;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE_NS.Material[]).forEach(m => m.dispose());
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(previewColours(data, colouring), 3));
    if (data.uvs) {
      geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    }
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    // Top-surface triangles come first; walls and base after. Separate groups let
    // a texture cover the top while the sides stay a plain colour.
    let topIndexCount = data.indices.length;
    for (let i = 0; i < data.indices.length; i += 3) {
      if (data.indices[i] >= data.topVertexCount || data.indices[i + 1] >= data.topVertexCount || data.indices[i + 2] >= data.topVertexCount) {
        topIndexCount = i;
        break;
      }
    }
    geometry.addGroup(0, topIndexCount, 0);
    if (topIndexCount < data.indices.length) {
      geometry.addGroup(topIndexCount, data.indices.length - topIndexCount, 1);
    }
    geometry.computeBoundingSphere();
    const top = new THREE.MeshStandardMaterial({roughness: 0.95, metalness: 0, flatShading: false});
    const sides = new THREE.MeshStandardMaterial({roughness: 1, metalness: 0, color: new THREE.Color().setRGB(...SIDES)});
    this.mesh = new THREE.Mesh(geometry, [top, sides]);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.lastData = data;
    this.lastColouring = colouring;
    this.applyMaterial();
    this.scene.add(this.mesh);
    this.applySun();

    if (reframe || !this.hasFramed) {
      this.frameMesh();
      this.hasFramed = true;
    }
    this.requestRender();
  }

  /** Drape an image (e.g. satellite imagery) over the top surface, or null for height colours. */
  setTexture(image: TexImageSource | null) {
    const THREE = this.THREE;
    if (!THREE) return;
    this.texture?.dispose();
    this.texture = null;
    if (image) {
      const texture = new THREE.Texture(image as any);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = this.renderer?.capabilities.getMaxAnisotropy() ?? 1;
      texture.needsUpdate = true;
      this.texture = texture;
    }
    this.applyMaterial();
    this.requestRender();
  }

  applyMaterial() {
    if (!this.mesh) return;
    const material = (this.mesh.material as THREE_NS.MeshStandardMaterial[])[0];
    const useTexture = !!this.texture && !!this.lastData?.uvs;
    material.map = useTexture ? this.texture : null;
    material.vertexColors = !useTexture;
    material.needsUpdate = true;
  }

  /** Light the terrain from a real sun position, or null for the default hillshade light. */
  setSun(sun: PreviewSun | null) {
    this.sun = sun;
    this.applySun();
    this.requestRender();
  }

  applySun() {
    const THREE = this.THREE;
    const light = this.sunLight;
    if (!THREE || !light || !this.renderer) return;
    const sphere = this.mesh?.geometry.boundingSphere;
    const r = sphere?.radius || 1;
    const c = sphere?.center ?? new THREE.Vector3();
    const sun = this.sun;
    const dir = sun ? sun.direction : [-1 / 1.9, 1 / 1.9, 1.2 / 1.9];
    light.position.set(c.x + dir[0] * r * 3, c.y + dir[1] * r * 3, c.z + dir[2] * r * 3);
    light.target.position.copy(c);
    light.target.updateMatrixWorld();

    if (!sun) {
      light.intensity = 2.2;
      light.color.setRGB(1, 1, 1);
      light.castShadow = false;
      if (this.ambient) this.ambient.intensity = 1.2;
      this.renderer.setClearColor(0x1f2d3b);
      return;
    }
    const alt = sun.altitude;
    // Fade the sun in around the horizon and warm it up when it's low
    const day = Math.max(0, Math.min(1, (alt + 2) / 8));
    const warmth = Math.max(0, Math.min(1, 1 - alt / 25));
    light.intensity = 3 * day;
    light.color.setRGB(1, 1 - 0.25 * warmth, 1 - 0.5 * warmth);
    if (this.ambient) {
      this.ambient.intensity = 0.15 + 0.85 * day;
    }
    const sky = new THREE.Color().setRGB(0.03 + 0.2 * day, 0.04 + 0.3 * day, 0.08 + 0.4 * day);
    this.renderer.setClearColor(sky);

    light.castShadow = sun.shadows && alt > 0;
    const cam = light.shadow.camera;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
    cam.near = r * 0.5;
    cam.far = r * 5;
    cam.updateProjectionMatrix();
    // Low sun skims the surface, which needs a little more bias to avoid acne
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = r * 0.002;
    light.shadow.needsUpdate = true;
  }

  frameMesh() {
    if (!this.mesh || !this.camera || !this.controls) return;
    const sphere = this.mesh.geometry.boundingSphere;
    const r = sphere.radius || 1;
    const c = sphere.center;
    this.camera.near = r / 100;
    this.camera.far = r * 20;
    this.camera.position.set(c.x, c.y - r * 1.6, c.z + r * 1.1);
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(c);
    this.controls.minDistance = r * 0.2;
    this.controls.maxDistance = r * 6;
    this.controls.update();
  }

  requestRender() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      // Damping needs a few extra frames to settle
      if (this.controls?.update()) this.requestRender();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    });
  }

  dispose() {
    this.resizeObserver?.disconnect();
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE_NS.Material[]).forEach(m => m.dispose());
    }
    this.texture?.dispose();
    this.controls?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
  }
}
