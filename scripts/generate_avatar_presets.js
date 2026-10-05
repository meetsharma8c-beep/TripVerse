import fs from 'fs';

const presets = [
  {
    file: 'public/avatars/explorer.svg',
    bg1: '#103766', bg2: '#0B2545',
    accent1: '#00D287', accent2: '#00A86B',
    badgeColor: '#00D287',
    iconPath: 'M145 133 L148 142 L157 145 L148 148 L145 157 L142 148 L133 145 L142 142 Z' // Compass star
  },
  {
    file: 'public/avatars/mountains.svg',
    bg1: '#0D2B45', bg2: '#06172D',
    accent1: '#38BDF8', accent2: '#0284C7',
    badgeColor: '#38BDF8',
    iconPath: 'M136 153 L145 137 L154 153 Z M144 153 L149 143 L154 153 Z' // Mountain
  },
  {
    file: 'public/avatars/coastal.svg',
    bg1: '#064E3B', bg2: '#022C22',
    accent1: '#34D399', accent2: '#059669',
    badgeColor: '#34D399',
    iconPath: 'M135 145 Q145 135 155 145 Q145 155 135 145 Z' // Wave / Leaf
  },
  {
    file: 'public/avatars/roadtripper.svg',
    bg1: '#431407', bg2: '#1C0A00',
    accent1: '#F59E0B', accent2: '#D97706',
    badgeColor: '#F59E0B',
    iconPath: 'M135 140 H155 V150 H135 Z M139 150 A3 3 0 1 1 139 156 A3 3 0 1 1 139 150 M151 150 A3 3 0 1 1 151 156 A3 3 0 1 1 151 150' // Road car
  },
  {
    file: 'public/avatars/navigator.svg',
    bg1: '#311042', bg2: '#1A0624',
    accent1: '#A855F7', accent2: '#7E22CE',
    badgeColor: '#A855F7',
    iconPath: 'M145 133 L149 141 L157 145 L149 149 L145 157 L141 149 L133 145 L141 141 Z' // Sparkle
  }
];

for (const p of presets) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.bg1}" />
      <stop offset="100%" stop-color="${p.bg2}" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.accent1}" />
      <stop offset="100%" stop-color="${p.accent2}" />
    </linearGradient>
  </defs>

  <rect width="200" height="200" rx="56" fill="url(#bgGrad)" />
  <circle cx="100" cy="100" r="86" fill="none" stroke="url(#accentGrad)" stroke-width="2" stroke-opacity="0.3" stroke-dasharray="6 4" />
  <circle cx="100" cy="85" r="45" fill="${p.accent1}" opacity="0.12" />

  <!-- Head -->
  <circle cx="100" cy="82" r="32" fill="#F1F5F9" />
  <path d="M72 74 C72 60, 128 60, 128 74 C118 70, 82 70, 72 74 Z" fill="url(#accentGrad)" />

  <!-- Body -->
  <path d="M46 166 C46 128, 70 122, 100 122 C130 122, 154 128, 154 166 C140 178, 60 178, 46 166 Z" fill="#E2E8F0" />
  <path d="M85 124 L100 148 L115 124" fill="none" stroke="${p.bg2}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Persona Badge -->
  <circle cx="145" cy="145" r="19" fill="${p.bg2}" stroke="${p.badgeColor}" stroke-width="2.5" />
  <path d="${p.iconPath}" fill="url(#accentGrad)" />
</svg>`;

  fs.writeFileSync(p.file, svg);
  console.log(`Wrote ${p.file}`);
}
console.log('Avatar presets generated successfully!');
