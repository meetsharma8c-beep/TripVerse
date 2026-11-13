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

  // Base squircle plate: 1024x1024 with rx=224, soft mint tint gradient
  const squircleBaseSvg = Buffer.from(`
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="plateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="75%" stop-color="#FFFFFF" />
          <stop offset="100%" stop-color="#F0FDF4" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1024" height="1024" rx="224" fill="url(#plateGrad)" />
    </svg>
  `);

  // Unclipped green logo sized to 800x800, centered at (112, 112)
  const logo800 = await sharp(logoPath).resize(800, 800).toBuffer();
  const iconBase = await sharp(squircleBaseSvg)
    .composite([{ input: logo800, left: 112, top: 112 }])
    .png()
    .toBuffer();

  console.log('✨ [2/5] Designing Option 1: Circular Corner Badge on bottom-right corner curve...');
  // The Circular Corner Badge is positioned at cx=875, cy=875 directly on the bottom-right corner curve.
  // It features an outer white rim, emerald ring, dark forest core, and the official Google Gemini star.
  const cornerBadgeSvg = Buffer.from(`
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1A73E8" />
          <stop offset="30%" stop-color="#3B82F6" />
          <stop offset="55%" stop-color="#8B5CF6" />
          <stop offset="80%" stop-color="#F43F5E" />
          <stop offset="100%" stop-color="#06B6D4" />
        </linearGradient>
        <linearGradient id="chipBg1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#082013" />
          <stop offset="100%" stop-color="#133F26" />
        </linearGradient>
        <filter id="cornerSh1" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.4" />
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#10B981" flood-opacity="0.3" />
        </filter>
      </defs>

      <g transform="translate(875, 875)" filter="url(#cornerSh1)">
        <!-- Crisp White outer border -->
        <circle cx="0" cy="0" r="98" fill="#FFFFFF" />
        <!-- Vivid Emerald ring -->
        <circle cx="0" cy="0" r="88" fill="#10B981" />
        <!-- Dark forest core -->
        <circle cx="0" cy="0" r="80" fill="url(#chipBg1)" />

        <!-- Gemini 4-pointed Star -->
        <path d="M 0 -54 C 0 -12, 12 0, 54 0 C 12 0, 0 12, 0 54 C 0 12, -12 0, -54 0 C -12 0, 0 -12, 0 -54 Z" fill="url(#gGrad1)" />
        <circle cx="0" cy="0" r="8" fill="#FFFFFF" />

        <!-- Small companion star -->
        <g transform="translate(34, -34)">
          <path d="M 0 -20 C 0 -4, 4 0, 20 0 C 4 0, 0 4, 0 20 C 0 4, -4 0, -20 0 C -4 0, 0 -4, 0 -20 Z" fill="#38BDF8" />
        </g>
      </g>
    </svg>
  `);

  const appIcon1024 = await sharp(iconBase)
    .composite([{ input: cornerBadgeSvg }])
    .png({ quality: 98 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'tripverse-app-icon-ai.png'), appIcon1024);
  fs.writeFileSync(path.join(brandingDir, 'tripverse-app-icon-ai.png'), appIcon1024);
  console.log('✅ Saved public/tripverse-app-icon-ai.png (1024x1024)');

  console.log('✨ [3/5] Generating 1200x630 OpenGraph Banner with centered badged app logo...');
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

  const shadowSvg = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="cardSh" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="22" />
          <feOffset dx="0" dy="18" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.55" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
          </feMerge>
        </filter>
      </defs>
      <rect x="370" y="85" width="460" height="460" rx="102" fill="#000000" filter="url(#cardSh)" />
    </svg>
  `);

  const iconCard = await sharp(appIcon1024)
    .resize(460, 460)
    .toBuffer();

  const ogBannerPng = await sharp(darkCanvas)
    .composite([
      { input: shadowSvg },
      { input: iconCard, left: 370, top: 85 }
    ])
    .png({ quality: 95 })
    .toBuffer();

  const ogBannerPngPath = path.join(publicDir, 'og-banner.png');
  fs.writeFileSync(ogBannerPngPath, ogBannerPng);
  console.log('✅ Generated public/og-banner.png (1200x630,', ogBannerPng.length, 'bytes)');

  console.log('✨ [4/5] Generating public/og-banner.svg with embedded artwork...');
  const base64Png = ogBannerPng.toString('base64');
  const svgOutput = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <!-- TripVerse Official Social OpenGraph Banner with Badged Gemini Star Logo -->
  <image width="1200" height="630" href="data:image/png;base64,${base64Png}" />
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'og-banner.svg'), svgOutput, 'utf8');
  console.log('✅ Saved public/og-banner.svg');

  console.log('✨ [5/5] All branding assets successfully generated with Option 1 Corner Badge!');
}

generateAll().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
