/**
 * Blankup AI Design Studio - Application Logic
 * Handles AI design generation, mockup preview, ordering, and community gallery
 */

const API_BASE = window.location.origin + '/api';

// State
const state = {
  currentDesign: null,
  selectedColor: '#ffffff',
  selectedSize: 'M',
  quantity: 1,
  currentView: 'front',
  selectedStyle: 'minimalist',
  uploadedFile: null,
  printDesignUrl: null,
  viewer3d: null,
};

document.addEventListener('DOMContentLoaded', () => {
  i18n.init();
  initTabs();
  initStyleSelector();
  initUpload();
  initColorPicker();
  initSizeSelector();
  initQuantity();
  initGenerateButtons();
  initOrderFlow();
  initViewToggle();
  initThreeViewer();
  loadCommunityDesigns();
});

/* ============================================================
   TAB SWITCHING
   ============================================================ */
function initTabs() {
  const tabs = document.querySelectorAll('.studio-tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      contents.forEach(c => {
        c.classList.remove('active');
        if (c.id === `tabContent${capitalize(targetTab)}`) {
          c.classList.add('active');
        }
      });
    });
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ============================================================
   STYLE SELECTOR
   ============================================================ */
function initStyleSelector() {
  const styleGrid = document.getElementById('styleGrid');
  if (!styleGrid) return;

  styleGrid.querySelectorAll('.style-option').forEach(btn => {
    btn.addEventListener('click', () => {
      styleGrid.querySelectorAll('.style-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedStyle = btn.dataset.style;
    });
  });
}

/* ============================================================
   IMAGE UPLOAD
   ============================================================ */
function initUpload() {
  const dropzone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('imageUpload');
  const preview = document.getElementById('uploadPreview');
  const previewImg = document.getElementById('uploadPreviewImg');
  const removeBtn = document.getElementById('removeUpload');

  if (!dropzone || !fileInput) return;

  // Click to upload
  dropzone.addEventListener('click', () => fileInput.click());

  // Drag & drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  // Remove upload
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      state.uploadedFile = null;
      preview.classList.remove('show');
      dropzone.style.display = 'block';
      fileInput.value = '';
    });
  }

  function handleFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large! Max 5MB.');
      return;
    }

    state.uploadedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      preview.classList.add('show');
      dropzone.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
}

/* ============================================================
   COLOR PICKER
   ============================================================ */
function initColorPicker() {
  const options = document.getElementById('colorOptions');
  if (!options) return;

  options.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      options.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedColor = btn.dataset.color;
      updateMockupColor();
    });
  });
}

