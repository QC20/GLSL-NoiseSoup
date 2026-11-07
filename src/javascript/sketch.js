const artwork = document.getElementById('artwork');
const statusLine = document.getElementById('statusLine');
const seedReadout = document.getElementById('seedReadout');
const saveStatus = document.getElementById('saveStatus');
const pauseButton = document.getElementById('pauseButton');
const stirButton = document.getElementById('stirButton');
const notesPanel = document.getElementById('fieldNotes');
const notesToggle = document.getElementById('notesToggle');

const scene = new THREE.Scene();
const camera = new THREE.Camera();
camera.position.z = 1;

const uniforms = {
  u_resolution: { type: 'v2', value: new THREE.Vector2() },
  u_pointer: { type: 'v2', value: new THREE.Vector2(0.5, 0.5) },
  u_time: { type: 'f', value: 1.0 },
  u_pointerForce: { type: 'f', value: 0.0 },
  u_impulse: { type: 'f', value: 0.0 },
  u_palette: { type: 'f', value: 0.0 },
  u_seed: { type: 'f', value: 43758.0 }
};

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
artwork.appendChild(renderer.domElement);

let targetPointerForce = 0;
let pointerIsDown = false;
let pointerIsInside = false;
let stirMode = false;
let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastFrameTime = null;
let animationFrame = null;
let saveMessageTimeout = null;

document.querySelectorAll('button').forEach((button) => {
  button.disabled = true;
});

function resizeRenderer() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.u_resolution.value.set(renderer.domElement.width, renderer.domElement.height);
  renderStill();
}

function renderStill() {
  renderer.render(scene, camera);
}

function animate(timestamp) {
  if (paused) return;

  const delta = lastFrameTime === null ? 0 : Math.min((timestamp - lastFrameTime) / 1000, 0.05);
  lastFrameTime = timestamp;
  uniforms.u_time.value += delta * 3;
  uniforms.u_pointerForce.value += (targetPointerForce - uniforms.u_pointerForce.value) * (1 - Math.exp(-delta * 8));
  uniforms.u_impulse.value = Math.max(0, uniforms.u_impulse.value - delta * 1.8);

  renderStill();
  animationFrame = window.requestAnimationFrame(animate);
}

function startAnimation() {
  if (animationFrame !== null) return;
  lastFrameTime = null;
  animationFrame = window.requestAnimationFrame(animate);
}

function setPaused(nextPaused) {
  paused = nextPaused;
  document.getElementById('experience').classList.toggle('is-paused', paused);
  pauseButton.setAttribute('aria-pressed', String(paused));
  pauseButton.setAttribute('aria-label', paused ? 'Resume animation' : 'Pause animation');
  pauseButton.querySelector('span').textContent = paused ? 'Resume' : 'Pause';

  if (paused) {
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
    renderStill();
    statusLine.firstChild.textContent = 'FIELD PAUSED ';
  } else {
    statusLine.firstChild.textContent = 'FIELD ACTIVE ';
    startAnimation();
  }
}

function setStirMode(enabled) {
  stirMode = enabled;
  stirButton.setAttribute('aria-pressed', String(stirMode));
  stirButton.querySelector('.stir-label').textContent = stirMode ? 'Stir mode on' : 'Stir mode off';
  stirButton.querySelector('.button-icon').textContent = stirMode ? '✳' : '↗';
  targetPointerForce = pointerIsInside ? (stirMode ? 1 : 0.24) : 0;
}

function setPointer(event) {
  const bounds = renderer.domElement.getBoundingClientRect();
  uniforms.u_pointer.value.set(
    Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    Math.min(1, Math.max(0, 1 - (event.clientY - bounds.top) / bounds.height))
  );
}

function pulseAtPointer() {
  uniforms.u_impulse.value = 1;
  if (paused) renderStill();
}

function setPalette(button) {
  const palette = Number(button.dataset.palette);
  uniforms.u_palette.value = palette;

  document.querySelectorAll('.palette-button').forEach((option) => {
    const selected = option === button;
    option.classList.toggle('is-active', selected);
    option.setAttribute('aria-pressed', String(selected));
  });

  pulseAtPointer();
}

function recompose() {
  const seed = 100 + Math.floor(Math.random() * 9000);
  uniforms.u_seed.value = seed;
  seedReadout.textContent = String(Math.round(seed));
  pulseAtPointer();
}

function showSaveStatus(message) {
  saveStatus.textContent = message;
  window.clearTimeout(saveMessageTimeout);
  saveMessageTimeout = window.setTimeout(() => {
    saveStatus.textContent = '';
  }, 2600);
}

