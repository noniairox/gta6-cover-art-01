/**
 * Vice Cover Studio — editor UI.
 *
 * Wires the controls to the cover engine (src/cover.js): layout and grade
 * chips, caption editing, photo upload and sample photos, per-panel crop and
 * position (click to select, drag to pan, scroll to zoom), and PNG export at
 * the three post sizes. Everything runs offline; photos never leave the
 * machine.
 */
import { GRADES, LAYOUTS, EXPORT_SIZES, layoutPanels, renderCover } from './cover.js';

const SAMPLES = [
  { name: 'Sunset Boulevard', src: 'samples/beach.jpg' },
  { name: 'Neon Street', src: 'samples/neon.jpg' },
  { name: 'Rooftop Dusk', src: 'samples/rooftop.jpg' },
];

const FONTS = ['Anton', 'Bebas Neue', 'Pacifico'];
const COLOURS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Gold', value: '#ffd76a' },
  { name: 'Hot pink', value: '#ff5e9c' },
  { name: 'Cyan', value: '#5ff2e0' },
];

const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'VICE CITY',
  subtitle: 'Neon nights · Ocean Drive',
  font: 'Anton',
  color: '#ffffff',
  titleSize: 1,
  captionPos: 'bottom',
  size: 'square',
  photos: [], // { img, name, src }
  panels: [], // { photo: index into photos, zoom, panX, panY } (pan in panel fractions)
  selected: 0,
};

const $ = (sel) => document.querySelector(sel);
const preview = $('#preview');
const statusEl = $('#status');
let renderTimer = 0;

function panelCount() {
  return (LAYOUTS[state.layout] || LAYOUTS.hero).rects.length;
}

/** Keep the panels array the layout's length, preserving existing panels. */
function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) {
    const i = state.panels.length;
    state.panels.push({ photo: state.photos.length ? i % state.photos.length : -1, zoom: 1, panX: 0, panY: 0 });
  }
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

/** The state the engine needs, with photos resolved to images. */
function renderState() {
  return {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    font: state.font,
    color: state.color,
    titleSize: state.titleSize,
    captionPos: state.captionPos,
    panels: state.panels.map((p) => {
      const photo = state.photos[p.photo];
      return photo ? { img: photo.img, zoom: p.zoom, panX: p.panX, panY: p.panY } : null;
    }),
  };
}

/** Preview resolution for the chosen export size (long side ~640 px). */
function previewSize() {
  const size = EXPORT_SIZES[state.size];
  const long = 640;
  if (size.width >= size.height) return { width: long, height: Math.round(long * size.height / size.width) };
  return { width: Math.round(long * size.width / size.height), height: long };
}

function render() {
  ensurePanels();
  const { width, height } = previewSize();
  renderCover(preview, width, height, renderState());
  updateStatus();
  markActive();
}

function renderSoon() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 40);
}

function updateStatus() {
  const panel = state.panels[state.selected];
  const photo = panel && state.photos[panel.photo];
  const parts = [
    `Panel ${state.selected + 1} of ${panelCount()}`,
    photo ? `photo "${photo.name}"` : 'no photo',
    panel ? `zoom ${panel.zoom.toFixed(2)}x` : '',
  ].filter(Boolean);
  statusEl.textContent = parts.join(' · ');
}

/** Mark the active chip in every control group. */
function markActive() {
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-font]').forEach((b) => b.classList.toggle('active', b.dataset.font === state.font));
  document.querySelectorAll('[data-color]').forEach((b) => b.classList.toggle('active', b.dataset.color === state.color));
  document.querySelectorAll('[data-pos]').forEach((b) => b.classList.toggle('active', b.dataset.pos === state.captionPos));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  document.querySelectorAll('#photoStrip .thumb').forEach((t, i) => {
    t.classList.toggle('assigned', state.panels[state.selected] && state.panels[state.selected].photo === i);
  });
}

/** Rebuild the photo strip thumbnails. */
function buildPhotoStrip() {
  const strip = $('#photoStrip');
  strip.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = `Place "${photo.name}" in the selected panel`;
    btn.setAttribute('aria-label', `Place ${photo.name} in the selected panel`);
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name;
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      ensurePanels();
      state.panels[state.selected].photo = i;
      state.panels[state.selected].zoom = 1;
      state.panels[state.selected].panX = 0;
      state.panels[state.selected].panY = 0;
      render();
    });
    strip.appendChild(btn);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  for (const sample of SAMPLES) {
    try {
      const img = await loadImage(sample.src);
      state.photos.push({ img, name: sample.name, src: sample.src });
    } catch (err) {
      statusEl.textContent = `Could not load sample ${sample.name}.`;
    }
  }
  buildPhotoStrip();
}