function updateMockupColor() {
  const mockup = document.getElementById('mockupTshirt');
  if (!mockup) return;

  // Generate SVG with selected color
  const color = state.selectedColor;
  const isLight = isLightColor(color);
  const strokeColor = isLight ? '#ddd' : 'rgba(255,255,255,0.2)';
  const gradientLight = lightenColor(color, 10);
  const gradientDark = darkenColor(color, 10);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${gradientLight}"/>
          <stop offset="100%" stop-color="${gradientDark}"/>
        </linearGradient>
      </defs>
      <path d="M75 50 L30 80 L10 140 L55 150 L65 100 L65 330 L235 330 L235 100 L245 150 L290 140 L270 80 L225 50 L195 65 Q175 80 150 80 Q125 80 105 65 Z" fill="url(#g)" stroke="${strokeColor}" stroke-width="1"/>
      <ellipse cx="150" cy="52" rx="30" ry="15" fill="none" stroke="${strokeColor}" stroke-width="1"/>
    </svg>
  `;

  mockup.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  updateThreeTexture();
  window.tshirt360Viewer?.setColor(color);
}

/* ============================================================
   3D T-SHIRT VIEWER
   ============================================================ */
function initThreeViewer() {
  initCss3DViewer();
}

function initCss3DViewer() {
  const canvas = document.getElementById('mockup3dCanvas');
  const container = document.getElementById('mockupContainer');
  if (!container) return;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let tiltX = 0;
  let tiltY = 0;

  function setTilt(x, y) {
    tiltX = Math.max(-18, Math.min(18, x));
    tiltY = Math.max(-38, Math.min(38, y));
    container.style.setProperty('--tilt-x', `${tiltX}deg`);
    container.style.setProperty('--tilt-y', `${tiltY}deg`);
  }

  state.cssViewer = {
    showFront: () => setTilt(-3, 4),
    showBack: () => setTilt(-3, -38),
  };

  container.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    container.setPointerCapture(event.pointerId);
  });

  container.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    setTilt(tiltX - dy * 0.18, tiltY + dx * 0.18);
  });

  container.addEventListener('pointerup', () => {
    dragging = false;
  });

  container.addEventListener('pointercancel', () => {
    dragging = false;
  });

  container.addEventListener('dblclick', () => setTilt(0, 0));
  setTilt(-3, 4);

  if (canvas) canvas.style.display = 'none';
}

function initThreeViewerEnabled() {
  const canvas = document.getElementById('mockup3dCanvas');
  const container = document.getElementById('mockupContainer');
  if (!canvas || !container || !window.THREE) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.15, 8);

  const group = new THREE.Group();
  scene.add(group);

  const frontGeometry = createCurvedShirtGeometry(1);
  const backGeometry = createCurvedShirtGeometry(-1);
  const frontTexture = createThreeTexture(true);
  const backTexture = createThreeTexture(false);

  const frontMaterial = new THREE.MeshStandardMaterial({
    map: frontTexture,
    transparent: true,
    alphaTest: 0.02,
    roughness: 0.72,
    metalness: 0.02,
    side: THREE.FrontSide,
  });

  const backMaterial = frontMaterial.clone();
  backMaterial.map = backTexture;
  backMaterial.side = THREE.BackSide;

  const frontMesh = new THREE.Mesh(frontGeometry, frontMaterial);
  const backMesh = new THREE.Mesh(backGeometry, backMaterial);
  frontMesh.rotation.x = -0.02;
  backMesh.rotation.x = -0.02;
  const shirtCore = createShirtCore();
  group.add(shirtCore, frontMesh, backMesh);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.43, 0.055, 12, 48, Math.PI),
    new THREE.MeshStandardMaterial({ color: state.selectedColor, roughness: 0.78 })
  );
  collar.position.set(0, 1.82, 0.13);
  collar.rotation.z = Math.PI;
  group.add(collar);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.45),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 })
  );
  shadow.position.set(0, -2.32, -0.45);
  shadow.scale.x = 0.9;
  group.add(shadow);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd7dee8, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
  keyLight.position.set(2.5, 4, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xfff1dc, 1.2);
  rimLight.position.set(-3, 2, 3);
  scene.add(rimLight);

  state.viewer3d = {
    renderer,
    scene,
    camera,
    group,
    frontTexture,
    backTexture,
    frontMesh,
    backMesh,
    shirtCore,
    collar,
    targetRotationY: 0,
    targetRotationX: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
  };

  container.classList.add('has-3d');
  bindThreeViewerControls(canvas);
  resizeThreeViewer();
  updateThreeTexture();
  animateThreeViewer();

  window.addEventListener('resize', resizeThreeViewer);
}

function bindThreeViewerControls(canvas) {
  const viewer = state.viewer3d;
  if (!viewer) return;

  canvas.addEventListener('pointerdown', (event) => {
    viewer.isDragging = true;
    viewer.lastX = event.clientX;
    viewer.lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!viewer.isDragging) return;
    const dx = event.clientX - viewer.lastX;
    const dy = event.clientY - viewer.lastY;
    viewer.lastX = event.clientX;
    viewer.lastY = event.clientY;
    viewer.targetRotationY += dx * 0.01;
    viewer.targetRotationX = Math.max(-0.35, Math.min(0.35, viewer.targetRotationX + dy * 0.006));
  });

  const finishDrag = () => {
    viewer.isDragging = false;
    syncViewerSideFromRotation();
  };

  canvas.addEventListener('pointerup', finishDrag);
  canvas.addEventListener('pointercancel', finishDrag);

  canvas.addEventListener('dblclick', () => setViewerSide('front'));
}

function resizeThreeViewer() {
  const canvas = document.getElementById('mockup3dCanvas');
  const viewer = state.viewer3d;
  if (!canvas || !viewer) return;

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  viewer.renderer.setSize(width, height, false);
  viewer.camera.aspect = width / height;
  viewer.camera.updateProjectionMatrix();
}

function animateThreeViewer() {
  const viewer = state.viewer3d;
  if (!viewer) return;

  viewer.group.rotation.y += (viewer.targetRotationY - viewer.group.rotation.y) * 0.08;
  viewer.group.rotation.x += (viewer.targetRotationX - viewer.group.rotation.x) * 0.08;
  viewer.group.rotation.z = Math.sin(Date.now() * 0.0012) * 0.01;
  viewer.renderer.render(viewer.scene, viewer.camera);
  requestAnimationFrame(animateThreeViewer);
}

function updateThreeTexture() {
  const viewer = state.viewer3d;
  if (!viewer) return;

  viewer.frontTexture.image = createShirtTexture(true);
  viewer.backTexture.image = createShirtTexture(false);
  viewer.frontTexture.needsUpdate = true;
  viewer.backTexture.needsUpdate = true;
  viewer.shirtCore.material.color.set(state.selectedColor);
  viewer.collar.material.color.set(state.selectedColor);
}

function createThreeTexture(includeDesign) {
  const texture = new THREE.CanvasTexture(createShirtTexture(includeDesign));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createCurvedShirtGeometry(side) {
  const geometry = new THREE.PlaneGeometry(4.3, 5.15, 52, 64);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const curve = side * (0.16 - 0.075 * x * x + 0.018 * Math.cos(y * 2.4));
    position.setZ(i, curve);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createShirtCore() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.65, 1.78);
  shape.lineTo(-1.08, 1.62);
  shape.lineTo(-1.78, 1.18);
  shape.lineTo(-2.06, 0.28);
  shape.lineTo(-1.34, 0.08);
  shape.lineTo(-1.18, 0.88);
  shape.lineTo(-1.18, -2.18);
  shape.lineTo(1.18, -2.18);
  shape.lineTo(1.18, 0.88);
  shape.lineTo(1.34, 0.08);
  shape.lineTo(2.06, 0.28);
  shape.lineTo(1.78, 1.18);
  shape.lineTo(1.08, 1.62);
  shape.lineTo(0.65, 1.78);
  shape.quadraticCurveTo(0, 1.38, -0.65, 1.78);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelSize: 0.055,
    bevelThickness: 0.045,
    bevelSegments: 3,
  });
  geometry.translate(0, 0, -0.14);

  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: state.selectedColor,
      roughness: 0.82,
      metalness: 0,
    })
  );
}

function createShirtTexture(includeDesign = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  const scaleX = canvas.width / 300;
  const scaleY = canvas.height / 360;
  ctx.scale(scaleX, scaleY);

  const shirtPath = new Path2D('M75 50 L30 80 L10 140 L55 150 L65 100 L65 330 L235 330 L235 100 L245 150 L290 140 L270 80 L225 50 L195 65 Q175 80 150 80 Q125 80 105 65 Z');
  const color = state.selectedColor;
  const gradient = ctx.createLinearGradient(0, 40, 0, 330);
  gradient.addColorStop(0, lightenColor(color, 12));
  gradient.addColorStop(1, darkenColor(color, 9));
  ctx.fillStyle = gradient;
  ctx.fill(shirtPath);
  ctx.strokeStyle = isLightColor(color) ? '#d9dee7' : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.2;
  ctx.stroke(shirtPath);

  ctx.beginPath();
  ctx.ellipse(150, 52, 30, 15, 0, 0, Math.PI * 2);
  ctx.strokeStyle = isLightColor(color) ? '#d9dee7' : 'rgba(255,255,255,0.25)';
  ctx.stroke();
  ctx.restore();

  if (includeDesign) drawThreeDesign(ctx, canvas);
  return canvas;
}

function drawThreeDesign(ctx, canvas) {
  if (!state.printDesignUrl) return;

  if (!drawThreeDesign.cache) drawThreeDesign.cache = {};
  if (drawThreeDesign.cache.src !== state.printDesignUrl) {
    const design = new Image();
    drawThreeDesign.cache = { src: state.printDesignUrl, image: design, loaded: false };
    design.onload = () => {
      drawThreeDesign.cache.loaded = true;
      updateThreeTexture();
    };
    design.src = state.printDesignUrl;
    return;
  }

  const cached = drawThreeDesign.cache;
  if (!cached.loaded) return;

  const img = cached.image;
  const maxW = 300;
  const maxH = 270;
  const ratio = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = canvas.width / 2 - w / 2;
  const y = canvas.height * 0.35 - h / 2;

  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

/* ============================================================
   SIZE SELECTOR
   ============================================================ */
function initSizeSelector() {
  const options = document.getElementById('sizeOptions');
  if (!options) return;

  options.querySelectorAll('.size-option').forEach(btn => {
    btn.addEventListener('click', () => {
      options.querySelectorAll('.size-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedSize = btn.dataset.size;
    });
  });
}

/* ============================================================
   QUANTITY CONTROL
   ============================================================ */
function initQuantity() {
  const minusBtn = document.getElementById('qtyMinus');
  const plusBtn = document.getElementById('qtyPlus');
  const qtyInput = document.getElementById('qtyValue');

  if (!minusBtn || !plusBtn || !qtyInput) return;

  minusBtn.addEventListener('click', () => {
    if (state.quantity > 1) {
      state.quantity--;
      qtyInput.value = state.quantity;
    }
  });

  plusBtn.addEventListener('click', () => {
    if (state.quantity < 100) {
      state.quantity++;
      qtyInput.value = state.quantity;
    }
  });
}

/* ============================================================
   VIEW TOGGLE (Front/Back)
   ============================================================ */
function initViewToggle() {
  const toggleBtns = document.querySelectorAll('.view-toggle-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentView = btn.dataset.view;
      setViewerSide(state.currentView);
    });
  });
}

function setViewerSide(side) {
  const viewer = state.viewer3d;
  state.currentView = side;
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === side);
  });

  if (window.tshirt360Viewer) {
    window.tshirt360Viewer.showSide(side);
  } else if (viewer) {
    const turns = Math.round(viewer.targetRotationY / (Math.PI * 2));
    viewer.targetRotationY = turns * Math.PI * 2 + (side === 'back' ? Math.PI : 0);
    viewer.targetRotationX = 0;
  } else if (state.cssViewer) {
    if (side === 'back') state.cssViewer.showBack();
    else state.cssViewer.showFront();
  }
}

function syncViewerSideFromRotation() {
  const viewer = state.viewer3d;
  if (!viewer) return;
  const normalized = ((viewer.targetRotationY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const side = normalized > Math.PI / 2 && normalized < Math.PI * 1.5 ? 'back' : 'front';
  state.currentView = side;
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === side);
  });
}

/* ============================================================
   AI DESIGN GENERATION
   ============================================================ */
function initGenerateButtons() {
  const promptBtn = document.getElementById('generatePromptBtn');
  const imageBtn = document.getElementById('generateImageBtn');

  if (promptBtn) {
    promptBtn.addEventListener('click', () => generateFromPrompt());
  }

  if (imageBtn) {
    imageBtn.addEventListener('click', () => generateFromImage());
  }
}

async function generateFromPrompt() {
  const prompt = document.getElementById('promptInput')?.value?.trim();
  if (!prompt) {
    alert(i18n.currentLang === 'vi' ? 'Vui lòng nhập mô tả thiết kế!' : 'Please enter a design description!');
    return;
  }

  const btn = document.getElementById('generatePromptBtn');
  setLoading(btn, true);

  const requestBody = { prompt, style: state.selectedStyle };
  if (auth.isLoggedIn()) {
    requestBody.author = auth.user.fullName || auth.user.username;
  }

  try {
    const response = await fetch(`${API_BASE}/ai-design/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();

    if (data.success && data.designUrl) {
      state.currentDesign = data;
      showDesignOnMockup(data.designUrl, data.productMockupUrl, data.productMockupBlank);
    }
  } catch (err) {
    console.warn('API unavailable, using mock design');
    const mockDesign = generateMockDesign(state.selectedStyle, prompt);
    state.currentDesign = mockDesign;
    showDesignOnMockup(mockDesign.designUrl);
  }

  setLoading(btn, false);
}

