// Práce s fotkami: zmenšení před uložením a odkazy pro zobrazení.

// Fotka -> <img>, ať ji můžeme nakreslit na plátno (canvas)
function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Fotku se nepodařilo načíst'));
    img.src = URL.createObjectURL(blob);
  });
}

// Zmenší fotku tak, aby delší strana měla max `maxSize` px, a uloží jako JPEG
async function resizeImage(blob, maxSize, quality) {
  const img = await loadImage(blob);
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);
  const out = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return { blob: out, width, height };
}

/**
 * Připraví fotku k uložení: plná verze (max 1600 px, ~300 kB místo ~5 MB z iPhonu)
 * a malý náhled do mřížky (400 px).
 */
export async function preparePhoto(blob) {
  const full = await resizeImage(blob, 1600, 0.85);
  const thumb = await resizeImage(full.blob, 400, 0.75);
  return { blob: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
}

// Odkazy (object URL) na fotky z databáze. Při přechodu na jinou stránku je
// uvolníme, jinak by zbytečně držely paměť.
const urls = new Set();

export function photoUrl(blob) {
  const url = URL.createObjectURL(blob);
  urls.add(url);
  return url;
}

export function releasePhotoUrls() {
  for (const url of urls) URL.revokeObjectURL(url);
  urls.clear();
}
