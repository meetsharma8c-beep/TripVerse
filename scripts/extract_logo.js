import sharp from 'sharp';
import fs from 'fs';

async function extractTransparentLogo() {
  const inputPath = '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/.user_uploaded/media_1789797968210.png';
  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  // Background color is approximately rgb(148, 148, 148)
  // Let's compute color distance from background for each pixel.
  const outBuffer = Buffer.alloc(width * height * 4);

  // Background is neutral gray: R ≈ G ≈ B and saturation is near 0.
  // The logo has green > red by at least 15-20.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const outIdx = (y * width + x) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Distance from gray (148, 148, 148)
      const dist = Math.sqrt(
        Math.pow(r - 148, 2) + 
        Math.pow(g - 148, 2) + 
        Math.pow(b - 148, 2)
      );

      // Chroma difference: logo has significant green vs red
      const greenDiff = g - r;
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));

      let alpha = 0;
      if (dist > 30 || greenDiff > 8 || maxDiff > 12) {
        // Logo pixel
        // Smooth feather near boundary
        if (dist < 38 && greenDiff < 15) {
          alpha = Math.min(255, Math.max(0, Math.round(((dist - 28) / 10) * 255)));
        } else {
          alpha = 255;
        }

        // Color enhancement: restore vibrant brand teal/emerald if the original image was slightly desaturated
        outBuffer[outIdx] = r;
        outBuffer[outIdx + 1] = g;
        outBuffer[outIdx + 2] = b;
        outBuffer[outIdx + 3] = alpha;
      } else {
        // Background pixel -> fully transparent
        outBuffer[outIdx] = 0;
        outBuffer[outIdx + 1] = 0;
        outBuffer[outIdx + 2] = 0;
        outBuffer[outIdx + 3] = 0;
      }
    }
  }

  await sharp(outBuffer, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
  .png()
  .toFile('public/tripverse-mark-exact.png');

  console.log('Saved public/tripverse-mark-exact.png');

  // Also create a vibrant brand-colored version matching the official logo from the full brand image
  // In the brand image, the gradient is vibrant emerald to teal:
  // Top: #00D084, Bottom: #008F68
  const vibrantBuffer = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const t = y / height; // 0 at top, 1 at bottom
    // Interpolate: top (#00D287 -> [0, 210, 135]) to bottom (#00885B -> [0, 136, 91])
    const vr = Math.round(0 * (1 - t) + 0 * t);
    const vg = Math.round(210 * (1 - t) + 136 * t);
    const vb = Math.round(135 * (1 - t) + 91 * t);

    for (let x = 0; x < width; x++) {
      const outIdx = (y * width + x) * 4;
      const alpha = outBuffer[outIdx + 3];

      if (alpha > 0) {
        // preserve subtle shading from original
        const origG = data[(y * width + x) * channels + 1];
        const shadeFactor = origG / 125; // around 1.0

        vibrantBuffer[outIdx] = Math.min(255, Math.round(vr * shadeFactor));
        vibrantBuffer[outIdx + 1] = Math.min(255, Math.round(vg * shadeFactor));
        vibrantBuffer[outIdx + 2] = Math.min(255, Math.round(vb * shadeFactor));
        vibrantBuffer[outIdx + 3] = alpha;
      } else {
        vibrantBuffer[outIdx] = 0;
        vibrantBuffer[outIdx + 1] = 0;
        vibrantBuffer[outIdx + 2] = 0;
        vibrantBuffer[outIdx + 3] = 0;
      }
    }
  }

  await sharp(vibrantBuffer, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
  .png()
  .toFile('public/tripverse-mark-vibrant.png');

  console.log('Saved public/tripverse-mark-vibrant.png');
}

extractTransparentLogo().catch(console.error);