async function generateFromImage() {
  if (!state.uploadedFile) {
    alert(i18n.currentLang === 'vi' ? 'Vui lòng upload ảnh!' : 'Please upload an image!');
    return;
  }

  const idea = document.getElementById('ideaInput')?.value?.trim() || '';
  const btn = document.getElementById('generateImageBtn');
  setLoading(btn, true);

  try {
    const formData = new FormData();
    formData.append('image', state.uploadedFile);
    formData.append('idea', idea);
    if (auth.isLoggedIn()) {
      formData.append('author', auth.user.fullName || auth.user.username);
    }

    const response = await fetch(`${API_BASE}/ai-design/generate-from-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();

    if (data.success && data.designUrl) {
      state.currentDesign = data;
      showDesignOnMockup(data.designUrl, data.productMockupUrl, data.productMockupBlank);
    }
  } catch (err) {
    console.warn('API unavailable, using mock design');
    const mockDesign = generateMockDesign('abstract', 'Image remix');
    state.currentDesign = mockDesign;
    showDesignOnMockup(mockDesign.designUrl);
  }

  setLoading(btn, false);
}

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

async function showDesignOnMockup(designUrl, productMockupUrl = null, productMockupBlank = false) {
  const emptyState = document.getElementById('previewEmpty');
  const mockupContainer = document.getElementById('mockupContainer');
  const designOverlay = document.getElementById('mockupDesign');
  const productRender = document.getElementById('productRender3d');
  const orderBtn = document.getElementById('orderBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  if (emptyState) emptyState.style.display = 'none';
  if (mockupContainer) {
    mockupContainer.style.display = 'flex';
    requestAnimationFrame(() => window.tshirt360Viewer?.resize());
  }

  if (productRender && mockupContainer) {
    const hasGltfViewer = Boolean(document.getElementById('tshirt360Canvas'));
    if (productMockupUrl && !hasGltfViewer) {
      productRender.src = productMockupUrl;
      productRender.dataset.sourceUrl = productMockupUrl;
      mockupContainer.classList.add('has-product-render');
      mockupContainer.classList.toggle('design-baked-in', !productMockupBlank);
    } else {
      productRender.removeAttribute('src');
      mockupContainer.classList.remove('has-product-render');
      mockupContainer.classList.remove('design-baked-in');
    }
  }

  if (designOverlay) {
    designOverlay.innerHTML = `<img src="${designUrl}" alt="AI Generated Design" class="mockup-print-design" style="animation: fadeIn 0.5s ease;">`;
    state.printDesignUrl = designUrl;
    updateThreeTexture();
    window.tshirt360Viewer?.setDesign(designUrl);
    renderPrintDesign(designUrl, designOverlay);
  }

  if (orderBtn) orderBtn.disabled = false;
  if (downloadBtn) downloadBtn.disabled = false;

  updateMockupColor();
}

function removeProductMockupBackground(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      const labels = new Int32Array(size * size);
      const queue = new Int32Array(size * size);
      const corner = [data[0], data[1], data[2]];
      const tolerance = 12;
      let head = 0;
      let tail = 0;

      function isBackground(pixel) {
        const index = pixel * 4;
        return Math.max(
          Math.abs(data[index] - corner[0]),
          Math.abs(data[index + 1] - corner[1]),
          Math.abs(data[index + 2] - corner[2])
        ) < tolerance;
      }

      function addBackground(pixel) {
        if (labels[pixel] || !isBackground(pixel)) return;
        labels[pixel] = -1;
        queue[tail++] = pixel;
      }

      for (let x = 0; x < size; x++) {
        addBackground(x);
        addBackground((size - 1) * size + x);
      }
      for (let y = 0; y < size; y++) {
        addBackground(y * size);
        addBackground(y * size + size - 1);
      }

      while (head < tail) {
        const pixel = queue[head++];
        const x = pixel % size;
        const y = Math.floor(pixel / size);
        if (x > 0) addBackground(pixel - 1);
        if (x < size - 1) addBackground(pixel + 1);
        if (y > 0) addBackground(pixel - size);
        if (y < size - 1) addBackground(pixel + size);
      }

      for (let pixel = 0; pixel < labels.length; pixel++) {
        if (labels[pixel] === -1) data[pixel * 4 + 3] = 0;
      }

      let component = 0;
      let largestComponent = 0;
      let largestCount = 0;
      const componentSizes = [];
      const componentBounds = [];

      for (let pixel = 0; pixel < labels.length; pixel++) {
        if (labels[pixel] || data[pixel * 4 + 3] === 0) continue;
        component++;
        head = 0;
        tail = 0;
        let count = 0;
        let minX = size;
        let minY = size;
        let maxX = 0;
        let maxY = 0;
        labels[pixel] = component;
        queue[tail++] = pixel;

        while (head < tail) {
          const current = queue[head++];
          const x = current % size;
          const y = Math.floor(current / size);
          count++;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          const neighbors = [current - 1, current + 1, current - size, current + size];
          for (const next of neighbors) {
            if (next < 0 || next >= labels.length || labels[next] || data[next * 4 + 3] === 0) continue;
            if ((next === current - 1 && x === 0) || (next === current + 1 && x === size - 1)) continue;
            labels[next] = component;
            queue[tail++] = next;
          }
        }

        componentSizes[component] = count;
        componentBounds[component] = { minX, minY, maxX, maxY };
        if (count > largestCount) {
          largestCount = count;
          largestComponent = component;
        }
      }

      if (!largestComponent) return reject(new Error('No shirt subject detected'));
      const bounds = componentBounds[largestComponent];
      for (let pixel = 0; pixel < labels.length; pixel++) {
        if (labels[pixel] !== largestComponent) data[pixel * 4 + 3] = 0;
      }

      const padding = 18;
      const cropX = Math.max(0, bounds.minX - padding);
      const cropY = Math.max(0, bounds.minY - padding);
      const cropWidth = Math.min(size - cropX, bounds.maxX - bounds.minX + padding * 2 + 1);
      const cropHeight = Math.min(size - cropY, bounds.maxY - bounds.minY + padding * 2 + 1);
      ctx.putImageData(imageData, 0, 0);
      const cropped = document.createElement('canvas');
      cropped.width = cropWidth;
      cropped.height = cropHeight;
      cropped.getContext('2d').drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      resolve(cropped.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Mockup image could not be loaded'));
    img.src = imageUrl;
  });
}

async function renderPrintDesign(designUrl, designOverlay) {
  if (!designOverlay || designUrl.startsWith('data:image/svg+xml')) return;

  try {
    const processedUrl = await removeLightImageBackground(designUrl);
    const img = designOverlay.querySelector('img');
    if (img) {
      img.src = processedUrl;
      img.classList.add('processed-print');
      state.printDesignUrl = processedUrl;
      updateThreeTexture();
      window.tshirt360Viewer?.setDesign(processedUrl);
    }
  } catch (err) {
    console.warn('Could not process design background:', err);
  }
}

function removeLightImageBackground(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const size = 900;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      let minX = size;
      let minY = size;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const isLightBackground = max > 218 && max - min < 42;

          if (isLightBackground) {
            data[i + 3] = 0;
          } else if (data[i + 3] > 0) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const labels = new Int32Array(size * size);
      const queue = new Int32Array(size * size);
      let currentLabel = 0;
      let largestLabel = 0;
      let largestCount = 0;
      const bounds = [{ minX: size, minY: size, maxX: 0, maxY: 0 }];

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const start = y * size + x;
          if (labels[start] || data[start * 4 + 3] === 0) continue;

          currentLabel++;
          let head = 0;
          let tail = 0;
          let count = 0;
          let cMinX = x;
          let cMinY = y;
          let cMaxX = x;
          let cMaxY = y;
          labels[start] = currentLabel;
          queue[tail++] = start;

          while (head < tail) {
            const index = queue[head++];
            const cx = index % size;
            const cy = Math.floor(index / size);
            count++;
            cMinX = Math.min(cMinX, cx);
            cMinY = Math.min(cMinY, cy);
            cMaxX = Math.max(cMaxX, cx);
            cMaxY = Math.max(cMaxY, cy);

            const neighbors = [index - 1, index + 1, index - size, index + size];
            for (const next of neighbors) {
              if (next < 0 || next >= labels.length || labels[next]) continue;
              if ((next === index - 1 && cx === 0) || (next === index + 1 && cx === size - 1)) continue;
              if (data[next * 4 + 3] === 0) continue;
              labels[next] = currentLabel;
              queue[tail++] = next;
            }
          }

          bounds[currentLabel] = { minX: cMinX, minY: cMinY, maxX: cMaxX, maxY: cMaxY };
          if (count > largestCount) {
            largestCount = count;
            largestLabel = currentLabel;
          }
        }
      }

      if (largestLabel) {
        const largestBounds = bounds[largestLabel];
        minX = largestBounds.minX;
        minY = largestBounds.minY;
        maxX = largestBounds.maxX;
        maxY = largestBounds.maxY;

        for (let i = 0; i < labels.length; i++) {
          if (labels[i] !== largestLabel) {
            data[i * 4 + 3] = 0;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      if (maxX <= minX || maxY <= minY) {
        resolve(imageUrl);
        return;
      }

      const padding = 28;
      const cropX = Math.max(0, minX - padding);
      const cropY = Math.max(0, minY - padding);
      const cropW = Math.min(size - cropX, maxX - minX + padding * 2);
      const cropH = Math.min(size - cropY, maxY - minY + padding * 2);
      const crop = document.createElement('canvas');
      crop.width = cropW;
      crop.height = cropH;
      crop.getContext('2d').drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(crop.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/* ============================================================
   MOCK DESIGN GENERATOR (Client-side fallback)
   ============================================================ */
function generateMockDesign(style, prompt) {
  const designs = {
    minimalist: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%23f8f9fa" width="200" height="200"/><circle cx="100" cy="80" r="35" fill="none" stroke="%230f172a" stroke-width="2"/><line x1="65" y1="130" x2="135" y2="130" stroke="%230f172a" stroke-width="2"/><line x1="75" y1="145" x2="125" y2="145" stroke="%230f172a" stroke-width="1.5" opacity="0.5"/><circle cx="100" cy="80" r="8" fill="%23ff6b00"/></svg>`,

    streetwear: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%25" stop-color="%23ff6b00"/><stop offset="100%25" stop-color="%23ff0066"/></linearGradient></defs><rect fill="%23111" width="200" height="200" rx="8"/><text x="100" y="85" font-family="Arial Black" font-size="28" fill="url(%23sg)" text-anchor="middle" font-weight="900">BLANK</text><text x="100" y="118" font-family="Arial Black" font-size="28" fill="white" text-anchor="middle" font-weight="900">UP</text><rect x="40" y="135" width="120" height="3" fill="url(%23sg)" rx="1.5"/></svg>`,

    vintage: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%23f5f0e8" width="200" height="200"/><circle cx="100" cy="100" r="70" fill="none" stroke="%238b6914" stroke-width="2"/><circle cx="100" cy="100" r="60" fill="none" stroke="%238b6914" stroke-width="1" opacity="0.5"/><text x="100" y="95" font-family="Georgia" font-size="16" fill="%238b6914" text-anchor="middle">ESTD.</text><text x="100" y="115" font-family="Georgia" font-size="22" fill="%238b6914" text-anchor="middle" font-weight="bold">2024</text><path d="M60 65 Q100 50 140 65" fill="none" stroke="%238b6914" stroke-width="1.5"/><path d="M60 135 Q100 150 140 135" fill="none" stroke="%238b6914" stroke-width="1.5"/></svg>`,

    abstract: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0%25" stop-color="%236366f1"/><stop offset="50%25" stop-color="%23a855f7"/><stop offset="100%25" stop-color="%23ec4899"/></linearGradient></defs><rect fill="%23f8f9fa" width="200" height="200"/><circle cx="70" cy="80" r="40" fill="%236366f1" opacity="0.6"/><circle cx="130" cy="90" r="35" fill="%23ec4899" opacity="0.5"/><circle cx="100" cy="130" r="30" fill="%23a855f7" opacity="0.5"/><circle cx="100" cy="95" r="15" fill="white" opacity="0.8"/></svg>`,

    anime: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%231a1a2e" width="200" height="200" rx="8"/><circle cx="100" cy="85" r="40" fill="%23e2e8f0"/><circle cx="88" cy="78" r="8" fill="%231a1a2e"/><circle cx="112" cy="78" r="8" fill="%231a1a2e"/><circle cx="90" cy="76" r="3" fill="white"/><circle cx="114" cy="76" r="3" fill="white"/><path d="M92 95 Q100 102 108 95" fill="none" stroke="%23ff6b9d" stroke-width="2" stroke-linecap="round"/><path d="M65 60 L80 75 L60 80 Z" fill="%23e2e8f0"/><path d="M135 60 L120 75 L140 80 Z" fill="%23e2e8f0"/><text x="100" y="155" font-family="Arial" font-size="12" fill="%23ff6b00" text-anchor="middle" font-weight="bold">KAWAII ★</text></svg>`,

    ai3d: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="d3a" cx="35%25" cy="25%25" r="70%25"><stop offset="0%25" stop-color="%23ffffff"/><stop offset="45%25" stop-color="%23ff9f43"/><stop offset="100%25" stop-color="%23d35400"/></radialGradient><filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="%23000" flood-opacity="0.25"/></filter></defs><rect fill="%23f8fafc" width="200" height="200"/><circle cx="100" cy="92" r="54" fill="url(%23d3a)" filter="url(%23shadow)"/><circle cx="82" cy="78" r="9" fill="%230f172a"/><circle cx="118" cy="78" r="9" fill="%230f172a"/><ellipse cx="100" cy="105" rx="27" ry="18" fill="%23fff7ed"/><path d="M84 112 Q100 124 116 112" fill="none" stroke="%230f172a" stroke-width="4" stroke-linecap="round"/><path d="M64 55 L83 29 L92 65 Z" fill="%23ffb56b"/><path d="M136 55 L117 29 L108 65 Z" fill="%23ffb56b"/><circle cx="76" cy="70" r="11" fill="%23ffffff" opacity="0.28"/></svg>`,

    watercolor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%23fefefe" width="200" height="200"/><ellipse cx="80" cy="90" rx="50" ry="40" fill="%2393c5fd" opacity="0.4"/><ellipse cx="120" cy="100" rx="45" ry="35" fill="%23f9a8d4" opacity="0.4"/><ellipse cx="100" cy="120" rx="40" ry="30" fill="%2386efac" opacity="0.3"/><ellipse cx="90" cy="75" rx="25" ry="20" fill="%23fcd34d" opacity="0.3"/><circle cx="100" cy="95" r="5" fill="%23334155" opacity="0.6"/></svg>`,

    geometric: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%230f172a" width="200" height="200"/><polygon points="100,30 160,100 100,170 40,100" fill="none" stroke="%23ff6b00" stroke-width="2"/><polygon points="100,50 145,100 100,150 55,100" fill="none" stroke="%2338bdf8" stroke-width="1.5"/><polygon points="100,70 130,100 100,130 70,100" fill="%23ff6b00" opacity="0.3"/><circle cx="100" cy="100" r="10" fill="%2338bdf8"/></svg>`,

    typography: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%23ffffff" width="200" height="200"/><text x="100" y="70" font-family="Georgia" font-size="48" fill="%230f172a" text-anchor="middle" font-weight="900">B</text><text x="100" y="110" font-family="Arial" font-size="14" fill="%23ff6b00" text-anchor="middle" font-weight="bold" letter-spacing="8">BLANKUP</text><line x1="40" y1="120" x2="160" y2="120" stroke="%23ff6b00" stroke-width="2"/><text x="100" y="145" font-family="Arial" font-size="9" fill="%2364748b" text-anchor="middle" letter-spacing="4">NOT JUST A SHIRT</text></svg>`,
  };

  const svgTemplate = designs[style] || designs.abstract;
  const designUrl = `data:image/svg+xml;charset=utf-8,${svgTemplate}`;

  const authorName = auth.isLoggedIn() ? (auth.user.fullName || auth.user.username) : 'Guest';

  return {
    success: true,
    designId: 'mock-' + Date.now(),
    designUrl,
    prompt,
    style,
    author: authorName,
  };
}

/* ============================================================
   ORDER FLOW
   ============================================================ */
function initOrderFlow() {
  const orderBtn = document.getElementById('orderBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const modal = document.getElementById('orderModal');
  const modalClose = document.getElementById('modalClose');
  const orderForm = document.getElementById('orderForm');
  const orderCloseBtn = document.getElementById('orderCloseBtn');

  // Open order modal
  if (orderBtn) {
    orderBtn.addEventListener('click', () => {
      if (!state.currentDesign) return;
      updateOrderSummary();
      
      // Pre-fill user's name if logged in
      if (auth.isLoggedIn()) {
        const orderNameInput = document.getElementById('orderName');
        if (orderNameInput && !orderNameInput.value) {
          orderNameInput.value = auth.user.fullName || auth.user.username;
        }
      }
      
      modal.classList.add('open');
    });
  }

  // Close modal
  if (modalClose) {
    modalClose.addEventListener('click', () => modal.classList.remove('open'));
  }
  if (orderCloseBtn) {
    orderCloseBtn.addEventListener('click', () => {
      modal.classList.remove('open');
      resetOrderModal();
    });
  }

  // Close on overlay click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }

  // Submit order
  if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitOrder();
    });
  }

  // Download design
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (state.currentDesign?.designUrl) {
        downloadDesign(state.currentDesign.designUrl);
      }
    });
  }
}

