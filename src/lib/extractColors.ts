/** Extract dominant colors from an image URL using canvas */
export function extractColors(imageUrl: string, count = 5): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 50; // sample at low res for speed
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve([]);

      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      // Collect pixel colors, quantize to reduce noise
      const colorMap = new Map<string, number>();
      for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
      }

      // Sort by frequency, take top N, skip near-black/near-white
      const sorted = [...colorMap.entries()]
        .filter(([hex]) => {
          const brightness = parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
          return brightness > 30 && brightness < 720;
        })
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([hex]) => hex);

      resolve(sorted);
    };
    img.onerror = () => resolve([]);
    img.src = imageUrl;
  });
}
