const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateAll() {
  const publicDir = path.resolve(__dirname, '..', 'public');
  const brandingDir = path.join(publicDir, 'branding');

  if (!fs.existsSync(brandingDir)) {
    fs.mkdirSync(brandingDir, { recursive: true });
  }

  console.log('✨ [1/5] Loading original unclipped 1024x1024 3D transparent TripVerse logo...');
  const logoPath = path.join(publicDir, 'tripverse-logo-transparent-1024.png');

  console.log('✨ [2/5] Designing small official Google Gemini star logo for right lower corner...');
  // The Gemini star is positioned at cx=775, cy=735 where zero green logo pixels exist.
  // It features the official Google Gemini 4-point star curve and electric blue-purple-pink-cyan gradient.
  const geminiStarSvg = Buffer.from(`
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Official Google Gemini Gradient -->
        <linearGradient id="geminiVibrant" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1A73E8" />
          <stop offset="30%" stop-color="#3B82F6" />
          <stop offset="55%" stop-color="#8B5CF6" />
          <stop offset="80%" stop-color="#F43F5E" />
          <stop offset="100%" stop-color="#06B6D4" />
        </linearGradient>
        <filter id="geminiDrop" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.35" />
        </filter>
      </defs>

      <g transform="translate(775, 735)" filter="url(#geminiDrop)">
        <!-- Crisp White outer outline for definition on any background -->
        <path d="M 0 -72 C 0 -16, 16 0, 72 0 C 16 0, 0 16, 0 72 C 0 16, -16 0, -72 0 C -16 0, 0 -16, 0 -72 Z" fill="#FFFFFF" />
        <!-- Vibrant Gemini Core Star -->
        <path d="M 0 -64 C 0 -14, 14 0, 64 0 C 14 0, 0 14, 0 64 C 0 14, -14 0, -64 0 C -14 0, 0 -14, 0 -64 Z" fill="url(#geminiVibrant)" />
        <circle cx="0" cy="0" r="10" fill="#FFFFFF" />

        <!-- Small companion star (classic Google Gemini duo) -->
        <g transform="translate(48, -48)">
          <path d="M 0 -26 C 0 -6, 6 0, 26 0 C 6 0, 0 6, 0 26 C 0 6, -6 0, -26 0 C -6 0, 0 -6, 0 -26 Z" fill="#FFFFFF" />
          <path d="M 0 -22 C 0 -5, 5 0, 22 0 C 5 0, 0 5, 0 22 C 0 5, -5 0, -22 0 C -5 0, 0 -5, 0 -22 Z" fill="#06B6D4" />
        </g>
      </g>
    </svg>
  `);

  // Master unclipped 1024x1024 transparent logo with small Gemini star
  const masterGeminiLogo1024 = await sharp(logoPath)
    .composite([{ input: geminiStarSvg }])
    .png({ quality: 100 })
    .toBuffer();

  // Save transparent PNG
  fs.writeFileSync(path.join(brandingDir, 'tripverse-gemini-logo-transparent.png'), masterGeminiLogo1024);
  console.log('✅ Saved public/branding/tripverse-gemini-logo-transparent.png (1024x1024 transparent)');

  console.log('✨ [3/5] Creating 1024x1024 Master App Icon with generous padding (zero clipping)...');
  // Sized 800x800 logo inside 1024x1024 squircle (rx=224, padding 112px on all sides)
  const squirclePlate1024 = Buffer.from(`
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="plateGrad1024" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="70%" stop-color="#FFFFFF" />
          <stop offset="100%" stop-color="#F0FDF4" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1024" height="1024" rx="224" fill="url(#plateGrad1024)" />
    </svg>
  `);

  const logo800 = await sharp(masterGeminiLogo1024)
    .resize(800, 800)
    .toBuffer();

  const appIcon1024 = await sharp(squirclePlate1024)
    .composite([{ input: logo800, left: 112, top: 112 }])
    .png({ quality: 98 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'tripverse-app-icon-ai.png'), appIcon1024);
  fs.writeFileSync(path.join(brandingDir, 'tripverse-app-icon-ai.png'), appIcon1024);
  console.log('✅ Saved public/tripverse-app-icon-ai.png (1024x1024 squircle)');

  console.log('✨ [4/5] Generating 1200x630 OpenGraph Banner with unclipped logo & Gemini star...');
  // Banner squircle card: 450x450 squircle with 360x360 logo centered inside (padding 60px on all sides, zero clipping)
  const bannerSquirclePlate = Buffer.from(`
    <svg width="480" height="480" viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="75%" stop-color="#FFFFFF" />
          <stop offset="100%" stop-color="#F0FDF4" />
        </linearGradient>
        <filter id="bPlateShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="22" />
          <feOffset dx="0" dy="18" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.55" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="15" y="15" width="450" height="450" rx="102" fill="url(#bPlateGrad)" filter="url(#bPlateShadow)" />
    </svg>
  `);

  const logo360 = await sharp(masterGeminiLogo1024)
    .resize(360, 360)
    .toBuffer();

  const bannerSquircleCard = await sharp(bannerSquirclePlate)
    .composite([{ input: logo360, left: 60, top: 60 }])
    .png()
    .toBuffer();

  const darkCanvas = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="darkBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#05120B" />
          <stop offset="50%" stop-color="#0A2417" />
          <stop offset="100%" stop-color="#0F3622" />
        </linearGradient>
        <radialGradient id="haloCenter" cx="50%" cy="50%" r="45%">
          <stop offset="0%" stop-color="#10B981" stop-opacity="0.35" />
          <stop offset="60%" stop-color="#059669" stop-opacity="0.10" />
          <stop offset="100%" stop-color="#047857" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="goldTop" cx="80%" cy="20%" r="40%">
          <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.16" />
          <stop offset="100%" stop-color="#F59E0B" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="cyanBot" cx="20%" cy="80%" r="40%">
          <stop offset="0%" stop-color="#06B6D4" stop-opacity="0.14" />
          <stop offset="100%" stop-color="#06B6D4" stop-opacity="0" />
        </radialGradient>
      </defs>

      <rect width="1200" height="630" fill="url(#darkBg)" />
      <rect width="1200" height="630" fill="url(#haloCenter)" />
      <rect width="1200" height="630" fill="url(#goldTop)" />
      <rect width="1200" height="630" fill="url(#cyanBot)" />

      <!-- Minimal ambient grid lines -->
      <g opacity="0.04" stroke="#34D399" stroke-width="1">
        <line x1="0" y1="105" x2="1200" y2="105" />
        <line x1="0" y1="210" x2="1200" y2="210" />
        <line x1="0" y1="315" x2="1200" y2="315" />
        <line x1="0" y1="420" x2="1200" y2="420" />
        <line x1="0" y1="525" x2="1200" y2="525" />
        <line x1="200" y1="0" x2="200" y2="630" />
        <line x1="400" y1="0" x2="400" y2="630" />
        <line x1="600" y1="0" x2="600" y2="630" />
        <line x1="800" y1="0" x2="800" y2="630" />
        <line x1="1000" y1="0" x2="1000" y2="630" />
      </g>
    </svg>
  `);

  const ogBannerPng = await sharp(darkCanvas)
    .composite([{ input: bannerSquircleCard, left: 360, top: 75 }])
    .png({ quality: 95 })
    .toBuffer();

  const ogBannerPngPath = path.join(publicDir, 'og-banner.png');
  fs.writeFileSync(ogBannerPngPath, ogBannerPng);
  console.log('✅ Generated public/og-banner.png (1200x630,', ogBannerPng.length, 'bytes)');

  console.log('✨ [5/5] Generating public/og-banner.svg with embedded artwork...');
  const base64Png = ogBannerPng.toString('base64');
  const svgOutput = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <!-- TripVerse Official Social OpenGraph Banner with Unclipped Logo & Small Gemini Star -->
  <image width="1200" height="630" href="data:image/png;base64,${base64Png}" />
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'og-banner.svg'), svgOutput, 'utf8');
  console.log('✅ Saved public/og-banner.svg');

  console.log('🎉 All branding assets successfully generated with zero clipping & Gemini star logo!');
}

generateAll().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