function updateOrderSummary() {
  const isVi = i18n.currentLang === 'vi';
  const basePrice = 250000;
  const total = basePrice * state.quantity;

  const colorNames = {
    '#ffffff': isVi ? 'Trắng' : 'White',
    '#000000': isVi ? 'Đen' : 'Black',
    '#1e293b': 'Navy',
    '#6b7280': isVi ? 'Xám' : 'Gray',
    '#dc2626': isVi ? 'Đỏ' : 'Red',
    '#2563eb': isVi ? 'Xanh dương' : 'Blue',
  };

  document.getElementById('orderProduct').textContent = 'T-Shirt Custom AI';
  document.getElementById('orderColor').textContent = colorNames[state.selectedColor] || state.selectedColor;
  document.getElementById('orderSize').textContent = state.selectedSize;
  document.getElementById('orderQty').textContent = state.quantity;

  if (isVi) {
    document.getElementById('orderTotal').textContent = total.toLocaleString('vi-VN') + 'đ';
  } else {
    document.getElementById('orderTotal').textContent = '$' + (total / 25000).toFixed(0);
  }
}

async function submitOrder() {
  const submitBtn = document.getElementById('orderSubmitBtn');
  const name = document.getElementById('orderName').value.trim();
  const phone = document.getElementById('orderPhone').value.trim();
  const address = document.getElementById('orderAddress').value.trim();
  const note = document.getElementById('orderNote').value.trim();

  if (!name || !phone || !address) {
    alert(i18n.currentLang === 'vi' ? 'Vui lòng điền đầy đủ thông tin!' : 'Please fill in all required fields!');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span>${i18n.t('order.submitting')}</span>`;

  const orderData = {
    designUrl: state.currentDesign?.designUrl || '',
    productType: 'tshirt',
    color: state.selectedColor,
    size: state.selectedSize,
    quantity: state.quantity,
    customer: { name, phone, address, note },
    payment: 'COD',
    userId: auth.isLoggedIn() ? auth.user.id : null,
    authorName: auth.isLoggedIn() ? (auth.user.fullName || auth.user.username) : 'Guest',
  };

  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: auth.getAuthHeaders(),
      body: JSON.stringify(orderData),
    });

    const data = await response.json();
    showOrderSuccess(data.orderId || 'BU-' + Date.now());
  } catch (err) {
    // Show success for demo
    showOrderSuccess('BU-' + Date.now().toString(36).toUpperCase());
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = `<span data-i18n="order.submit">${i18n.t('order.submit')}</span>`;
}

function showOrderSuccess(orderId) {
  const formContent = document.getElementById('orderFormContent');
  const successContent = document.getElementById('orderSuccess');
  const orderIdEl = document.getElementById('orderSuccessId');

  if (formContent) formContent.style.display = 'none';
  if (successContent) successContent.classList.add('show');
  if (orderIdEl) orderIdEl.textContent = `${i18n.t('order.success.desc')}${orderId}`;
}

function resetOrderModal() {
  const formContent = document.getElementById('orderFormContent');
  const successContent = document.getElementById('orderSuccess');
  const orderForm = document.getElementById('orderForm');

  if (formContent) formContent.style.display = 'block';
  if (successContent) successContent.classList.remove('show');
  if (orderForm) orderForm.reset();
}

async function downloadDesign(url) {
  const link = document.createElement('a');

  if (url.startsWith('data:')) {
    link.href = url;
    link.download = `blankup-design-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const objectUrl = URL.createObjectURL(blob);

    link.href = objectUrl;
    link.download = `blankup-design-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    window.open(url, '_blank');
  }
}

/* ============================================================
   COMMUNITY GALLERY
   ============================================================ */
async function loadCommunityDesigns() {
  const grid = document.getElementById('communityGrid');
  if (!grid) return;

  let designs;
  try {
    const response = await fetch(`${API_BASE}/ai-design/gallery`);
    if (!response.ok) throw new Error('Failed');
    const result = await response.json();
    designs = result.data || [];
  } catch (err) {
    designs = getFallbackDesigns();
  }

  const isVi = i18n.currentLang === 'vi';

  grid.innerHTML = designs.map(design => {
    const prompt = isVi ? design.prompt : (design.promptEn || design.prompt);
    const previewUrl = design.designUrl || generateMockDesign(design.style, prompt).designUrl;
    const productMockupUrl = design.productMockupUrl || '';
    const productMockupBlank = Boolean(design.productMockupBlank);
    const author = design.author || 'Anonymous';

    return `
      <div class="community-card" style="cursor: pointer;" title="${isVi ? 'Nhấp để thử thiết kế này' : 'Click to try this design'}"
        data-design-url="${escapeAttr(previewUrl)}"
        data-product-mockup-url="${escapeAttr(productMockupUrl)}"
        data-product-mockup-blank="${productMockupBlank ? 'true' : 'false'}"
        data-prompt="${escapeAttr(prompt)}"
        data-style="${escapeAttr(design.style)}"
        data-author="${escapeAttr(author)}">
        <div class="community-card-image">
          <img src="${previewUrl}" alt="${escapeAttr(prompt)}">
        </div>
        <div class="community-card-info">
          <div class="community-card-prompt">"${escapeHtml(prompt)}"</div>
          <div class="community-card-meta">
            <span class="community-card-author">👤 ${escapeHtml(author)}</span>
            <span class="community-card-likes">❤️ ${design.likes || 0}</span>
          </div>
          <span class="community-card-style">${escapeHtml(i18n.t('style.' + design.style) || design.style)}</span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.community-card').forEach(card => {
    card.addEventListener('click', () => {
      loadCommunityDesign(card.dataset.designUrl, card.dataset.prompt, card.dataset.style, card.dataset.author, card.dataset.productMockupUrl, card.dataset.productMockupBlank === 'true');
    });
  });
}

