// Vice Cover Studio — screenshot scenes (?shot=...).
// The maker screenshots the app through these scenes: ?shot=editor shows the
// editor with a photo loaded, ?shot=cover / ?shot=portrait draw a cover
// full-frame, ?shot=grid shows the four-panel layout. No network involved.

export async function applyShotMode(state, api) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  if (shot === 'grid') {
    state.layout = 'grid';
    state.size = 'wide';
    const names = ['samples/beach.jpg', 'samples/rooftop.jpg', 'samples/neon.jpg'];
    for (let i = 0; i < names.length; i++) {
      try {
        const img = await api.loadImage(names[i]);
        state.photos[i] = img;
      } catch (err) { /* sample optional */ }
    }
    state.caption = { title: 'VICE CITY', subtitle: 'Three nights, one city', tag: 'GTA VI' };
    document.body.classList.add('shot-cover');
    return;
  }
  if (shot === 'cover' || shot === 'portrait') {
    state.layout = 'hero';
    state.size = shot === 'portrait' ? 'portrait' : 'wide';
    state.caption = { title: 'VICE CITY', subtitle: 'Neon Shore', tag: 'GTA VI' };
    try {
      const beach = await api.loadImage('samples/beach.jpg');
      const neon = await api.loadImage('samples/neon.jpg');
      state.photos[0] = beach;
      state.photos[1] = neon;
      state.photos[2] = await api.loadImage('samples/rooftop.jpg');
    } catch (err) { /* sample optional */ }
    document.body.classList.add('shot-cover');
    return;
  }
  if (shot === 'editor') {
    state.layout = 'hero';
    state.caption = { title: 'VICE CITY', subtitle: 'Neon Shore', tag: 'GTA VI' };
    try {
      const beach = await api.loadImage('samples/beach.jpg');
      state.photos[0] = beach;
      const neon = await api.loadImage('samples/neon.jpg');
      state.photos[1] = neon;
    } catch (err) { /* sample optional */ }
  }
}
