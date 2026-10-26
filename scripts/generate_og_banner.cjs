const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgBanner = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070F0B" />
      <stop offset="50%" stop-color="#0E2319" />
      <stop offset="100%" stop-color="#143425" />
    </linearGradient>

    <radialGradient id="emeraldAura" cx="30%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.32" />
      <stop offset="60%" stop-color="#059669" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#047857" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="goldGlow" cx="80%" cy="20%" r="50%">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.25" />
      <stop offset="70%" stop-color="#D97706" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="cyanAura" cx="85%" cy="85%" r="55%">
      <stop offset="0%" stop-color="#06B6D4" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#0891B2" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="badgeBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#059669" stop-opacity="0.2" />
    </linearGradient>

    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A3326" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#0D2016" stop-opacity="0.9" />
    </linearGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#emeraldAura)" />
  <rect width="1200" height="630" fill="url(#goldGlow)" />
  <rect width="1200" height="630" fill="url(#cyanAura)" />

  <!-- Subtle Grid Accent -->
  <g opacity="0.07" stroke="#34D399" stroke-width="1">
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

  <!-- Left Content Column -->
  <g transform="translate(80, 80)">
    <!-- Pill Category Badge -->
    <rect x="0" y="0" width="220" height="40" rx="20" fill="#143425" stroke="url(#badgeBorder)" stroke-width="1.5" />
    <circle cx="22" cy="20" r="5" fill="#34D399" />
    <text x="36" y="25" fill="#A7F3D0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" letter-spacing="1">NEXT-GEN TRAVEL</text>

    <!-- Main Title -->
    <text x="0" y="115" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="900" letter-spacing="-1">
      <tspan fill="#FFFFFF">Trip</tspan><tspan fill="#34D399">Verse</tspan>
    </text>

    <!-- Subtitle / Tagline -->
    <text x="0" y="170" fill="#E2E8F0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700">
      Plan Smarter. Travel Further.
    </text>

    <!-- Description -->
    <text x="0" y="225" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="500">
      <tspan x="0" dy="0">Instant day-by-day smart itineraries, live road routes,</tspan>
      <tspan x="0" dy="28">budget intelligence, and verified place exploration.</tspan>
    </text>

    <!-- Feature Pills -->
    <g transform="translate(0, 310)">
      <g transform="translate(0, 0)">
        <rect width="180" height="42" rx="10" fill="#0E2319" stroke="#10B981" stroke-opacity="0.3" stroke-width="1" />
        <text x="90" y="26" text-anchor="middle" fill="#6EE7B7" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="600">✨ AI Trip Wizard</text>
      </g>
      <g transform="translate(195, 0)">
        <rect width="180" height="42" rx="10" fill="#0E2319" stroke="#10B981" stroke-opacity="0.3" stroke-width="1" />
        <text x="90" y="26" text-anchor="middle" fill="#6EE7B7" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="600">🗺️ Live Routing</text>
      </g>
      <g transform="translate(390, 0)">
        <rect width="180" height="42" rx="10" fill="#0E2319" stroke="#10B981" stroke-opacity="0.3" stroke-width="1" />
        <text x="90" y="26" text-anchor="middle" fill="#6EE7B7" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="600">💰 Budget Tracker</text>
      </g>
    </g>

    <!-- URL Indicator -->
    <text x="0" y="440" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="16" font-weight="600">
      🚀 https://tripverse-pied.vercel.app
    </text>
  </g>

  <!-- Right Visual / Glassmorphic Card -->
  <g transform="translate(730, 95)" filter="url(#shadow)">
    <!-- Main Card Body -->
    <rect width="390" height="440" rx="24" fill="url(#cardBg)" stroke="#34D399" stroke-opacity="0.3" stroke-width="1.5" />

    <!-- Card Header / Itinerary Preview -->
    <rect x="24" y="24" width="342" height="150" rx="16" fill="#143425" />
    <circle cx="50" cy="50" r="16" fill="#10B981" fill-opacity="0.2" />
    <text x="50" y="55" text-anchor="middle" fill="#34D399" font-size="14" font-weight="bold">📍</text>
    <text x="76" y="52" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="16" font-weight="700">7-Day Scenic Expedition</text>
    <text x="76" y="70" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="500">Goa • Gokarna • Karwar Coastal Circuit</text>

    <rect x="40" y="98" width="145" height="32" rx="8" fill="#0A1811" />
    <text x="112" y="119" text-anchor="middle" fill="#34D399" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600">Budget: ₹32,000</text>

    <rect x="195" y="98" width="155" height="32" rx="8" fill="#0A1811" />
    <text x="272" y="119" text-anchor="middle" fill="#FBBF24" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600">⭐ 4.9 (184 reviews)</text>

    <!-- Timeline items -->
    <g transform="translate(30, 205)">
      <circle cx="16" cy="16" r="12" fill="#10B981" />
      <text x="16" y="20" text-anchor="middle" fill="#070F0B" font-size="11" font-weight="bold">1</text>
      <text x="40" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700">Arrival &amp; Sunset Cruiser</text>
      <text x="40" y="32" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">Check-in, private beach dinner</text>
    </g>

    <g transform="translate(30, 265)">
      <circle cx="16" cy="16" r="12" fill="#34D399" />
      <text x="16" y="20" text-anchor="middle" fill="#070F0B" font-size="11" font-weight="bold">2</text>
      <text x="40" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700">Heritage Forts &amp; Secret Cliffs</text>
      <text x="40" y="32" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">Scenic coastal drive &amp; photography</text>
    </g>

    <g transform="translate(30, 325)">
      <circle cx="16" cy="16" r="12" fill="#6EE7B7" />
      <text x="16" y="20" text-anchor="middle" fill="#070F0B" font-size="11" font-weight="bold">3</text>
      <text x="40" y="16" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700">Deep Waters &amp; Island Trail</text>
      <text x="40" y="32" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">Scuba diving, dolphin safari</text>
    </g>

    <!-- Bottom Action Pill inside card -->
    <rect x="24" y="380" width="342" height="38" rx="10" fill="#10B981" />
    <text x="195" y="404" text-anchor="middle" fill="#070F0B" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="800">EXPERIENCE ON TRIPVERSE →</text>
  </g>
</svg>`;

async function run() {
  const publicDir = path.resolve(__dirname, '..', 'public');
  const svgPath = path.join(publicDir, 'og-banner.svg');
  const pngPath = path.join(publicDir, 'og-banner.png');

  fs.writeFileSync(svgPath, svgBanner, 'utf8');
  console.log('Saved og-banner.svg');

  await sharp(Buffer.from(svgBanner))
    .png({ quality: 95 })
    .toFile(pngPath);

  console.log('Generated pristine 1200x630 og-banner.png');
}

run().catch(console.error);
