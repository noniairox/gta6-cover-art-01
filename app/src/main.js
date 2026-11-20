// Vice Cover Studio — editor UI wiring (vanilla JS, no libraries).
// Loads photos, lets the user pick layout / grade / caption, pan + zoom each
// panel, and export the cover as a PNG in the common post sizes.

import { LAYOUTS, GRADES, EXPORT_SIZES, layoutPanels, renderCover, loadCoverFonts } from './cover.js';
import { applyShotMode } from './shots.js';

const $ = (sel) => document.querySelector(sel);

const state = {
  layout: 'hero',
  grade: 'sunset',
  caption: { title: 'VICE CITY', subtitle: 'Neon Shore', tag: 'GTA VI' },
  photos: [null, null, null, null],
  views: {},
  size: 'wide',
  selectedPanel: 0,
  seed: 20261121,
};

const SAMPLES = [
  { name: 'Beach', src: 'samples/beach.jpg' },
  { name: 'Rooftop', src: 'samples/rooftop.jpg' },
  { name: 'Neon Street', src: 'samples/neon.jpg' },
];

let fontsReady = false;
let lastPanels = [];
let drag = null;

function sizeDef() {
  return EXPORT_SIZES.find((s) => s.id === state.size) || EXPORT_SIZES[0];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${src}`));
    img.src = src;
  });
}

async function ensureFonts() {
  if (!fontsReady) {
    await loadCoverFonts();
    fontsReady = true;
  }
}

function currentPhotos() {
  // Panels read photos by index; empty slots fall back to the first photo.
  return state.photos;
}

async function render() {
  const canvas = $('#stage');
  const def = sizeDef();
  canvas.width = def.w;
  canvas.height = def.h;
  await ensureFonts();
  const ctx = canvas.getContext('2d');
  renderCover(ctx, def.w, def.h, {
    layout: state.layout,
    grade: state.grade,
    caption: state.caption,
    photos: currentPhotos(),
    views: state.views,
    seed: state.seed,
  });
  const { panels } = layoutPanels(state.layout, def.w, def.h);
  lastPanels = panels;
  const status = $('#status');
  if (status) {
    const loaded = state.photos.filter(Boolean).length;
    status.textContent = `${state.layout} · ${GRADES[state.grade].name} · ${def.label} · ${loaded} photo${loaded === 1 ? '' : 's'} loaded`;
  }
}

function panelAt(px, py) {
  const canvas = $('#stage');
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const x = (px - rect.left) * sx;
  const y = (py - rect.top) * sy;
  for (let i = lastPanels.length - 1; i >= 0; i--) {
    const p = lastPanels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

function selectPanel(i) {
  state.selectedPanel = i;
  document.querySelectorAll('.panel-pick').forEach((b) => {
    b.classList.toggle('on', Number(b.dataset.panel) === i);
  });
  const view = state.views[i] || { zoom: 1, ox: 0, oy: 0 };
  const zoom = $('#zoom');
  if (zoom) zoom.value = view.zoom;
}

function setView(i, patch) {
  state.views[i] = { zoom: 1, ox: 0, oy: 0, ...(state.views[i] || {}), ...patch };
}

async function assignPhoto(slot, img, name) {
  state.photos[slot] = img;
  const tray = $('#tray');
  const el = tray.querySelector(`[data-slot="${slot}"]`);
  if (el) el.classList.add('filled');
  await render();
}

function buildTray() {
  const tray = $('#tray');
  tray.innerHTML = '';
  SAMPLES.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'thumb';
    b.dataset.slot = i;
    b.textContent = s.name;
    b.title = `Load the ${s.name} sample into the selected panel`;
    b.addEventListener('click', async () => {
      const img = await loadImage(s.src);
      await assignPhoto(state.selectedPanel, img, s.name);
    });
    tray.appendChild(b);
  });
  const up = document.createElement('label');
  up.className = 'thumb upload';
  up.textContent = '+ Your photo';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.hidden = true;
  input.addEventListener('change', async () => {
    for (const file of input.files) {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      await assignPhoto(state.selectedPanel, img, file.name);
    }
    input.value = '';
  });
  up.appendChild(input);
  tray.appendChild(up);
}

function buildButtons() {
  const layouts = $('#layouts');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.textContent = l[0].toUpperCase() + l.slice(1);
    b.dataset.layout = l;
    b.addEventListener('click', async () => {
      state.layout = l;
      layouts.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      await render();
    });
    layouts.appendChild(b);
  });
  layouts.querySelector('button').classList.add('on');

  const grades = $('#grades');
  Object.entries(GRADES).forEach(([id, g]) => {
    const b = document.createElement('button');
    b.textContent = g.name;
    b.dataset.grade = id;
    b.addEventListener('click', async () => {
      state.grade = id;
      grades.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      await render();
    });
    grades.appendChild(b);
  });
  grades.querySelector('button').classList.add('on');

  const sizes = $('#sizes');
  EXPORT_SIZES.forEach((s) => {
    const b = document.createElement('button');
    b.textContent = s.label;
    b.dataset.size = s.id;
    b.addEventListener('click', async () => {
      state.size = s.id;
      sizes.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      await render();
    });
    sizes.appendChild(b);
  });
  sizes.querySelector(`[data-size="${state.size}"]`).classList.add('on');

  const picks = $('#panels');
  [0, 1, 2, 3].forEach((i) => {
    const b = document.createElement('button');
    b.className = 'panel-pick';
    b.dataset.panel = i;
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => selectPanel(i));
    picks.appendChild(b);
  });
}

function bindInputs() {
  $('#title').addEventListener('input', (e) => { state.caption.title = e.target.value; render(); });
  $('#subtitle').addEventListener('input', (e) => { state.caption.subtitle = e.target.value; render(); });
  $('#tag').addEventListener('input', (e) => { state.caption.tag = e.target.value; render(); });
  $('#zoom').addEventListener('input', (e) => {
    setView(state.selectedPanel, { zoom: Number(e.target.value) });
    render();
  });
  $('#fit').addEventListener('click', async () => {
    setView(state.selectedPanel, { zoom: 1, ox: 0, oy: 0 });
    $('#zoom').value = 1;
    await render();
  });
  $('#export').addEventListener('click', async () => {
    const def = sizeDef();
    const off = document.createElement('canvas');
    off.width = def.w; off.height = def.h;
    await ensureFonts();
    renderCover(off.getContext('2d'), def.w, def.h, {
      layout: state.layout, grade: state.grade, caption: state.caption,
      photos: currentPhotos(), views: state.views, seed: state.seed,
    });
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${def.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  });
  const canvas = $('#stage');
  canvas.addEventListener('pointerdown', (e) => {
    const i = panelAt(e.clientX, e.clientY);
    if (i >= 0) {
      selectPanel(i);
      drag = { panel: i, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const view = state.views[drag.panel] || { zoom: 1, ox: 0, oy: 0 };
    const p = lastPanels[drag.panel];
    if (!p) return;
    const dx = (e.clientX - drag.x) / rect.width;
    const dy = (e.clientY - drag.y) / rect.height;
    setView(drag.panel, { ox: view.ox + (dx * canvas.width) / p.w, oy: view.oy + (dy * canvas.height) / p.h });
    drag.x = e.clientX; drag.y = e.clientY;
    render();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
}

function fitCoverCanvas() {
  const canvas = $('#stage');
  const scale = Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height);
  canvas.style.width = `${Math.round(canvas.width * scale)}px`;
  canvas.style.height = `${Math.round(canvas.height * scale)}px`;
}
window.addEventListener('resize', () => {
  if (document.body.classList.contains('shot-cover')) fitCoverCanvas();
});

async function init() {
  buildTray();
  buildButtons();
  bindInputs();
  selectPanel(0);
  // Default scene: the beach sample in the first panel.
  try {
    const img = await loadImage(SAMPLES[0].src);
    state.photos[0] = img;
  } catch (err) {
    // Samples are optional; the user can upload their own photo.
  }
  await applyShotMode(state, { loadImage, assignPhoto, render });
  // Keep the control highlights in sync with any shot-mode state changes.
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizes button').forEach((b) => b.classList.toggle('on', b.dataset.size === state.size));
  await render();
  if (document.body.classList.contains('shot-cover')) fitCoverCanvas();
}

init();
