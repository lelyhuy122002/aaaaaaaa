import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const PRODUCT_MODELS = {
  tshirt: {
    path: 'assets/models/tshirt-web.glb',
    name: 't-shirt',
    meshPattern: /FRONT/i,
    decal: { x: 0.42, y: 0.36, yOffset: 0.06, zOffset: 0.012, depthTest: true },
  },
  hoodie: {
    path: 'assets/models/hoodie-web.glb',
    name: 'hoodie',
    decal: { x: 0.34, y: 0.3, yOffset: 0.02, zOffset: 0.018, depthTest: true },
  },
  polo: {
    path: 'assets/models/polo-web.glb',
    name: 'polo',
    decal: { x: 0.46, y: 0.34, yOffset: -0.03, zOffset: 0.08, depthTest: false },
  },
};

const viewer = {
  ready: false,
  pendingDesignUrl: null,
  pendingDesigns: { front: null, back: null },
  pendingColor: '#ffffff',
  productType: 'tshirt',
  loadVersion: 0,
  designVersion: 0,
  decalMeshes: [],
  shirtMeshes: [],
};

window.tshirt360Viewer = {
  setDesign(url) {
    viewer.pendingDesignUrl = url;
    viewer.pendingDesigns = { front: url, back: null };
    if (viewer.ready) applyDesigns();
  },
  setDesigns(designs = {}) {
    viewer.pendingDesigns = {
      front: designs.front || designs.designUrl || null,
      back: designs.back || null,
    };
    viewer.pendingDesignUrl = viewer.pendingDesigns.front;
    if (viewer.ready) applyDesigns();
  },
  setColor(color) {
    viewer.pendingColor = color;
    if (viewer.ready) applyColor(color);
  },
  setProductType(productType) {
    if (!PRODUCT_MODELS[productType] || productType === viewer.productType) return;
    viewer.productType = productType;
    loadProductModel(productType);
  },
  resize() {
    if (viewer.resize) viewer.resize();
  },
  showSide(side) {
    if (viewer.ready) frameModel(side);
  },
  getDebugState() {
    return {
      ready: viewer.ready,
      productType: viewer.productType,
      shirtMeshCount: viewer.shirtMeshes.length,
      decalCount: viewer.decalMeshes.length,
      pendingDesigns: viewer.pendingDesigns,
      bounds: viewer.bounds
        ? {
            size: viewer.bounds.size.toArray(),
            center: viewer.bounds.center.toArray(),
          }
        : null,
    };
  },
};

const canvas = document.getElementById('tshirt360Canvas');
const container = document.getElementById('mockupContainer');

if (canvas && container) {
  container.classList.add('viewer-loading');
  initializeViewer();
}

function initializeViewer() {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI * 0.32;
  controls.maxPolarAngle = Math.PI * 0.68;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8692a5, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
  keyLight.position.set(3.5, 5, 4);
  keyLight.castShadow = true;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.4);
  fillLight.position.set(-4, 2, 2);
  scene.add(fillLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(5, 64),
    new THREE.ShadowMaterial({ color: 0x0f172a, opacity: 0.14 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  viewer.renderer = renderer;
  viewer.scene = scene;
  viewer.camera = camera;
  viewer.controls = controls;
  viewer.floor = floor;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  viewer.loader = loader;
  loadProductModel(viewer.productType);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  };

  viewer.resize = resize;
  new ResizeObserver(resize).observe(container);
  window.addEventListener('resize', resize);
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

function loadProductModel(productType) {
  const config = PRODUCT_MODELS[productType] || PRODUCT_MODELS.tshirt;
  const loadVersion = ++viewer.loadVersion;

  viewer.ready = false;
  container.classList.add('viewer-loading');
  container.classList.remove('has-real-3d');
  clearDecals();

  if (viewer.model) {
    viewer.scene.remove(viewer.model);
    disposeObject(viewer.model);
    viewer.model = null;
  }
  viewer.shirtMeshes = [];

  viewer.loader.load(
    config.path,
    (gltf) => {
      if (loadVersion !== viewer.loadVersion) {
        disposeObject(gltf.scene);
        return;
      }
      onModelLoaded(gltf.scene, productType);
    },
    undefined,
    (error) => {
      if (loadVersion !== viewer.loadVersion) return;
      container.classList.remove('viewer-loading');
      console.warn(`Could not load 3D ${config.name} model:`, error);
    }
  );
}

function onModelLoaded(model, productType) {
  const meshPattern = PRODUCT_MODELS[productType]?.meshPattern;
  model.traverse((object) => {
    if (!object.isMesh) return;
    if (!object.geometry.attributes.normal) {
      object.geometry.computeVertexNormals();
    }
    object.castShadow = true;
    object.receiveShadow = true;
    if (meshPattern?.test(object.name)) viewer.shirtMeshes.push(object);
  });

  if (!viewer.shirtMeshes.length) {
    model.traverse((object) => {
      if (object.isMesh) viewer.shirtMeshes.push(object);
    });
  }

  viewer.model = model;
  viewer.productType = productType;
  viewer.scene.add(model);
  frameModel();
  viewer.ready = true;
  container.classList.remove('viewer-loading');
  container.classList.add('has-real-3d');
  applyColor(viewer.pendingColor);
  if (viewer.pendingDesigns.front || viewer.pendingDesigns.back) applyDesigns();
}

function clearDecals() {
  viewer.decalMeshes.forEach((mesh) => {
    mesh.geometry.dispose();
    mesh.material.dispose();
    viewer.scene.remove(mesh);
  });
  viewer.decalMeshes = [];
}

function disposeObject(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose?.();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material) return;
      Object.values(material).forEach((value) => {
        if (value?.isTexture) value.dispose();
      });
      material.dispose?.();
    });
  });
}