// Function to load community design into workspace
window.loadCommunityDesign = function(url, prompt, style, author, productMockupUrl = '', productMockupBlank = false) {
  state.currentDesign = {
    success: true,
    designId: 'community-' + Date.now(),
    designUrl: url,
    prompt: prompt,
    style: style,
    author: author,
    productMockupUrl,
    productMockupBlank,
  };
  
  showDesignOnMockup(url, productMockupUrl, productMockupBlank);

  // Set prompt textarea value
  const promptInput = document.getElementById('promptInput');
  if (promptInput) promptInput.value = prompt;

  // Set style option active state
  const styleBtn = document.querySelector(`.style-option[data-style="${style}"]`);
  if (styleBtn) {
    document.querySelectorAll('.style-option').forEach(b => b.classList.remove('active'));
    styleBtn.classList.add('active');
    state.selectedStyle = style;
  }
};

i18n.onChange(() => {
  loadCommunityDesigns();
});

function getFallbackDesigns() {
  return [
    { id: 'd1', prompt: 'Rồng Việt Nam cyberpunk', promptEn: 'Vietnamese dragon cyberpunk', style: 'streetwear', author: 'Minh T.', likes: 234 },
    { id: 'd2', prompt: 'Hoa sen minimalist', promptEn: 'Minimalist lotus flower', style: 'minimalist', author: 'An N.', likes: 189 },
    { id: 'd3', prompt: 'Phong cảnh Hội An vintage', promptEn: 'Hoi An landscape vintage', style: 'vintage', author: 'Hương L.', likes: 156 },
    { id: 'd4', prompt: 'Samurai Nhật Bản anime', promptEn: 'Japanese samurai anime', style: 'anime', author: 'Khoa P.', likes: 312 },
    { id: 'd5', prompt: 'Geometric abstract neon', promptEn: 'Geometric abstract neon', style: 'geometric', author: 'Trang V.', likes: 198 },
    { id: 'd6', prompt: 'Typography nghệ thuật', promptEn: 'Artistic typography', style: 'typography', author: 'Đức M.', likes: 145 },
  ];
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

/* ============================================================
   COLOR UTILITIES
   ============================================================ */
function isLightColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
