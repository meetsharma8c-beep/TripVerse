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
  console.log('🚀 Starting Ultra-HD Bold Asset Pipeline for ALL OS & Devices...');
  
  const masterPath = 'public/tripverse-mark-cropped.png';
  if (!fs.existsSync(masterPath)) {
    throw new Error('Master mark public/tripverse-mark-cropped.png not found!');
  }

  // Load and apply subtle micro-sharpening to retain razor-sharp edge contrast across all scales
  const rawMarkBuffer = fs.readFileSync(masterPath);
  const markBuffer = await sharp(rawMarkBuffer)
    .sharpen({ sigma: 0.8, m1: 1.15, m2: 0.4 })
    .toBuffer();

  const markMeta = await sharp(markBuffer).metadata();
  console.log(`✅ Loaded Master Source: ${markMeta.width}x${markMeta.height} (${markMeta.channels} channels, Ultra-HD Transparent)`);

  // ---------------------------------------------------------
  // 1. Ultra-HD Master Assets (2048x2048 & 1024x1024 Masters)
  // ---------------------------------------------------------
  console.log('📦 1. Generating Ultra-HD 2048x2048 & 1024x1024 Bold Master Assets...');

  // 1a. Ultra-HD 2048x2048 Transparent Master Mark (Mark width: 1600px = 78% of canvas)
  const mark2048 = await sharp(markBuffer)
    .resize(1600, 1260, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .toBuffer();

  const transparent2048 = await sharp({
    create: {
      width: 2048,
      height: 2048,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{ input: mark2048, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toBuffer();

  fs.writeFileSync('public/tripverse-mark-2048.png', transparent2048);
  console.log('✅ Generated public/tripverse-mark-2048.png (2048x2048 Ultra-HD)');

  // 1b. 1024x1024 Transparent Master Mark (Mark width: 800px = 78% of canvas)
  const mark1024 = await sharp(markBuffer)
    .resize(800, 630, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .toBuffer();

  const transparent1024 = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{ input: mark1024, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toBuffer();

  fs.writeFileSync('public/tripverse-mark-vibrant.png', transparent1024);
  fs.writeFileSync('public/tripverse-mark-exact.png', transparent1024);
  console.log('✅ Generated public/tripverse-mark-vibrant.png & exact.png (1024x1024 Bold Master)');

  // 1c. 2x High-DPI Cropped Mark for In-App Retina 3x Displays
  const cropped2x = await sharp(markBuffer)
    .resize(Math.round(markMeta.width * 2), Math.round(markMeta.height * 2), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'lanczos3'
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync('public/tripverse-mark-cropped@2x.png', cropped2x);
  console.log(`✅ Generated public/tripverse-mark-cropped@2x.png (${Math.round(markMeta.width * 2)}x${Math.round(markMeta.height * 2)} Retina 2x)`);

  // 1d. Master App Icon (2048x2048 on pure #FFFFFF with bold 78% mark)
  const appIconMark2048 = await sharp(markBuffer)
    .resize(1600, 1260, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .toBuffer();

  const appIcon2048 = await sharp({
    create: {
      width: 2048,
      height: 2048,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 } // #FFFFFF Pure White
    }
  })
  .composite([{ input: appIconMark2048, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toBuffer();

  fs.writeFileSync('public/tripverse-app-icon-2048.png', appIcon2048);
  console.log('✅ Generated public/tripverse-app-icon-2048.png (2048x2048 Ultra-HD Bold App Icon)');

  // 1e. Master App Icon (1024x1024 on pure #FFFFFF with bold 78% mark)
  const appIconMark1024 = await sharp(markBuffer)
    .resize(800, 630, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .toBuffer();

  const appIcon1024 = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 } // #FFFFFF Pure White
    }
  })
  .composite([{ input: appIconMark1024, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toBuffer();

  fs.writeFileSync('public/tripverse-app-icon.png', appIcon1024);
  console.log('✅ Generated public/tripverse-app-icon.png (1024x1024 Bold Master App Icon)');

  // ---------------------------------------------------------
  // 2. Web & PWA App Icons (Full Suite with Bold 78% Mark Ratio)
  // ---------------------------------------------------------
  console.log('📦 2. Generating Full Suite of Web & PWA App Icons (Bold Proportion)...');
  fs.mkdirSync('public/icons', { recursive: true });

  const pwaIcons = [
    { file: 'public/icons/icon-512.png', size: 512, iconSize: 400 }, // 78% bold canvas ratio
    { file: 'public/icons/icon-384.png', size: 384, iconSize: 300 },
    { file: 'public/icons/icon-256.png', size: 256, iconSize: 200 },
    { file: 'public/icons/icon-192.png', size: 192, iconSize: 150 }, // 78% bold canvas ratio
    { file: 'public/icons/icon-144.png', size: 144, iconSize: 112 },
    { file: 'public/icons/icon-128.png', size: 128, iconSize: 100 },
    { file: 'public/icons/icon-96.png', size: 96, iconSize: 75 },
    { file: 'public/icons/icon-72.png', size: 72, iconSize: 56 },
    { file: 'public/icons/icon-48.png', size: 48, iconSize: 38 },
    { file: 'public/icons/icon-maskable.png', size: 512, iconSize: 340 }, // 66.5% safe zone for Android circular/squircle masking
  ];

  for (const item of pwaIcons) {
    const resized = await sharp(markBuffer)
      .resize(item.iconSize, item.iconSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: 'lanczos3'
      })
      .toBuffer();

    await sharp({
      create: {
        width: item.size,
        height: item.size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // #FFFFFF Pure White
      }
    })
    .composite([{ input: resized, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(item.file);

    console.log(`✅ Generated ${item.file} (${item.size}x${item.size}, mark: ${item.iconSize}px)`);
  }

  // ---------------------------------------------------------
  // 3. Apple iOS / iPadOS Icons & Universal Startup Splashes
  // ---------------------------------------------------------
  console.log('📦 3. Generating Apple iOS / iPadOS Icons & Universal Startup Screens...');

  const appleIcons = [
    { file: 'public/apple-touch-icon.png', size: 180, iconSize: 140 }, // 78% bold ratio for iPhone Super Retina XDR
    { file: 'public/apple-touch-icon-180x180.png', size: 180, iconSize: 140 },
    { file: 'public/apple-touch-icon-167x167.png', size: 167, iconSize: 130 }, // iPad Pro
    { file: 'public/apple-touch-icon-152x152.png', size: 152, iconSize: 118 }, // iPad Retina
    { file: 'public/apple-touch-icon-120x120.png', size: 120, iconSize: 94 }, // iPhone 2x
  ];

  for (const item of appleIcons) {
    const resized = await sharp(markBuffer)
      .resize(item.iconSize, item.iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .toBuffer();

    await sharp({
      create: {
        width: item.size,
        height: item.size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([{ input: resized, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(item.file);

    console.log(`✅ Generated ${item.file} (${item.size}x${item.size})`);
  }

  // Apple Web App universal startup screen (iPhone 15/16 Pro standard 1179x2556)
  const appleSplashLogo = await sharp(markBuffer)
    .resize(480, 480, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .toBuffer();

  await sharp({
    create: {
      width: 1179,
      height: 2556,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([{ input: appleSplashLogo, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile('public/apple-splash-screen.png');
  console.log('✅ Generated public/apple-splash-screen.png (1179x2556 for iOS Safari)');

  // Native iOS Xcode Asset Catalog
  const iosIconDir = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
  if (fs.existsSync(iosIconDir)) {
    fs.writeFileSync(path.join(iosIconDir, 'AppIcon-512@2x.png'), appIcon1024);
    console.log('✅ Generated iOS AppIcon-512@2x.png (1024x1024 Bold Universal iOS App Icon in Xcode Catalog)');
  }

  // Native iOS Universal Launch Splash Screens (2732x2732 Ultra-HD iPad Pro & iPhone)
  const iosSplashDir = 'ios/App/App/Assets.xcassets/Splash.imageset';
  if (fs.existsSync(iosSplashDir)) {
    const splashLogo2732 = await sharp(markBuffer)
      .resize(1100, 1100, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .toBuffer();

    const iosSplash2732 = await sharp({
      create: {
        width: 2732,
        height: 2732,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // #FFFFFF Pure White
      }
    })
    .composite([{ input: splashLogo2732, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();

    fs.writeFileSync(path.join(iosSplashDir, 'splash-2732x2732.png'), iosSplash2732);
    fs.writeFileSync(path.join(iosSplashDir, 'splash-2732x2732-1.png'), iosSplash2732);
    fs.writeFileSync(path.join(iosSplashDir, 'splash-2732x2732-2.png'), iosSplash2732);
    console.log('✅ Generated iOS Splash.imageset 2732x2732 (1x, 2x, 3x) in Xcode Catalog with Pure White Background');
  }

  // ---------------------------------------------------------
  // 4. Android Native Mipmap Icons & Adaptive Drawables (BOLD)
  // ---------------------------------------------------------
  console.log('📦 4. Generating Native Android Adaptive Mipmap Icons (Bold Proportion)...');
  // Android Adaptive icon specs: canvas = 108dp, inner visible squircle = 72dp.
  // We set fgMark to 70% of fgSize (~75dp wide), so the mark boldly and prominently fills the squircle!
  const mipmaps = [
    { dir: 'mipmap-mdpi', iconSize: 48, fgSize: 108, markFg: 60, markLeg: 38 },
    { dir: 'mipmap-hdpi', iconSize: 72, fgSize: 162, markFg: 90, markLeg: 58 },
    { dir: 'mipmap-xhdpi', iconSize: 96, fgSize: 216, markFg: 120, markLeg: 76 },
    { dir: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324, markFg: 180, markLeg: 115 },
    { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432, markFg: 240, markLeg: 154 },
  ];

  for (const m of mipmaps) {
    const targetDir = path.join('android/app/src/main/res', m.dir);
    if (!fs.existsSync(targetDir)) continue;

    // A. Adaptive icon foreground (boldly sized to fill the squircle without clipping)
    const fgMark = await sharp(markBuffer)
      .resize(m.markFg, m.markFg, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .toBuffer();

    await sharp({
      create: {
        width: m.fgSize,
        height: m.fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: fgMark, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    // B. Legacy standard icon (pure white background, bold 78% mark size)
    const legMark = await sharp(markBuffer)
      .resize(m.markLeg, m.markLeg, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .toBuffer();

    await sharp({
      create: {
        width: m.iconSize,
        height: m.iconSize,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // #FFFFFF Pure White
      }
    })
    .composite([{ input: legMark, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(targetDir, 'ic_launcher.png'));

    // C. Legacy round icon (white circle plate with bold mark)
    const circleSvg = Buffer.from(
      `<svg width="${m.iconSize}" height="${m.iconSize}"><circle cx="${m.iconSize / 2}" cy="${m.iconSize / 2}" r="${m.iconSize / 2}" fill="#FFFFFF"/></svg>`
    );
    const roundBg = await sharp(circleSvg).png().toBuffer();

    await sharp(roundBg)
      .composite([{ input: legMark, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    console.log(`✅ Generated Android ${m.dir} icons (foreground: ${m.markFg}px on ${m.fgSize}px, standard: ${m.markLeg}px)`);
  }

  // ---------------------------------------------------------
  // 5. Android Native Splash Screens (Full Density Spectrum)
  // ---------------------------------------------------------
  console.log('📦 5. Generating Android Native Splash Screens for all densities...');
  const splashes = [
    { file: 'android/app/src/main/res/drawable/splash.png', w: 480, h: 320, logo: 180 },
    { file: 'android/app/src/main/res/drawable-port-mdpi/splash.png', w: 320, h: 480, logo: 160 },
    { file: 'android/app/src/main/res/drawable-port-hdpi/splash.png', w: 480, h: 800, logo: 240 },
    { file: 'android/app/src/main/res/drawable-port-xhdpi/splash.png', w: 720, h: 1280, logo: 360 },
    { file: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png', w: 960, h: 1600, logo: 480 },
    { file: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png', w: 1280, h: 1920, logo: 620 },
    { file: 'android/app/src/main/res/drawable-land-mdpi/splash.png', w: 480, h: 320, logo: 160 },
    { file: 'android/app/src/main/res/drawable-land-hdpi/splash.png', w: 800, h: 480, logo: 240 },
    { file: 'android/app/src/main/res/drawable-land-xhdpi/splash.png', w: 1280, h: 720, logo: 340 },
    { file: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png', w: 1600, h: 960, logo: 440 },
    { file: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png', w: 1920, h: 1280, logo: 560 },
  ];

  for (const s of splashes) {
    const parentDir = path.dirname(s.file);
    if (!fs.existsSync(parentDir)) continue;

    const splashLogo = await sharp(markBuffer)
      .resize(s.logo, s.logo, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .toBuffer();

    await sharp({
      create: {
        width: s.w,
        height: s.h,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // #FFFFFF Pure White
      }
    })
    .composite([{ input: splashLogo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(s.file);

    console.log(`✅ Generated ${s.file} (${s.w}x${s.h})`);
  }

  // ---------------------------------------------------------
  // 6. Favicons & Multi-Resolution Desktop Browser ICO
  // ---------------------------------------------------------
  console.log('📦 6. Generating Favicons & Multi-Resolution Desktop Browser ICO...');

  const icoSizes = [16, 32, 48];
  const icoBuffers = [];

  for (const size of [16, 32, 48, 64, 192]) {
    const markRatio = size <= 32 ? 0.82 : 0.76;
    const innerSize = Math.max(12, Math.round(size * markRatio));

    const resized = await sharp(markBuffer)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .sharpen(size <= 32 ? { sigma: 0.9, m1: 1.5, m2: 0.7 } : undefined)
      .toBuffer();

    const iconBuf = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer();

    if (size === 16) {
      fs.writeFileSync('public/favicon-16x16.png', iconBuf);
      console.log('✅ Generated public/favicon-16x16.png (Sharpened Full HD)');
    }
    if (size === 32) {
      fs.writeFileSync('public/favicon-32x32.png', iconBuf);
      console.log('✅ Generated public/favicon-32x32.png (Sharpened Full HD)');
    }
    if (size === 192) {
      fs.writeFileSync('public/favicon.png', iconBuf);
      console.log('✅ Generated public/favicon.png');
    }

    if (icoSizes.includes(size)) {
      icoBuffers.push({ size, buffer: iconBuf });
    }
  }

  // Write multi-resolution favicon.ico containing 16x16, 32x32, 48x48
  const icoData = createMultiIco(icoBuffers);
  fs.writeFileSync('public/favicon.ico', icoData);
  console.log('✅ Generated public/favicon.ico (Multi-Resolution ICO embedding 16x16, 32x32, 48x48)');

  console.log('\n🎉 ALL Ultra-HD Bold Assets successfully generated for iOS, Android, macOS, Windows, ChromeOS, and Web!');
}

generateAllAssets().catch((err) => {
  console.error('❌ Error generating assets:', err);
  process.exit(1);
});
