import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAllAssets() {
  console.log('🚀 Starting Ultra-HD Asset Generation from Master Vector SVG...');
  const svgPath = 'public/tripverse-mark.svg';
  const svgBuffer = fs.readFileSync(svgPath);

  // Synchronize favicon.svg
  fs.writeFileSync('public/favicon.svg', svgBuffer);
  console.log('✅ Synchronized public/favicon.svg with master vector mark');

  // 1. Ultra-HD Transparent Master Brand PNGs (1024x1024)
  console.log('📦 1. Generating 1024x1024 Ultra-HD Transparent Brand PNGs...');
  const vibrant1024 = await sharp(svgBuffer, { density: 600 })
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync('public/tripverse-mark-vibrant.png', vibrant1024);
  fs.writeFileSync('public/tripverse-mark-exact.png', vibrant1024);
  console.log('✅ Generated public/tripverse-mark-vibrant.png & exact.png (1024x1024)');

  // 2. Web & PWA App Icons
  console.log('📦 2. Generating PWA & Web Icons...');
  fs.mkdirSync('public/icons', { recursive: true });

  const pwaIcons = [
    { file: 'public/icons/icon-192.png', size: 192, iconSize: 100 }, // 52% canvas ratio
    { file: 'public/icons/icon-512.png', size: 512, iconSize: 266 }, // 52% canvas ratio
    { file: 'public/icons/icon-maskable.png', size: 512, iconSize: 225 }, // 44% safe zone ratio
    { file: 'public/apple-touch-icon.png', size: 180, iconSize: 94 }, // 52% canvas ratio
    { file: 'public/favicon.png', size: 192, iconSize: 100 },
    { file: 'public/favicon-32x32.png', size: 32, iconSize: 20 },
    { file: 'public/favicon-16x16.png', size: 16, iconSize: 11 },
  ];

  for (const item of pwaIcons) {
    const isSmallFavicon = item.size <= 32;

    const markBuffer = await sharp(svgBuffer, { density: 600 })
      .resize(item.iconSize, item.iconSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    if (isSmallFavicon) {
      await sharp({
        create: {
          width: item.size,
          height: item.size,
          channels: 4,
          background: { r: 11, g: 37, b: 69, alpha: 1 }
        }
      })
      .composite([{ input: markBuffer, gravity: 'center' }])
      .png()
      .toFile(item.file);
    } else {
      await sharp({
        create: {
          width: item.size,
          height: item.size,
          channels: 4,
          background: { r: 11, g: 37, b: 69, alpha: 1 } // #0B2545 Midnight Navy
        }
      })
      .composite([{ input: markBuffer, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(item.file);
    }
    console.log(`✅ Generated ${item.file} (${item.size}x${item.size})`);
  }

  // 3. Apple Splash Screen (Universal 1179x2556)
  console.log('📦 3. Generating iOS Startup Screen...');
  const appleSplashLogo = await sharp(svgBuffer, { density: 600 })
    .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1179,
      height: 2556,
      channels: 4,
      background: { r: 11, g: 37, b: 69, alpha: 1 }
    }
  })
  .composite([{ input: appleSplashLogo, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile('public/apple-splash-screen.png');
  console.log('✅ Generated public/apple-splash-screen.png (1179x2556)');

  // 4. Android Mipmap Icons
  console.log('📦 4. Generating Native Android Mipmap Icons...');
  const mipmaps = [
    { dir: 'mipmap-mdpi', iconSize: 48, fgSize: 108, markSize: 45 },
    { dir: 'mipmap-hdpi', iconSize: 72, fgSize: 162, markSize: 68 },
    { dir: 'mipmap-xhdpi', iconSize: 96, fgSize: 216, markSize: 90 },
    { dir: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324, markSize: 135 },
    { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432, markSize: 180 },
  ];

  for (const m of mipmaps) {
    const targetDir = path.join('android/app/src/main/res', m.dir);
    if (!fs.existsSync(targetDir)) continue;

    // A. Adaptive icon foreground (41.6% size - sits cleanly inside the 66dp safe zone)
    const fgMark = await sharp(svgBuffer, { density: 600 })
      .resize(m.markSize, m.markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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

    // B. Legacy standard icon (with #0B2545 navy background and 52% mark size)
    const legMarkSize = Math.round(m.iconSize * 0.52);
    const legMark = await sharp(svgBuffer, { density: 600 })
      .resize(legMarkSize, legMarkSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: m.iconSize,
        height: m.iconSize,
        channels: 4,
        background: { r: 11, g: 37, b: 69, alpha: 1 }
      }
    })
    .composite([{ input: legMark, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(targetDir, 'ic_launcher.png'));

    // C. Legacy round icon
    const circleSvg = Buffer.from(
      `<svg width="${m.iconSize}" height="${m.iconSize}"><circle cx="${m.iconSize / 2}" cy="${m.iconSize / 2}" r="${m.iconSize / 2}" fill="#0B2545"/></svg>`
    );
    const roundBg = await sharp(circleSvg).png().toBuffer();

    await sharp(roundBg)
      .composite([{ input: legMark, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    console.log(`✅ Generated ${m.dir} icons (ic_launcher, ic_launcher_round, ic_launcher_foreground)`);
  }

  // 4b. iOS App Icon (1024x1024 Universal)
  console.log('📦 4b. Generating Native iOS App Icon...');
  const iosIconDir = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
  if (fs.existsSync(iosIconDir)) {
    const iosMark = await sharp(svgBuffer, { density: 600 })
      .resize(532, 532, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 11, g: 37, b: 69, alpha: 1 } // #0B2545 Midnight Navy
      }
    })
    .composite([{ input: iosMark, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(iosIconDir, 'AppIcon-512@2x.png'));
    console.log('✅ Generated iOS AppIcon-512@2x.png (1024x1024 with balanced 52% mark size)');
  }

  // 5. Native Android Splash Screens
  console.log('📦 5. Generating Native Android Splash Screens...');
  const splashes = [
    { file: 'android/app/src/main/res/drawable/splash.png', w: 480, h: 320, logo: 120 },
    { file: 'android/app/src/main/res/drawable-port-mdpi/splash.png', w: 320, h: 480, logo: 110 },
    { file: 'android/app/src/main/res/drawable-port-hdpi/splash.png', w: 480, h: 800, logo: 160 },
    { file: 'android/app/src/main/res/drawable-port-xhdpi/splash.png', w: 720, h: 1280, logo: 240 },
    { file: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png', w: 960, h: 1600, logo: 320 },
    { file: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png', w: 1280, h: 1920, logo: 400 },
    { file: 'android/app/src/main/res/drawable-land-mdpi/splash.png', w: 480, h: 320, logo: 110 },
    { file: 'android/app/src/main/res/drawable-land-hdpi/splash.png', w: 800, h: 480, logo: 160 },
    { file: 'android/app/src/main/res/drawable-land-xhdpi/splash.png', w: 1280, h: 720, logo: 220 },
    { file: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png', w: 1600, h: 960, logo: 280 },
    { file: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png', w: 1920, h: 1280, logo: 340 },
  ];

  for (const s of splashes) {
    const parentDir = path.dirname(s.file);
    if (!fs.existsSync(parentDir)) continue;

    const splashLogo = await sharp(svgBuffer, { density: 600 })
      .resize(s.logo, s.logo, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: s.w,
        height: s.h,
        channels: 4,
        background: { r: 11, g: 37, b: 69, alpha: 1 } // #0B2545 Midnight Navy
      }
    })
    .composite([{ input: splashLogo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(s.file);

    console.log(`✅ Generated ${s.file} (${s.w}x${s.h})`);
  }

  console.log('🎉 All Android, iOS, PWA, and Web assets generated with 100% vector precision and zero shattered edges!');
}

generateAllAssets().catch((err) => {
  console.error('❌ Error generating assets:', err);
  process.exit(1);
});
