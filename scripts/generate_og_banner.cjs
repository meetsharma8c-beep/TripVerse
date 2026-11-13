const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateAll() {
  const publicDir = path.resolve(__dirname, '..', 'public');
  const brandingDir = path.join(publicDir, 'branding');

  // Ensure directories exist
  if (!fs.existsSync(brandingDir)) {
    fs.mkdirSync(brandingDir, { recursive: true });
  }

  console.log('✨ [1/5] Extracting clean squircle base from official app icon...');
  // 1. Clean squircle plate from branding/tripverse-app-icon.png
  // Mask out any pre-baked outer fringe (x: 80, y: 80, w: 864, h: 864, rx: 190)
  const squircleMask = Buffer.from(`
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect x="80" y="80" width="864" height="864" rx="190" fill="#FFFFFF" />
    </svg>
  `);

  const squirclePlate = await sharp(path.join(brandingDir, 'tripverse-app-icon.png'))
    .composite([{ input: squircleMask, blend: 'dest-in' }])
    .extract({ left: 80, top: 80, width: 864, height: 864 })
    .resize(1024, 1024)
    .png()
    .toBuffer();

  console.log('✨ [2/5] Creating Small AI Badge for lower-right corner...');
  // 2. Small AI Badge placed in right lower corner (center around x: 805, y: 805)
  const badgeSvg = Buffer.from(`
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="badgeGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.4" />
          <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#10B981" flood-opacity="0.4" />
        </filter>
        <linearGradient id="badgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#064E3B" />
          <stop offset="40%" stop-color="#047857" />
          <stop offset="100%" stop-color="#065F46" />
        </linearGradient>
        <linearGradient id="badgeRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6EE7B7" />
          <stop offset="50%" stop-color="#34D399" />
          <stop offset="100%" stop-color="#10B981" />
        </linearGradient>
        <linearGradient id="starGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="100%" stop-color="#E0F2FE" />
        </linearGradient>
      </defs>

      <g transform="translate(805, 805)" filter="url(#badgeGlow)">
        <!-- Crisp White Outer Lip for maximum contrast -->
        <circle cx="0" cy="0" r="144" fill="#FFFFFF" />
        <!-- Vivid Emerald Rim -->
        <circle cx="0" cy="0" r="132" fill="url(#badgeRim)" />
        <!-- Dark Emerald Brand Core -->
        <circle cx="0" cy="0" r="120" fill="url(#badgeBg)" />

        <!-- 4-point Sparkle Star -->
        <g transform="translate(-46, -3) scale(1.68)">
          <path d="M0 -22 C0 -6 6 0 22 0 C6 0 0 6 0 22 C0 6 -6 0 -22 0 C-6 0 0 -6 0 -22 Z" fill="url(#starGlow)" />
          <path d="M15 -15 C15 -10 17 -8 22 -8 C17 -8 15 -6 15 0 C15 -6 13 -8 8 -8 C13 -8 15 -10 15 -15 Z" fill="#FDE047" />
        </g>
        <!-- 'AI' Typography -->
        <text x="30" y="22" text-anchor="middle" fill="#FFFFFF" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="68" font-weight="900" letter-spacing="1">AI</text>
      </g>
    </svg>
  `);

  const badgedIcon1024 = await sharp(squirclePlate)
    .composite([{ input: badgeSvg }])
    .png({ quality: 98 })
    .toBuffer();

  // Save 1024x1024 square icon assets
  const appIconAiPath = path.join(publicDir, 'tripverse-app-icon-ai.png');
  const brandingAppIconAiPath = path.join(brandingDir, 'tripverse-app-icon-ai.png');
  fs.writeFileSync(appIconAiPath, badgedIcon1024);
  fs.writeFileSync(brandingAppIconAiPath, badgedIcon1024);
  console.log('✅ Saved public/tripverse-app-icon-ai.png (1024x1024)');

  console.log('✨ [3/5] Generating 1200x630 OpenGraph Banner with centered badged app logo...');
  // 3. Create 460x460 scaled icon for the 1200x630 banner
  const icon460 = await sharp(badgedIcon1024)
    .resize(460, 460)
    .toBuffer();

  const shadowSvg = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="cardSh" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="20" />
          <feOffset dx="0" dy="16" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
          </feMerge>
        </filter>
      </defs>
      <rect x="370" y="85" width="460" height="460" rx="102" fill="#000000" filter="url(#cardSh)" />
    </svg>
  `);

  const darkCanvas = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="darkBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06140C" />
          <stop offset="50%" stop-color="#0B2618" />
          <stop offset="100%" stop-color="#113723" />
        </linearGradient>
        <radialGradient id="haloCenter" cx="50%" cy="50%" r="45%">
          <stop offset="0%" stop-color="#10B981" stop-opacity="0.32" />
          <stop offset="50%" stop-color="#059669" stop-opacity="0.10" />
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

      <!-- Minimal clean grid -->
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
    .composite([
      { input: shadowSvg },
      { input: icon460, left: 370, top: 85 }
    ])
    .png({ quality: 95 })
    .toBuffer();

  const ogBannerPngPath = path.join(publicDir, 'og-banner.png');
  fs.writeFileSync(ogBannerPngPath, ogBannerPng);
  console.log('✅ Generated public/og-banner.png (1200x630,', ogBannerPng.length, 'bytes)');

  console.log('✨ [4/5] Generating public/og-banner.svg with embedded artwork...');
  // 4. Generate standalone vector SVG version
  const base64Png = ogBannerPng.toString('base64');
  const svgOutput = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <!-- TripVerse Official Social OpenGraph Banner with Badged AI Logo -->
  <image width="1200" height="630" href="data:image/png;base64,${base64Png}" />
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'og-banner.svg'), svgOutput, 'utf8');
  console.log('✅ Saved public/og-banner.svg');

  console.log('✨ [5/5] All branding assets successfully generated!');
}

generateAll().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
