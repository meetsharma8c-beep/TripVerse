import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAppIcons() {
  const logoPath = 'public/tripverse-mark-vibrant.png';
  fs.mkdirSync('public/icons', { recursive: true });

  console.log('Generating crisp app icons from authentic brand logo...');

  const sizes = [
    { name: 'public/icons/icon-192.png', size: 192, iconSize: 136 },
    { name: 'public/icons/icon-512.png', size: 512, iconSize: 364 },
    { name: 'public/icons/icon-maskable.png', size: 512, iconSize: 300 },
    { name: 'public/apple-touch-icon.png', size: 180, iconSize: 128 },
    { name: 'public/favicon.png', size: 192, iconSize: 140 },
    { name: 'public/favicon-32x32.png', size: 32, iconSize: 26 },
    { name: 'public/favicon-16x16.png', size: 16, iconSize: 14 },
  ];

  for (const item of sizes) {
    const resizedLogo = await sharp(logoPath)
      .resize(item.iconSize, item.iconSize, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: 'lanczos3'
      })
      .sharpen({ sigma: 1.0, m1: 1.2, m2: 0.5 })
      .toBuffer();

    await sharp({
      create: {
        width: item.size,
        height: item.size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // #FFFFFF Pure White
      }
    })
    .composite([
      {
        input: resizedLogo,
        gravity: 'center'
      }
    ])
    .png({ compressionLevel: 9 })
    .toFile(item.name);

    console.log(`Generated ${item.name}`);
  }

  // Generate Android native mipmaps from authentic brand mark
  const mipmaps = [
    { dir: 'mipmap-mdpi', iconSize: 48, fgSize: 108, markSize: 72 },
    { dir: 'mipmap-hdpi', iconSize: 72, fgSize: 162, markSize: 108 },
    { dir: 'mipmap-xhdpi', iconSize: 96, fgSize: 216, markSize: 144 },
    { dir: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324, markSize: 216 },
    { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432, markSize: 288 },
  ];

  for (const m of mipmaps) {
    const targetDir = path.join('android/app/src/main/res', m.dir);
    if (!fs.existsSync(targetDir)) continue;

    // Foreground icon
    const fgMark = await sharp(logoPath)
      .resize(m.markSize, m.markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .sharpen({ sigma: 1.0, m1: 1.2, m2: 0.5 })
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

    // Legacy standard icon
    const legMarkSize = Math.round(m.iconSize * 0.72);
    const legMark = await sharp(logoPath)
      .resize(legMarkSize, legMarkSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
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

    // Legacy round icon
    const circleSvg = Buffer.from(
      `<svg width="${m.iconSize}" height="${m.iconSize}"><circle cx="${m.iconSize / 2}" cy="${m.iconSize / 2}" r="${m.iconSize / 2}" fill="#FFFFFF"/></svg>`
    );
    const roundBg = await sharp(circleSvg).png().toBuffer();

    await sharp(roundBg)
      .composite([{ input: legMark, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    console.log(`Generated Android ${m.dir} icons`);
  }

  console.log('All icons generated successfully with authentic brand mark!');
}

generateAppIcons().catch(console.error);