/** Export the cover at the real pixel size and download it as a PNG. */
function exportPng(sizeName) {
  const size = EXPORT_SIZES[sizeName];
  const canvas = document.createElement('canvas');
  renderCover(canvas, size.width, size.height, renderState());
  canvas.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.width}x${size.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Exported PNG ${size.width} x ${size.height}.`;
  }, 'image/png');
}

/** The same export as a data URL, for automated checks of the cover pixels. */
function exportDataUrl(sizeName) {
  const size = EXPORT_SIZES[sizeName];
  const canvas = document.createElement('canvas');
  renderCover(canvas, size.width, size.height, renderState());
  return canvas.toDataURL('image/png');
}

// Test handle: the same state and export path the buttons use.
window.__vice = { state, exportDataUrl, render };

function bindControls() {
  document.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    render();
  }));
  document.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    render();
  }));
  document.querySelectorAll('[data-font]').forEach((b) => b.addEventListener('click', () => {
    state.font = b.dataset.font;
    render();
  }));
  document.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
    state.color = b.dataset.color;
    render();
  }));
  document.querySelectorAll('[data-pos]').forEach((b) => b.addEventListener('click', () => {
    state.captionPos = b.dataset.pos;
    render();
  }));
  document.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
    state.size = b.dataset.size;
    render();
  }));
  document.querySelectorAll('[data-export]').forEach((b) => b.addEventListener('click', () => {
    exportPng(b.dataset.export);
  }));
  $('#titleInput').addEventListener('input', (e) => { state.title = e.target.value; renderSoon(); });
  $('#subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; renderSoon(); });
  $('#sizeRange').addEventListener('input', (e) => {
    state.titleSize = Number(e.target.value);
    $('#sizeValue').textContent = `${Math.round(state.titleSize * 100)}%`;
    renderSoon();
  });
  $('#zoomRange').addEventListener('input', (e) => {
    ensurePanels();
    state.panels[state.selected].zoom = Number(e.target.value);
    $('#zoomValue').textContent = `${Number(e.target.value).toFixed(2)}x`;
    renderSoon();
  });
  $('#resetPanel').addEventListener('click', () => {
    ensurePanels();
    const p = state.panels[state.selected];
    p.zoom = 1;
    p.panX = 0;
    p.panY = 0;
    $('#zoomRange').value = '1';
    $('#zoomValue').textContent = '1.00x';
    render();
  });
  $('#uploadInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      try {
        const img = await loadImage(dataUrl);
        state.photos.push({ img, name: file.name, src: dataUrl });
      } catch (_) { /* unreadable file: skip it */ }
    }
    buildPhotoStrip();
    if (files.length) {
      ensurePanels();
      state.panels[state.selected].photo = state.photos.length - 1;
    }
    e.target.value = '';
    render();
  });
  bindCanvas();
}

/** Click to select a panel, drag to pan its photo, scroll to zoom it. */
function bindCanvas() {
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;

  function canvasPoint(e) {
    const rect = preview.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (preview.width / rect.width),
      y: (e.clientY - rect.top) * (preview.height / rect.height),
    };
  }

  preview.addEventListener('pointerdown', (e) => {
    const p = canvasPoint(e);
    const panels = layoutPanels(state.layout, preview.width, preview.height);
    const hit = panels.findIndex((r) => p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height);
    if (hit >= 0) {
      state.selected = hit;
      ensurePanels();
      const zoom = state.panels[state.selected].zoom;
      $('#zoomRange').value = String(zoom);
      $('#zoomValue').textContent = `${zoom.toFixed(2)}x`;
      render();
    }
    dragging = true;
    moved = false;
    lastX = p.x;
    lastY = p.y;
    preview.setPointerCapture(e.pointerId);
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = canvasPoint(e);
    const dx = p.x - lastX;
    const dy = p.y - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 0) moved = true;
    lastX = p.x;
    lastY = p.y;
    if (!moved) return;
    ensurePanels();
    const panel = state.panels[state.selected];
    const rects = layoutPanels(state.layout, preview.width, preview.height);
    const rect = rects[state.selected];
    panel.panX = Math.max(-0.6, Math.min(0.6, panel.panX + dx / rect.width));
    panel.panY = Math.max(-0.6, Math.min(0.6, panel.panY + dy / rect.height));
    renderSoon();
  });
  const endDrag = () => { dragging = false; };
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    ensurePanels();
    const panel = state.panels[state.selected];
    panel.zoom = Math.max(1, Math.min(4, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
    $('#zoomRange').value = String(panel.zoom);
    $('#zoomValue').textContent = `${panel.zoom.toFixed(2)}x`;
    renderSoon();
  }, { passive: false });
}

async function start() {
  bindControls();
  statusEl.textContent = 'Loading fonts and sample photos…';
  try {
    await Promise.all(FONTS.map((f) => document.fonts.load(`16px "${f}"`)));
  } catch (_) { /* a missing font falls back to sans-serif */ }
  await loadSamples();
  render();
}

start();
