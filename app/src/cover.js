/**
 * Vice Cover Studio — cover engine.
 *
 * Draws a multi-panel GTA-style poster cover onto a canvas: photo panels in a
 * layout, a gradient-map colour grade per panel, seeded film grain, a
 * vignette, and an outlined caption on a dark band. Pure canvas 2D, no
 * network, no third-party code. Rendering is deterministic: the same state
 * always paints the same pixels (the grain uses a fixed-seed generator).
 */

// A grade is a ramp of (luminance 0..1, colour) stops plus a blend strength:
// the grade colour replaces the photo's colour only in part, so the photo
// keeps its identity while taking the grade's cast.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    strength: 0.62,
    ramp: [[0, '#2a1048'], [0.35, '#a8326e'], [0.65, '#ff7a3c'], [1, '#ffd76a']],
    accent: '#ffb347',
  },
  neon: {
    label: 'Neon',
    strength: 0.66,
    ramp: [[0, '#0a0618'], [0.35, '#4a1d8f'], [0.65, '#ff2e88'], [1, '#5ff2e0']],
    accent: '#ff2e88',
  },
  vice: {
    label: 'Vice',
    strength: 0.6,
    ramp: [[0, '#062a33'], [0.35, '#0e7a7a'], [0.65, '#ff5e9c'], [1, '#ffe3f0']],
    accent: '#5ff2e0',
  },
  noir: {
    label: 'Noir',
    strength: 0.85,
    ramp: [[0, '#000000'], [0.35, '#1c1c22'], [0.7, '#6a6a72'], [1, '#f2f2f2']],
    accent: '#e8e8e8',
  },
  golden: {
    label: 'Golden Hour',
    strength: 0.58,
    ramp: [[0, '#241408'], [0.35, '#8a4a1d'], [0.65, '#f08a2e'], [1, '#ffe9b0']],
    accent: '#ffcf5e',
  },
};

// Layouts as fractional rects [x, y, w, h] that tile the cover. A gutter is
// cut between them at render time by insetting every rect.
export const LAYOUTS = {
  hero: {
    label: 'Hero',
    rects: [[0, 0, 0.64, 1], [0.64, 0, 0.36, 0.5], [0.64, 0.5, 0.36, 0.5]],
  },
  grid: {
    label: 'Grid 2x2',
    rects: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
  },
  strip: {
    label: 'Strip',
    rects: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]],
  },
  full: {
    label: 'Full-bleed',
    rects: [[0, 0, 1, 1]],
  },
};

