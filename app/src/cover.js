// Vice Cover Studio — cover render engine (vanilla canvas, no libraries).
// Draws a GTA-style multi-panel poster from photos + caption, with a
// gradient-map grade, seeded grain and a vignette. All original work.

export const LAYOUTS = ['hero', 'grid', 'strip', 'full'];

export const GRADES = {
  sunset: { name: 'Sunset', wash: '#ff7a2a', washAlpha: 0.22, top: '#ff9a3c', bottom: '#c22a6e', strength: 0.55 },
  neon: { name: 'Neon', wash: '#ff2d95', washAlpha: 0.20, top: '#00e5ff', bottom: '#ff2d95', strength: 0.60 },
  vice: { name: 'Vice', wash: '#7b2fbe', washAlpha: 0.22, top: '#ff5e78', bottom: '#2a1a6e', strength: 0.55 },
  noir: { name: 'Noir', wash: '#8a93a6', washAlpha: 0.16, top: '#9aa3b2', bottom: '#11131a', strength: 0.70 },
  golden: { name: 'Golden Hour', wash: '#ffb347', washAlpha: 0.26, top: '#ffd76e', bottom: '#b3541e', strength: 0.50 },
};

export const EXPORT_SIZES = [
  { id: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
];

/** Deterministic PRNG (mulberry32) so the grain is stable per seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panels for a layout: rects as fractions of the cover, plus caption area. */
export function layoutPanels(layout, W, H) {
  const g = Math.round(W * 0.012); // white gutter
  switch (layout) {
    case 'hero':
      return {
        panels: [
          { x: g, y: g, w: W - 2 * g, h: Math.round(H * 0.60) },
          { x: g, y: Math.round(H * 0.60) + 2 * g, w: Math.round((W - 3 * g) * 0.55), h: H - Math.round(H * 0.60) - 3 * g },
          { x: g + Math.round((W - 3 * g) * 0.55) + g, y: Math.round(H * 0.60) + 2 * g, w: W - Math.round((W - 3 * g) * 0.55) - 3 * g, h: H - Math.round(H * 0.60) - 3 * g },
        ],
        caption: { x: g, y: Math.round(H * 0.60) + 2 * g, w: Math.round((W - 3 * g) * 0.55), h: H - Math.round(H * 0.60) - 3 * g, place: 'band' },
      };
    case 'grid':
      return {
        panels: [
          { x: g, y: g, w: Math.round((W - 3 * g) / 2), h: Math.round((H - 3 * g) * 0.42) },
          { x: g * 2 + Math.round((W - 3 * g) / 2), y: g, w: W - Math.round((W - 3 * g) / 2) - 3 * g, h: Math.round((H - 3 * g) * 0.42) },
          { x: g, y: g * 2 + Math.round((H - 3 * g) * 0.42), w: Math.round((W - 3 * g) / 2), h: H - Math.round((H - 3 * g) * 0.42) - 3 * g },
          { x: g * 2 + Math.round((W - 3 * g) / 2), y: g * 2 + Math.round((H - 3 * g) * 0.42), w: W - Math.round((W - 3 * g) / 2) - 3 * g, h: H - Math.round((H - 3 * g) * 0.42) - 3 * g },
        ],
        caption: { x: 0, y: H - Math.round(H * 0.16), w: W, h: Math.round(H * 0.16), place: 'overlay' },
      };
    case 'strip':
      return {
        panels: [0, 1, 2].map((i) => ({
          x: g + i * (Math.round((W - 4 * g) / 3) + g),
          y: g, w: Math.round((W - 4 * g) / 3),
          h: Math.round(H * 0.78),
        })),
        caption: { x: 0, y: Math.round(H * 0.78) + g, w: W, h: H - Math.round(H * 0.78) - 2 * g, place: 'band' },
      };
    case 'full':
    default:
      return {
        panels: [{ x: 0, y: 0, w: W, h: H }],
        caption: { x: 0, y: H - Math.round(H * 0.30), w: W, h: Math.round(H * 0.30), place: 'overlay' },
      };
  }
}

/** Draw one photo into a rect, cover-fit, with per-panel zoom + pan offsets. */
export function drawPhotoInto(ctx, img, rect, view, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const zoom = view.zoom || 1;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (w - dw) / 2 + (view.ox || 0) * w;
  const dy = y + (h - dh) / 2 + (view.oy || 0) * h;
  ctx.drawImage(img, dx, dy, dw, dh);
  // Gradient-map grade: a top-to-bottom tint in overlay mode, then a soft wash.
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, grade.top);
  grad.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = grade.strength * 0.55;
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = grade.washAlpha * 2;
  ctx.fillStyle = grade.wash;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

/** Seeded film grain over the whole cover. */
export function drawGrain(ctx, W, H, seed, amount = 0.05) {
  const rnd = mulberry32(seed);
  const tile = 140;
  const noise = document.createElement('canvas');
  noise.width = tile; noise.height = tile;
  const nctx = noise.getContext('2d');
  const data = nctx.createImageData(tile, tile);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = rnd() * 255;
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  nctx.putImageData(data, 0, 0);
  ctx.save();
  ctx.globalAlpha = amount;
  const pattern = ctx.createPattern(noise, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Darkened corners. */
export function drawVignette(ctx, W, H, strength = 0.32) {
  const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function fitFont(ctx, text, maxWidth, startPx, family, weight = '') {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 12 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

function drawTitleBlock(ctx, area, caption, W) {
  const { title, subtitle, tag } = caption;
  const pad = Math.round(W * 0.02);
  const x = area.x + pad;
  // Fit the whole block (tag + title + subtitle) into the caption height.
  let tagPx = Math.max(14, Math.round(W * 0.018));
  let titlePx = Math.round(W * 0.085);
  let subPx = Math.round(W * 0.038);
  const need = tagPx * 1.9 + titlePx * 1.05 + subPx * 1.0 + pad;
  const scale = Math.min(1, (area.h - pad) / Math.max(1, need - pad));
  tagPx = Math.max(12, Math.round(tagPx * scale));
  titlePx = Math.round(titlePx * scale);
  subPx = Math.round(subPx * scale);
  let cy = area.y + pad;
  ctx.textBaseline = 'alphabetic';
  if (tag) {
    ctx.font = `${tagPx}px "Bebas Neue", sans-serif`;
    ctx.fillStyle = '#ffd76e';
    const spaced = tag.toUpperCase().split('').join('  ');
    ctx.fillText(spaced, x, cy + tagPx);
    cy += Math.round(tagPx * 1.9);
  }
  if (title) {
    const px = fitFont(ctx, title.toUpperCase(), area.w - 2 * pad, titlePx, 'Anton');
    ctx.save();
    ctx.font = `${px}px Anton, sans-serif`;
    ctx.lineWidth = Math.max(2, Math.round(px * 0.06));
    ctx.strokeStyle = 'rgba(20,8,24,0.85)';
    ctx.fillStyle = '#ffffff';
    ctx.strokeText(title.toUpperCase(), x, cy + px * 0.9);
    ctx.fillText(title.toUpperCase(), x, cy + px * 0.9);
    ctx.restore();
    cy += px * 1.05;
  }
  if (subtitle) {
    const px = fitFont(ctx, subtitle, area.w - 2 * pad, subPx, 'Pacifico');
    ctx.save();
    ctx.font = `${px}px Pacifico, cursive`;
    ctx.fillStyle = '#ff8fb8';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = Math.round(px * 0.25);
    ctx.fillText(subtitle, x, cy + px * 0.9);
    ctx.restore();
  }
}

/**
 * Render the whole cover. `state` = { layout, grade, caption, photos, views, seed }.
 * `photos` is an array of HTMLImageElement (or null); `views` maps panel index to {zoom, ox, oy}.
 * Returns nothing; draws into ctx (W x H).
 */
export function renderCover(ctx, W, H, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const { panels, caption } = layoutPanels(state.layout, W, H);
  // Paper-white poster base.
  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(0, 0, W, H);
  // Caption band background (hero/strip): deep plum.
  if (caption.place === 'band') {
    ctx.fillStyle = '#1c0b22';
    ctx.fillRect(caption.x, caption.y, caption.w, caption.h);
  }
  panels.forEach((rect, i) => {
    const img = state.photos[i] || state.photos[0] || null;
    const view = (state.views && state.views[i]) || { zoom: 1, ox: 0, oy: 0 };
    if (img) {
      drawPhotoInto(ctx, img, rect, view, grade);
    } else {
      ctx.fillStyle = '#3a2b4a';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    // Thin dark keyline around each panel.
    ctx.strokeStyle = 'rgba(20,8,24,0.55)';
    ctx.lineWidth = Math.max(1, Math.round(W * 0.002));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  // Caption: a dark scrim first so the lettering reads over busy photos.
  if (caption.place === 'band') {
    const scrim = ctx.createLinearGradient(0, caption.y, 0, caption.y + caption.h);
    scrim.addColorStop(0, 'rgba(10,4,16,0.25)');
    scrim.addColorStop(1, 'rgba(10,4,16,0.80)');
    ctx.fillStyle = scrim;
    ctx.fillRect(caption.x, caption.y, caption.w, caption.h);
  }
  if (caption.place === 'overlay') {
    const scrim = ctx.createLinearGradient(0, caption.y - Math.round(H * 0.06), 0, caption.y + caption.h);
    scrim.addColorStop(0, 'rgba(10,4,16,0)');
    scrim.addColorStop(1, 'rgba(10,4,16,0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(caption.x, caption.y - Math.round(H * 0.06), caption.w, caption.h + Math.round(H * 0.06));
  }
  drawTitleBlock(ctx, caption, state.caption, W);
  drawGrain(ctx, W, H, state.seed || 20261121, 0.05);
  drawVignette(ctx, W, H, 0.30);
}

/** Load the three display faces (best effort; falls back to system fonts). */
export async function loadCoverFonts() {
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('24px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  } catch (err) {
    // Offline-safe: the canvas falls back to sans-serif.
  }
}
