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
  units: 'm' | 'mm';
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
  for (let i = 0; i < data.gridHeights.length; i++) {
    const h = data.gridHeights[i];
    if (h < min) min = h;
    if (h > max) max = h;
  }
  const range = max - min || 1;
  for (let v = 0; v < count; v++) {
    let c: [number, number, number];
    if (v < data.topVertexCount) {
      const h = data.gridHeights[v];
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

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xdde8ff, 0x3a3020, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-1, 1, 1.2); // low-ish sun from the north-west, like a hillshade
    scene.add(sun);
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
      (this.mesh.material as THREE_NS.Material).dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(previewColours(data, colouring), 3));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.95, metalness: 0, flatShading: false});
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);

    if (reframe || !this.hasFramed) {
      this.frameMesh();
      this.hasFramed = true;
    }
    this.requestRender();
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
      (this.mesh.material as THREE_NS.Material).dispose();
    }
    this.controls?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
  }
}