function frameModel(side = 'front') {
  const box = new THREE.Box3().setFromObject(viewer.model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z);

  viewer.bounds = { box, size, center };
  const direction = side === 'back' ? -1 : 1;
  viewer.camera.position.set(center.x, center.y + size.y * 0.06, center.z + direction * largest * 2.45);
  viewer.controls.target.set(center.x, center.y, center.z);
  viewer.controls.update();
  viewer.floor.position.set(center.x, box.min.y - size.y * 0.02, center.z);
}

function applyColor(color) {
  viewer.shirtMeshes.forEach((mesh) => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (!material) return;
      if (!material.userData.blankupOriginalMapCaptured) {
        material.userData.blankupOriginalMapCaptured = true;
        material.userData.blankupOriginalMap = material.map || null;
      }

      if (material.map) {
        material.map = null;
        material.needsUpdate = true;
      }

      if (material?.color) material.color.set(color);
      material.roughness = Math.max(material.roughness ?? 0.72, 0.78);
      material.metalness = 0;
    });
  });
}

function applyDesigns() {
  clearDecals();
  const version = ++viewer.designVersion;
  const entries = Object.entries(viewer.pendingDesigns).filter(([, url]) => Boolean(url));
  entries.forEach(([side, url]) => applySideDesign(url, side, version));
}

function applyDesign(url) {
  viewer.pendingDesigns = { front: url, back: null };
  applyDesigns();
}

function applySideDesign(url, side, version) {
  new THREE.TextureLoader().load(url, (texture) => {
    if (!viewer.ready || version !== viewer.designVersion || url !== viewer.pendingDesigns[side]) {
      texture.dispose();
      return;
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = true;
    texture.anisotropy = Math.min(8, viewer.renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;

    const { box, size, center } = viewer.bounds;
    const decalConfig = PRODUCT_MODELS[viewer.productType]?.decal || PRODUCT_MODELS.tshirt.decal;
    const zDirection = side === 'back' ? -1 : 1;
    const z = side === 'back'
      ? box.min.z - size.z * decalConfig.zOffset
      : box.max.z + size.z * decalConfig.zOffset;
    const position = new THREE.Vector3(center.x, center.y + size.y * decalConfig.yOffset, z);
    const orientation = new THREE.Euler(0, side === 'back' ? Math.PI : 0, 0);
    const decalSize = new THREE.Vector3(size.x * decalConfig.x, size.y * decalConfig.y, Math.max(0.08, size.z * 1.8));

    viewer.shirtMeshes.forEach((target) => {
      const geometry = new DecalGeometry(target, position, orientation, decalSize);
      if (!geometry.attributes.position?.count) return;
      const material = new THREE.ShaderMaterial({
        uniforms: { map: { value: texture } },
        transparent: true,
        depthTest: decalConfig.depthTest,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D map;
          varying vec2 vUv;
          void main() {
            vec4 pixel = texture2D(map, vUv);
            float high = max(pixel.r, max(pixel.g, pixel.b));
            float low = min(pixel.r, min(pixel.g, pixel.b));
            if (pixel.a < 0.08 || (high > 0.84 && high - low < 0.22)) discard;
            gl_FragColor = pixel;
          }
        `,
      });
      const decal = new THREE.Mesh(geometry, material);
      decal.renderOrder = side === 'back' ? 1 : 2;
      decal.userData.blankupSide = side;
      decal.position.z += zDirection * 0.0005;
      viewer.scene.add(decal);
      viewer.decalMeshes.push(decal);
    });
  });
}