export const EXPORT_SIZES = {
  square: { label: 'Square 1080 x 1080', width: 1080, height: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', width: 1080, height: 1350 },
  wide: { label: 'Wide 1920 x 1080', width: 1920, height: 1080 },
};

const FRAME_COLOUR = '#f5efe4'; // warm off-white poster frame
const GRAIN_SEED = 20261119;

/** Fixed-seed PRNG (mulberry32) so the grain is identical on every render. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Build a 256-entry luminance -> grade colour lookup table for a grade. */
function buildLut(grade) {
  const stops = grade.ramp.map(([at, hex]) => [at, hexToRgb(hex)]);
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let k = 0; k < stops.length - 1; k++) {
      if (t >= stops[k][0] && t <= stops[k + 1][0]) {
        a = stops[k];
        b = stops[k + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let c = 0; c < 3; c++) {
      lut[i * 3 + c] = Math.round(a[1][c] + (b[1][c] - a[1][c]) * f);
    }
  }
  return lut;
}

/** Panel rects in pixels for a layout, with the gutter cut between panels. */
export function layoutPanels(layoutName, width, height) {
  const layout = LAYOUTS[layoutName] || LAYOUTS.hero;
  const g = Math.max(4, Math.round(0.008 * Math.min(width, height)));
  return layout.rects.map(([fx, fy, fw, fh]) => {
    const x = Math.round(fx * width + g / 2);
    const y = Math.round(fy * height + g / 2);
    const w = Math.max(1, Math.round((fx + fw) * width - g / 2) - x);
    const h = Math.max(1, Math.round((fy + fh) * height - g / 2) - y);
    return { x, y, width: w, height: h };
  });
}

/**
 * Draw one photo into a panel rect, cover-fitting it with the panel's zoom
 * and pan, then grade it with the grade's lookup table.
 */
function drawPanel(ctx, panel, photo, grade, lut, scratch) {
  const { x, y, width, height } = panel;
  scratch.width = width;
  scratch.height = height;
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  const img = photo.img;
  const base = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const scale = base * (photo.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  // panX / panY are fractions of the panel's width / height.
  const dx = x + (width - dw) / 2 + (photo.panX || 0) * width;
  const dy = y + (height - dh) / 2 + (photo.panY || 0) * height;
  // Paint the photo onto the scratch canvas in panel-local coordinates.
  sctx.clearRect(0, 0, width, height);
  sctx.drawImage(img, dx - x, dy - y, dw, dh);
  // Grade: mix each pixel toward its ramp colour by the grade's strength.
  const data = sctx.getImageData(0, 0, width, height);
  const px = data.data;
  const s = grade.strength;
  for (let i = 0; i < px.length; i += 4) {
    const lum = Math.round(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
    const li = lum * 3;
    px[i] = px[i] * (1 - s) + lut[li] * s;
    px[i + 1] = px[i + 1] * (1 - s) + lut[li + 1] * s;
    px[i + 2] = px[i + 2] * (1 - s) + lut[li + 2] * s;
  }
  sctx.putImageData(data, 0, 0);
  ctx.drawImage(scratch, x, y);
}

/** Seeded film grain over the whole cover, drawn from one fixed noise tile. */
function drawGrain(ctx, width, height) {
  const tile = 128;
  const noise = document.createElement('canvas');
  noise.width = tile;
  noise.height = tile;
  const nctx = noise.getContext('2d');
  const img = nctx.createImageData(tile, tile);
  const rand = mulberry32(GRAIN_SEED);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 256);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(noise, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** A soft dark vignette around the cover's edges. */
function drawVignette(ctx, width, height) {
  const r = Math.hypot(width, height) / 2;
  const grad = ctx.createRadialGradient(
    width / 2, height / 2, r * 0.45,
    width / 2, height / 2, r,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

/** The outlined caption on its dark band, top or bottom of the cover. */
function drawCaption(ctx, width, height, state, grade) {
  const title = (state.title || '').trim();
  const subtitle = (state.subtitle || '').trim();
  if (!title && !subtitle) return;
  const unit = Math.min(width, height);
  const bandH = Math.round(unit * 0.17 * (state.titleSize || 1));
  const bandY = state.captionPos === 'top' ? 0 : height - bandH;
  ctx.fillStyle = 'rgba(10,6,18,0.84)';
  ctx.fillRect(0, bandY, width, bandH);
  // A thin accent rule at the band's inner edge.
  ctx.fillStyle = grade.accent;
  if (state.captionPos === 'top') ctx.fillRect(0, bandY + bandH, width, 4);
  else ctx.fillRect(0, bandY - 4, width, 4);
  const cx = width / 2;
  let textY = bandY + bandH / 2;
  const titleSize = Math.round(unit * 0.105 * (state.titleSize || 1));
  const subSize = Math.round(unit * 0.032);
  if (title && subtitle) textY -= Math.round(subSize * 0.9);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (title) {
    const font = `"${state.font || 'Anton'}", sans-serif`;
    ctx.font = `${titleSize}px ${font}`;
    try { ctx.letterSpacing = `${Math.round(titleSize * 0.05)}px`; } catch (_) { /* older canvas */ }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = Math.max(2, Math.round(titleSize * 0.09));
    ctx.strokeText(title.toUpperCase(), cx, textY);
    ctx.fillStyle = state.color || '#ffffff';
    ctx.fillText(title.toUpperCase(), cx, textY);
    textY += Math.round(titleSize * 0.62 + subSize * 0.9);
  }
  if (subtitle) {
    const font = `"${state.font || 'Anton'}", sans-serif`;
    ctx.font = `${subSize}px ${font}`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.22)}px`; } catch (_) { /* older canvas */ }
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(subtitle.toUpperCase(), cx, textY);
  }
  try { ctx.letterSpacing = '0px'; } catch (_) { /* older canvas */ }
}

/**
 * Render the whole cover onto `canvas` at `width` x `height` pixels.
 * state: { layout, grade, title, subtitle, font, color, titleSize,
 *   captionPos, panels: [{ img, zoom, panX, panY }, ...] }.
 * Panels beyond the layout's count are ignored; missing panels stay dark.
 */
export function renderCover(canvas, width, height, state) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  const lut = buildLut(grade);
  // Warm poster frame behind the gutters.
  ctx.fillStyle = FRAME_COLOUR;
  ctx.fillRect(0, 0, width, height);
  const panels = layoutPanels(state.layout || 'hero', width, height);
  const scratch = document.createElement('canvas');
  panels.forEach((panel, i) => {
    const photo = (state.panels || [])[i];
    if (photo && photo.img && photo.img.complete && photo.img.naturalWidth > 0) {
      drawPanel(ctx, panel, photo, grade, lut, scratch);
    } else {
      ctx.fillStyle = '#1a1024';
      ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    }
  });
  drawGrain(ctx, width, height);
  drawVignette(ctx, width, height);
  drawCaption(ctx, width, height, state, grade);
}
