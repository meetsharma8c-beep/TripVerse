import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Helper to create valid multi-image ICO binary containing PNG chunks
function createMultiIco(pngItems) {
  const count = pngItems.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(count, 4); // number of images

  let offset = 6 + count * 16;
  const entries = [];
  for (const item of pngItems) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0); // width
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1); // height
    entry.writeUInt8(0, 2); // color palette (0 = no palette)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // image byte size
    entry.writeUInt32LE(offset, 12); // offset in file
    entries.push(entry);
    offset += item.buffer.length;
  }
  return Buffer.concat([header, ...entries, ...pngItems.map(p => p.buffer)]);
}

async function generateAllAssets() {
  console.log('🚀 Starting Ultra-HD Vector-First Asset Pipeline for ALL OS, Devices & Google SERP...');

  const svgPath = 'public/tripverse-mark.svg';
  if (!fs.existsSync(svgPath)) {
    throw new Error('Master vector public/tripverse-mark.svg not found!');
  }

  // Rasterize pure vector SVG at 600 DPI into a razor-sharp 2400px master transparent PNG
  const rawSvgBuffer = fs.readFileSync(svgPath);
  const markBuffer = await sharp(rawSvgBuffer, { density: 600 })
    .resize(2400, 1924, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'lanczos3'
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const markMeta = await sharp(markBuffer).metadata();
  console.log(`✅ Rasterized Pure Vector Master: ${markMeta.width}x${markMeta.height} (${markMeta.channels} channels, 600 DPI Vector Precision)`);

  // Save crisp high-DPI transparent mark assets used by legacy consumers or external embeds
  const cropped1x = await sharp(markBuffer)
    .resize(680, 545, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync('public/tripverse-mark-cropped.png', cropped1x);
  fs.writeFileSync('public/tripverse-mark.png', cropped1x);

  const cropped2x = await sharp(markBuffer)
    .resize(1360, 1090, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync('public/tripverse-mark-cropped@2x.png', cropped2x);
  fs.writeFileSync('public/tripverse-mark@2x.png', cropped2x);

  const cropped3x = await sharp(markBuffer)
    .resize(2040, 1635, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync('public/tripverse-mark@3x.png', cropped3x);
  console.log('✅ Generated public/tripverse-mark.png (1x, 2x, 3x) from pure vector SVG');

  // Helper to composite the mark onto a 1:1 square canvas with optical horizontal centering
  // (Since the glider extends right, shifting slightly right by ~2.5% centers the T+Pin optical mass inside circular masks)
  async function createSquareIcon(size, markRatio = 0.82, bgWhite = true, sharpenSmall = false) {
    const innerW = Math.max(12, Math.round(size * markRatio));
    const innerH = Math.max(10, Math.round(innerW * (545 / 680)));

    let pipeline = sharp(markBuffer).resize(innerW, innerH, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'lanczos3'
    });

    if (sharpenSmall) {
      pipeline = pipeline.sharpen({ sigma: 0.55, m1: 0.8, m2: 0.4 });
    }

    const resized = await pipeline.toBuffer();
    const leftOffset = Math.max(0, Math.round((size - innerW) / 2 + size * 0.02));
    const topOffset = Math.max(0, Math.round((size - innerH) / 2));

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: bgWhite ? { r: 255, g: 255, b: 255, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: resized, left: leftOffset, top: topOffset }])
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  // ---------------------------------------------------------
  // 1. Ultra-HD Master Assets (2048x2048 & 1024x1024 Masters)
  // ---------------------------------------------------------
  console.log('📦 1. Generating Ultra-HD 2048x2048 & 1024x1024 Bold Master Assets...');

  const transparent2048 = await createSquareIcon(2048, 0.82, false, false);
  fs.writeFileSync('public/tripverse-mark-2048.png', transparent2048);

  const transparent1024 = await createSquareIcon(1024, 0.82, false, false);
  fs.writeFileSync('public/tripverse-mark-vibrant.png', transparent1024);
  fs.writeFileSync('public/tripverse-mark-exact.png', transparent1024);

  const appIcon2048 = await createSquareIcon(2048, 0.82, true, false);
  fs.writeFileSync('public/tripverse-app-icon-2048.png', appIcon2048);

  const appIcon1024 = await createSquareIcon(1024, 0.82, true, false);
  fs.writeFileSync('public/tripverse-app-icon.png', appIcon1024);
  console.log('✅ Generated 2048x2048 & 1024x1024 Master App Icons');

  // ---------------------------------------------------------
  // 2. Web & PWA App Icons (Full Suite with Bold Mark Ratio)
  // ---------------------------------------------------------
  console.log('📦 2. Generating Full Suite of Web & PWA App Icons...');
  fs.mkdirSync('public/icons', { recursive: true });

  const pwaIcons = [
    { file: 'public/icons/icon-512.png', size: 512, ratio: 0.82 },
    { file: 'public/icons/icon-384.png', size: 384, ratio: 0.82 },
    { file: 'public/icons/icon-256.png', size: 256, ratio: 0.82 },
    { file: 'public/icons/icon-192.png', size: 192, ratio: 0.82 },
    { file: 'public/icons/icon-144.png', size: 144, ratio: 0.82 },
    { file: 'public/icons/icon-128.png', size: 128, ratio: 0.82 },
    { file: 'public/icons/icon-96.png', size: 96, ratio: 0.84 },
    { file: 'public/icons/icon-72.png', size: 72, ratio: 0.84 },
    { file: 'public/icons/icon-48.png', size: 48, ratio: 0.86 },
    { file: 'public/icons/icon-maskable.png', size: 512, ratio: 0.70 },
  ];

  for (const item of pwaIcons) {
    const buf = await createSquareIcon(item.size, item.ratio, true, item.size <= 96);
    fs.writeFileSync(item.file, buf);
    console.log(`✅ Generated ${item.file} (${item.size}x${item.size})`);
  }

  // ---------------------------------------------------------
  // 3. Apple iOS / iPadOS Icons & Universal Startup Splashes
  // ---------------------------------------------------------
  console.log('📦 3. Generating Apple iOS / iPadOS Icons & Universal Startup Screens...');

  const appleIcons = [
    { file: 'public/apple-touch-icon.png', size: 180 },
    { file: 'public/apple-touch-icon-180x180.png', size: 180 },
    { file: 'public/apple-touch-icon-167x167.png', size: 167 },
    { file: 'public/apple-touch-icon-152x152.png', size: 152 },
    { file: 'public/apple-touch-icon-120x120.png', size: 120 },
  ];

  for (const item of appleIcons) {
    const buf = await createSquareIcon(item.size, 0.82, true, false);
    fs.writeFileSync(item.file, buf);
    console.log(`✅ Generated ${item.file} (${item.size}x${item.size})`);
  }

  const iosIconDir = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
  if (fs.existsSync(iosIconDir)) {
    fs.writeFileSync(path.join(iosIconDir, 'AppIcon-512@2x.png'), appIcon1024);
    console.log('✅ Updated iOS Xcode AppIcon-512@2x.png');
  }

  // ---------------------------------------------------------
  // 4. Google SERP & Browser Favicons (48px Multiples + ICO)
  // ---------------------------------------------------------
  console.log('📦 4. Generating Google SERP 48px-Multiple Favicons & Multi-Res ICO...');

  const faviconSpecs = [
    { file: 'public/favicon-16x16.png', size: 16, ratio: 0.90, sharpen: true },
    { file: 'public/favicon-32x32.png', size: 32, ratio: 0.88, sharpen: true },
    { file: 'public/favicon-48x48.png', size: 48, ratio: 0.86, sharpen: true },
    { file: 'public/favicon-96x96.png', size: 96, ratio: 0.85, sharpen: true },
    { file: 'public/favicon-144x144.png', size: 144, ratio: 0.84, sharpen: false },
    { file: 'public/favicon-192x192.png', size: 192, ratio: 0.84, sharpen: false },
    { file: 'public/favicon-512x512.png', size: 512, ratio: 0.82, sharpen: false },
  ];

  const icoSizes = [16, 32, 48];
  const icoBuffers = [];

  for (const spec of faviconSpecs) {
    const buf = await createSquareIcon(spec.size, spec.ratio, true, spec.sharpen);
    fs.writeFileSync(spec.file, buf);
    if (spec.size === 192) {
      fs.writeFileSync('public/favicon.png', buf);
    }
    if (icoSizes.includes(spec.size)) {
      icoBuffers.push({ size: spec.size, buffer: buf });
    }
    console.log(`✅ Generated ${spec.file} (${spec.size}x${spec.size}, ratio: ${spec.ratio})`);
  }

  const icoData = createMultiIco(icoBuffers);
  fs.writeFileSync('public/favicon.ico', icoData);
  console.log('✅ Generated public/favicon.ico (Multi-Resolution ICO embedding 16x16, 32x32, 48x48)');

  console.log('\n🎉 ALL Ultra-HD Vector Assets successfully generated!');
}

generateAllAssets().catch((err) => {
  console.error('❌ Error generating assets:', err);
  process.exit(1);
});
