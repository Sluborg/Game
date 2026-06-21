// Image loader with a module-level cache so each spritesheet is fetched and
// decoded once, then shared across every unit that uses it.

const cache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  let pending = cache.get(url);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`failed to load sprite: ${url}`));
      img.src = url;
    });
    cache.set(url, pending);
  }
  return pending;
}
