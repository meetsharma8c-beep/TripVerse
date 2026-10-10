import sharp from 'sharp';

async function generateAppleSplash() {
  const logoPath = 'public/tripverse-mark-vibrant.png';
  
  // High resolution universal iOS startup image (1179 x 2556 - iPhone 15/16 Pro standard)
  const width = 1179;
  const height = 2556;
  const logoSize = 340;

  const resizedLogo = await sharp(logoPath)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
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
  .png()
  .toFile('public/apple-splash-screen.png');

  console.log('Generated public/apple-splash-screen.png successfully!');
}

generateAppleSplash().catch(console.error);
