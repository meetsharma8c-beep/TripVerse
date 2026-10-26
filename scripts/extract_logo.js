import sharp from 'sharp';

async function extractTransparentLogo() {
  console.log('🚀 Extracting Ultra-HD Master Logo with Flawless Edge Outline...');
  const inputPath = 'public/brand-logo-raw.jpg';
  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // 1. Initial High-Confidence Logo Detection
  const rawMask = new Uint8Array(w * h);
  for (let y = 200; y < 840; y++) {
    for (let x = 120; x < 930; x++) {
      const idx = (y * w + x) * 3;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const deltaSat = g - (r + b) / 2;
      const distWhite = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);

      if (deltaSat >= 14 && (g - r) >= 10 && distWhite >= 30) {
        rawMask[y * w + x] = 1;
      }
    }
  }

  // 2. BFS Connected Component Analysis starting from guaranteed logo seeds
  const visited = new Uint8Array(w * h);
  const queue = [];
  const seeds = [
    [400, 270], [410, 450], [415, 750], [420, 810],
    [180, 620], [550, 580], [730, 450], [780, 360], [730, 350], [800, 390], [850, 320]
  ];
  for (const [sx, sy] of seeds) {
    const sIdx = sy * w + sx;
    if (rawMask[sIdx] && !visited[sIdx]) {
      visited[sIdx] = 1;
      queue.push([sx, sy]);
    }
  }

  while (queue.length > 0) {
    const [cx, cy] = queue.pop();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 120 && nx <= 930 && ny >= 200 && ny <= 840) {
          const nIdx = ny * w + nx;
          if (!visited[nIdx] && rawMask[nIdx]) {
            visited[nIdx] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  for (let i = 0; i < w * h; i++) {
    if (rawMask[i] && !visited[i]) rawMask[i] = 0;
  }

  // 3. Morphological Closing (Dilate 2, Erode 2) to eliminate JPEG 8x8 block bites, stairstepping, and notches
  const dilated = new Uint8Array(w * h);
  const R_morph = 2;
  for (let y = 200; y < 840; y++) {
    for (let x = 120; x < 930; x++) {
      if (rawMask[y * w + x]) {
        for (let dy = -R_morph; dy <= R_morph; dy++) {
          for (let dx = -R_morph; dx <= R_morph; dx++) {
            if (dx * dx + dy * dy <= R_morph * R_morph) {
              dilated[(y + dy) * w + (x + dx)] = 1;
            }
          }
        }
      }
    }
  }

  const cleanMask = new Uint8Array(w * h);
  for (let y = 200; y < 840; y++) {
    for (let x = 120; x < 930; x++) {
      if (dilated[y * w + x]) {
        let allOn = true;
        for (let dy = -R_morph; dy <= R_morph; dy++) {
          for (let dx = -R_morph; dx <= R_morph; dx++) {
            if (dx * dx + dy * dy <= R_morph * R_morph) {
              if (!dilated[(y + dy) * w + (x + dx)]) {
                allOn = false;
                break;
              }
            }
          }
          if (!allOn) break;
        }
        if (allOn) cleanMask[y * w + x] = 1;
      }
    }
  }

  // Preserve interior crease of airplane
  for (let y = 240; y < 550; y++) {
    for (let x = 680; x < 915; x++) {
      const idx = y * w + x;
      if (!cleanMask[idx]) {
        let hasLeft = false, hasRight = false;
        for (let dx = 1; dx <= 8; dx++) if (cleanMask[y * w + (x - dx)]) hasLeft = true;
        for (let dx = 1; dx <= 8; dx++) if (cleanMask[y * w + (x + dx)]) hasRight = true;
        if (hasLeft && hasRight) {
          const r = data[idx * 3], g = data[idx * 3 + 1];
          if (g - r >= 15) cleanMask[idx] = 1;
        }
      }
    }
  }

  // 4. Identify deep interior core (at least 3px away from boundary)
  const deepInterior = new Uint8Array(w * h);
  for (let y = 200; y < 840; y++) {
    for (let x = 120; x < 930; x++) {
      if (cleanMask[y * w + x]) {
        let isDeep = true;
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (dx * dx + dy * dy <= 9) {
              if (!cleanMask[(y + dy) * w + (x + dx)]) {
                isDeep = false;
                break;
              }
            }
          }
          if (!isDeep) break;
        }
        if (isDeep) deepInterior[y * w + x] = 1;
      }
    }
  }

  // 5. Continuous Sub-pixel Anti-Aliased Gaussian Edge Ramp
  const alphaFloat = new Float32Array(w * h);
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      let sum = 0, count = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const wgt = Math.exp(-(dx * dx + dy * dy) / 2.0);
          sum += cleanMask[(y + dy) * w + (x + dx)] * wgt;
          count += wgt;
        }
      }
      alphaFloat[y * w + x] = sum / count;
    }
  }

  // 6. Color Spill Decontamination:
  // Interior keeps raw color gradient; boundary pixels inpaint from deep interior to eradicate white matte fringe
  const finalR = new Uint8Array(w * h);
  const finalG = new Uint8Array(w * h);
  const finalB = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pIdx = y * w + x;
      const a = alphaFloat[pIdx];
      if (a < 0.01) continue;

      if (deepInterior[pIdx]) {
        finalR[pIdx] = data[pIdx * 3];
        finalG[pIdx] = data[pIdx * 3 + 1];
        finalB[pIdx] = data[pIdx * 3 + 2];
      } else {
        let closestDist = 999;
        let cr = 0, cg = 120, cb = 40;
        for (let dy = -8; dy <= 8; dy++) {
          for (let dx = -8; dx <= 8; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              const nIdx = ny * w + nx;
              if (deepInterior[nIdx]) {
                const d = dx * dx + dy * dy;
                if (d < closestDist) {
                  closestDist = d;
                  cr = data[nIdx * 3];
                  cg = data[nIdx * 3 + 1];
                  cb = data[nIdx * 3 + 2];
                }
              }
            }
          }
        }
        finalR[pIdx] = cr;
        finalG[pIdx] = cg;
        finalB[pIdx] = cb;
      }
    }
  }

  // Assemble RGBA Master Buffer
  const outBuffer = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const outIdx = i * 4;
    outBuffer[outIdx] = finalR[i];
    outBuffer[outIdx + 1] = finalG[i];
    outBuffer[outIdx + 2] = finalB[i];
    outBuffer[outIdx + 3] = Math.round(alphaFloat[i] * 255);
  }

  // Save exact 1024x1024 transparent mark
  await sharp(outBuffer, {
    raw: {
      width: w,
      height: h,
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
  console.log('✅ Saved public/tripverse-mark-cropped.png');

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
    .resize(800, 630, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