function saveFrame() {
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  const target = new THREE.WebGLRenderTarget(width, height);
  const pixels = new Uint8Array(width * height * 4);

  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  renderer.setRenderTarget(null);
  target.dispose();

  const imageCanvas = document.createElement('canvas');
  imageCanvas.width = width;
  imageCanvas.height = height;
  const context = imageCanvas.getContext('2d');
  const image = context.createImageData(width, height);

  for (let row = 0; row < height; row += 1) {
    const sourceStart = (height - row - 1) * width * 4;
    const targetStart = row * width * 4;
    image.data.set(pixels.subarray(sourceStart, sourceStart + width * 4), targetStart);
  }

  context.putImageData(image, 0, 0);
  imageCanvas.toBlob((blob) => {
    if (!blob) {
      showSaveStatus('Could not save this frame.');
      return;
    }

    const download = document.createElement('a');
    download.href = URL.createObjectURL(blob);
    download.download = `noise-soup-${Math.round(uniforms.u_seed.value)}.png`;
    download.click();
    window.setTimeout(() => URL.revokeObjectURL(download.href), 1000);
    showSaveStatus('Frame saved as PNG.');
  }, 'image/png');
}

function toggleNotes(open = notesPanel.hidden) {
  notesPanel.hidden = !open;
  notesToggle.setAttribute('aria-expanded', String(open));
  if (open) document.getElementById('notesClose').focus();
  else notesToggle.focus();
}

async function initialize() {
  const [vertexResponse, fragmentResponse] = await Promise.all([
    fetch('src/shaders/noise-soup.vert.glsl'),
    fetch('src/shaders/noise-soup.frag.glsl')
  ]);

  if (!vertexResponse.ok || !fragmentResponse.ok) {
    throw new Error('Shader source could not be loaded.');
  }

  const [vertexShader, fragmentShader] = await Promise.all([
    vertexResponse.text(),
    fragmentResponse.text()
  ]);

  const geometry = new THREE.PlaneBufferGeometry(2, 2);
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
  scene.add(new THREE.Mesh(geometry, material));

  resizeRenderer();
  document.querySelectorAll('button').forEach((button) => {
    button.disabled = false;
  });
  if (paused) setPaused(true);
  else {
    statusLine.firstChild.textContent = 'FIELD ACTIVE ';
    startAnimation();
  }
}

renderer.domElement.setAttribute('aria-hidden', 'true');
renderer.domElement.addEventListener('pointerenter', (event) => {
  pointerIsInside = true;
  setPointer(event);
  targetPointerForce = stirMode ? 1 : 0.24;
});
renderer.domElement.addEventListener('pointermove', (event) => {
  pointerIsInside = true;
  setPointer(event);
  if (!pointerIsDown) targetPointerForce = stirMode ? 1 : 0.24;
});
renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerIsDown = true;
  pointerIsInside = true;
  setPointer(event);
  targetPointerForce = 1;
  pulseAtPointer();
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointerup', () => {
  pointerIsDown = false;
  targetPointerForce = pointerIsInside ? (stirMode ? 1 : 0.24) : 0;
});
renderer.domElement.addEventListener('pointercancel', () => {
  pointerIsDown = false;
  targetPointerForce = 0;
});
renderer.domElement.addEventListener('pointerleave', () => {
  if (pointerIsDown) return;
  pointerIsInside = false;
  targetPointerForce = 0;
});

window.addEventListener('resize', resizeRenderer);
pauseButton.addEventListener('click', () => setPaused(!paused));
stirButton.addEventListener('click', () => setStirMode(!stirMode));
document.querySelectorAll('.palette-button').forEach((button) => {
  button.addEventListener('click', () => setPalette(button));
});
document.getElementById('reseedButton').addEventListener('click', recompose);
document.getElementById('saveButton').addEventListener('click', saveFrame);
notesToggle.addEventListener('click', () => toggleNotes());
document.getElementById('notesClose').addEventListener('click', () => toggleNotes(false));

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    const step = 0.035;
    uniforms.u_pointer.value.x += event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    uniforms.u_pointer.value.y += event.key === 'ArrowDown' ? -step : event.key === 'ArrowUp' ? step : 0;
    uniforms.u_pointer.value.x = Math.min(1, Math.max(0, uniforms.u_pointer.value.x));
    uniforms.u_pointer.value.y = Math.min(1, Math.max(0, uniforms.u_pointer.value.y));
    pointerIsInside = true;
    targetPointerForce = stirMode ? 1 : 0.45;
    uniforms.u_impulse.value = 0.35;
    if (paused) renderStill();
    return;
  }

  if (event.target instanceof Element
      && event.target.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;

  if (event.code === 'Space') {
    event.preventDefault();
    setPaused(!paused);
  } else if (event.key.toLowerCase() === 's') {
    setStirMode(!stirMode);
  } else if (event.key.toLowerCase() === 'r') {
    recompose();
  } else if (event.key === 'Escape' && !notesPanel.hidden) {
    toggleNotes(false);
  }
});

initialize().catch((error) => {
  console.error(error);
  statusLine.firstChild.textContent = 'FIELD UNAVAILABLE ';
  notesToggle.disabled = false;
  document.getElementById('experience').classList.add('has-error');
});
