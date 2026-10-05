import sharp from 'sharp';

async function analyze() {
  const inputPath = '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/.user_uploaded/media_1789797968210.png';
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  console.log('Metadata:', metadata);

  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  console.log('Info:', info);

  // Sample corner pixel colors (background)
  const getPixel = (x, y) => {
    const idx = (y * info.width + x) * info.channels;
    return [data[idx], data[idx + 1], data[idx + 2], info.channels > 3 ? data[idx + 3] : 255];
  };

  console.log('Top-left (0,0):', getPixel(0, 0));
  console.log('Top-right (w-1,0):', getPixel(info.width - 1, 0));
  console.log('Bottom-left (0,h-1):', getPixel(0, info.height - 1));
  console.log('Bottom-right (w-1,h-1):', getPixel(info.width - 1, info.height - 1));

  // Sample center logo pixel
  console.log('Center logo (150, 150):', getPixel(150, 150));
  console.log('T top-bar (150, 60):', getPixel(150, 60));
  console.log('Airplane (320, 110):', getPixel(320, 110));
}

analyze().catch(console.error);
