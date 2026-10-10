import sharp from 'sharp';
import fs from 'fs';

async function extractTransparentLogo() {
  const inputPath = 'public/brand-logo-raw.jpg';
  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  // 1. Core Green Condition: Must have substantial green saturation
  const isLogoCore = (x, y) => {
    if (x < 125 || x > 925 || y < 205 || y > 835) return false;
    const idx = (y * width + x) * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    return (g > 35 && (g - r) >= 16 && (g - b) >= 6);
  };

  // 2. BFS Connected Component Analysis starting from guaranteed logo seeds
  const connectedMask = new Uint8Array(width * height);
  const queue = [];
  const seeds = [
    [400, 270], // T top horizontal bar
    [410, 450], // T central stem
    [415, 750], // Lower pin
    [200, 580], // Left swoop arc
    [550, 580], // Lower swoop arc
    [780, 360], // Airplane body
    [730, 350], // Airplane left wing
    [800, 390], // Airplane tail
  ];

  for (const [sx, sy] of seeds) {
    const sIdx = sy * width + sx;
    if (isLogoCore(sx, sy) && !connectedMask[sIdx]) {
      connectedMask[sIdx] = 1;
      queue.push([sx, sy]);
    }
  }

  while (queue.length > 0) {
    const [cx, cy] = queue.pop();
    const neighbors = [
      [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1],
      [cx + 1, cy + 1], [cx + 1, cy - 1], [cx - 1, cy + 1], [cx - 1, cy - 1]
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!connectedMask[nIdx] && isLogoCore(nx, ny)) {
          connectedMask[nIdx] = 1;
          queue.push([nx, ny]);
        }
      }
    }
  }

  // 3. Proximity map: Only allow anti-aliasing within 3px of connected component
  const proximity = new Uint8Array(width * height);
  const R = 3;
  for (let y = 205; y < 835; y++) {
    for (let x = 125; x < 925; x++) {
      if (connectedMask[y * width + x] === 1) {
        for (let dy = -R; dy <= R; dy++) {
          for (let dx = -R; dx <= R; dx++) {
            proximity[(y + dy) * width + (x + dx)] = 1;
          }
        }
      }
    }
  }

  // 4. Alpha matting and color unmixing against pure white background
  const outBuffer = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const outIdx = (y * width + x) * 4;

      if (proximity[y * width + x] === 0) {
        outBuffer[outIdx] = 0;
        outBuffer[outIdx + 1] = 0;
        outBuffer[outIdx + 2] = 0;
        outBuffer[outIdx + 3] = 0;
        continue;
      }

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const isCore = connectedMask[y * width + x] === 1;
      const minVal = Math.min(r, g, b);

      if (isCore && minVal < 210) {
        // Solid logo interior
        outBuffer[outIdx] = r;
        outBuffer[outIdx + 1] = g;
        outBuffer[outIdx + 2] = b;
        outBuffer[outIdx + 3] = 255;
      } else {
        // Edge anti-aliasing: compute distance from clean white (254, 254, 254)
        const greenDiffR = Math.max(0, g - r);
        const distFromWhite = Math.sqrt(
          Math.pow(254 - r, 2) + Math.pow(254 - g, 2) + Math.pow(254 - b, 2)
        );

        if (distFromWhite < 12 || greenDiffR < 4) {
          outBuffer[outIdx] = 0;
          outBuffer[outIdx + 1] = 0;
          outBuffer[outIdx + 2] = 0;
          outBuffer[outIdx + 3] = 0;
        } else {
          // Smooth alpha ramp
          const alpha = Math.min(255, Math.max(0, Math.round(((distFromWhite - 8) / 95) * 255)));
          const aNorm = Math.max(0.1, alpha / 255);

          // Color unmix
          const ur = Math.min(255, Math.max(0, Math.round((r - 254 * (1 - aNorm)) / aNorm)));
          const ug = Math.min(255, Math.max(0, Math.round((g - 254 * (1 - aNorm)) / aNorm)));
          const ub = Math.min(255, Math.max(0, Math.round((b - 254 * (1 - aNorm)) / aNorm)));

          outBuffer[outIdx] = ur;
          outBuffer[outIdx + 1] = ug;
          outBuffer[outIdx + 2] = ub;
          outBuffer[outIdx + 3] = alpha;
        }
      }
    }
  }

  // Save exact 1024x1024 transparent mark
  await sharp(outBuffer, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
  .png({ compressionLevel: 9 })
  .toFile('public/tripverse-mark-exact.png');
  console.log('✅ Saved public/tripverse-mark-exact.png');

  // Trim tight
  const trimmed = await sharp('public/tripverse-mark-exact.png')
    .trim()
    .toBuffer({ resolveWithObject: true });
  console.log(`✅ Trimmed Mark: ${trimmed.info.width}x${trimmed.info.height}`);

  await sharp(trimmed.data)
    .png({ compressionLevel: 9 })
    .toFile('public/tripverse-mark-cropped.png');

  // Master Centered Transparent Logo (1024x1024)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([
    {
      input: trimmed.data,
      gravity: 'center'
    }
  ])
  .png({ compressionLevel: 9 })
  .toFile('public/tripverse-mark-vibrant.png');
  console.log('✅ Saved public/tripverse-mark-vibrant.png');

  // Master App Icon (1024x1024 with pure white background)
  const appIconMark = await sharp(trimmed.data)
    .resize(580, 445, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 } // #FFFFFF Pure White
    }
  })
  .composite([
    {
      input: appIconMark,
      gravity: 'center'
    }
  ])
  .png({ compressionLevel: 9 })
  .toFile('public/tripverse-app-icon.png');
  console.log('✅ Saved public/tripverse-app-icon.png');
}

extractTransparentLogo().catch(console.error);
