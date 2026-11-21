#!/usr/bin/env node
/**
 * TripVerse Build-Time Technical & Programmatic SEO Generator
 *
 * Runs right after `vite build` to turn the SPA into a crawl-first multi-page SEO site:
 *  1. Pre-renders unique, self-canonicalized static HTML pages for ALL destinations
 *     in `src/data/destinations.ts` (`dist/destination/<slug>/index.html`) with
 *     TouristDestination + BreadcrumbList + FAQPage JSON-LD and rich internal links.
 *  2. Pre-renders `/explore`, `/ai-trip-planner`, and `/road-trip-planner` landing pages.
 *  3. Regenerates `public/sitemap.xml` & `dist/sitemap.xml` (with Image Sitemap entries
 *     and excluding thin/private auth routes like /trips, /saved, /profile).
 *  4. Generates `public/llms.txt` & `dist/llms.txt` for AI Search engines (ChatGPT Search,
 *     Perplexity, Claude, Google AI Overviews).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITE_ORIGIN = 'https://trip-verse.com';
const TODAY = new Date().toISOString().slice(0, 10);

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function loadDestinations() {
  const sourcePath = path.join(ROOT, 'src', 'data', 'destinations.ts');
  const rawTs = fs.readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(rawTs, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const mod = { exports: {} };
  const fn = new Function('exports', 'require', 'module', transpiled.outputText);
  fn(mod.exports, () => ({}), mod);
  const list = mod.exports.POPULAR_DESTINATIONS;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Could not parse POPULAR_DESTINATIONS from src/data/destinations.ts');
  }
  return list;
}

function formatInrApprox(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return '₹25,000';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatUsdApprox(inrAmount) {
  if (!Number.isFinite(inrAmount) || inrAmount <= 0) return '$300';
  return `$${Math.max(120, Math.round(inrAmount / 84 / 10) * 10).toLocaleString('en-US')}`;
}

function buildPageHtml(baseHtml, config) {
  const {
    title,
    description,
    canonicalPath,
    ogImage = `${SITE_ORIGIN}/og-banner.png?v=5`,
    ogImageAlt = title,
    jsonLdGraph,
    noscriptHtml,
    keywords,
  } = config;

  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath === '/' ? '/' : canonicalPath}`;
  let html = baseHtml;

  // Replace <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  // Replace meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );

  if (keywords) {
    html = html.replace(
      /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="keywords" content="${escapeHtml(keywords)}" />`
    );
  }

  // Replace canonical + hreflang
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
  );
  html = html.replace(
    /<link\s+rel="alternate"\s+hreflang="x-default"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}" />`
  );
  html = html.replace(
    /<link\s+rel="alternate"\s+hreflang="en"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="en" href="${escapeHtml(canonicalUrl)}" />`
  );
  html = html.replace(
    /<link\s+rel="alternate"\s+hreflang="en-IN"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="en-IN" href="${escapeHtml(canonicalUrl)}" />`
  );
  html = html.replace(
    /<link\s+rel="alternate"\s+hreflang="en-US"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="en-US" href="${escapeHtml(canonicalUrl)}" />`
  );

  // Replace Open Graph tags
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(title)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image:secure_url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:alt" content="${escapeHtml(ogImageAlt)}" />`
  );

  // Replace Twitter Card tags
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
  );

  // Replace JSON-LD Structured Data
  if (jsonLdGraph) {
    const jsonLd = JSON.stringify(
      { '@context': 'https://schema.org', '@graph': jsonLdGraph },
      null,
      2
    ).replace(/<\/script>/gi, '<\\/script>');
    html = html.replace(
      /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
      `<script type="application/ld+json">\n${jsonLd}\n    </script>`
    );
  }

  // Replace ONLY the body crawler <noscript> shell (never the Google Fonts <noscript> inside <head>!)
  if (noscriptHtml) {
    html = html.replace(
      /<!--\s*SEO_NOSCRIPT_START\s*-->[\s\S]*?<!--\s*SEO_NOSCRIPT_END\s*-->/i,
      `<!-- SEO_NOSCRIPT_START -->\n    <noscript>\n${noscriptHtml}\n    </noscript>\n    <!-- SEO_NOSCRIPT_END -->`
    );
  }

  return html;
}

function writePage(relativeDir, html) {
  const outDir = path.join(DIST_DIR, relativeDir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
}

function buildDestinationPages(baseHtml, destinations) {
  for (const dest of destinations) {
    const slug = dest.id;
    const canonicalPath = `/destination/${slug}`;
    const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
    const countryLabel = dest.country || 'India';
    const locationLabel = dest.state && dest.state !== dest.name
      ? `${dest.name}, ${dest.state}, ${countryLabel}`
      : `${dest.name}, ${countryLabel}`;
    const topPlaces = (dest.popularActivities || []).slice(0, 3).join(', ');
    const budgetInr = formatInrApprox(dest.startBudget);
    const budgetUsd = formatUsdApprox(dest.startBudget);

    const title = `${dest.name} Trip Itinerary & Travel Guide (${dest.recommendedDuration || '3-5 Days'}) — Best Places & Budget | TripVerse`;
    const description = `Plan your ${dest.name} (${countryLabel}) trip in seconds with TripVerse AI. Explore ${topPlaces || 'top attractions'}, ideal ${dest.recommendedDuration || '4-day'} itinerary, best time (${dest.bestTime || 'Year-round'}), routes, and budget starting around ${budgetInr} (${budgetUsd}).`;
    const keywords = [
      `${dest.name} trip`,
      `${dest.name} itinerary`,
      `${dest.name} travel guide`,
      `things to do in ${dest.name}`,
      `${dest.name} budget`,
      `best time to visit ${dest.name}`,
      `${dest.name} road trip`,
      `${countryLabel} trip planner`,
      'TripVerse AI trip planner',
    ].join(', ');

    // Related destinations in same continent or category for strong internal linking
    const related = destinations
      .filter((d) => d.id !== dest.id && (d.continent === dest.continent || d.category === dest.category))
      .slice(0, 8);

    const jsonLdGraph = [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Explore Destinations', item: `${SITE_ORIGIN}/explore` },
          { '@type': 'ListItem', position: 3, name: `${dest.name} Travel Guide`, item: canonicalUrl },
        ],
      },
      {
        '@type': 'TouristDestination',
        '@id': `${canonicalUrl}#destination`,
        name: dest.name,
        description: dest.description,
        url: canonicalUrl,
        image: dest.image,
        touristType: [dest.category || 'leisure', 'Solo travelers', 'Couples', 'Families', 'Road trippers'],
        geo: dest.coordinates
          ? {
              '@type': 'GeoCoordinates',
              latitude: dest.coordinates.lat,
              longitude: dest.coordinates.lng,
            }
          : undefined,
        containedInPlace: {
          '@type': 'Country',
          name: countryLabel,
        },
        includesAttraction: (dest.popularActivities || []).map((place) => ({
          '@type': 'TouristAttraction',
          name: place,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `What is the best time to visit ${dest.name}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `The best time to visit ${dest.name} (${countryLabel}) is typically ${dest.bestTime || 'October to March'}, offering ideal weather for sightseeing, outdoor exploration, and local dining.`,
            },
          },
          {
            '@type': 'Question',
            name: `How many days and what budget do I need for a ${dest.name} trip?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Most travelers spend ${dest.recommendedDuration || '3 to 5 Days'} in ${dest.name}. Estimated trip budgets start around ${budgetInr} (approx. ${budgetUsd}) per traveler depending on flights, hotels, and pace. You can customize exact costs with TripVerse's free AI budget calculator.`,
            },
          },
          {
            '@type': 'Question',
            name: `What are the top places to visit in ${dest.name}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Top highlights in ${dest.name} include ${(dest.popularActivities || []).slice(0, 6).join(', ')}. TripVerse organizes these attractions into a geographic, day-by-day route automatically.`,
            },
          },
        ],
      },
    ];

    const activitiesHtml = (dest.popularActivities || [])
      .map((a) => `          <li>${escapeHtml(a)}</li>`)
      .join('\n');

    const relatedHtml = related
      .map((r) => `          <a href="${SITE_ORIGIN}/destination/${escapeHtml(r.id)}">${escapeHtml(r.name)} Trip Guide</a>`)
      .join(' •\n');

    const noscriptHtml = `      <main style="padding:2.5rem 1.5rem;max-width:920px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;line-height:1.65;">
        <nav aria-label="Breadcrumb" style="font-size:0.875rem;margin-bottom:1.25rem;color:#475569;">
          <a href="${SITE_ORIGIN}/">TripVerse Home</a> / <a href="${SITE_ORIGIN}/explore">Explore Destinations</a> / <span>${escapeHtml(dest.name)}</span>
        </nav>
        <header style="margin-bottom:2rem;">
          <h1 style="font-size:2.2rem;font-weight:800;color:#152A1C;margin-bottom:0.5rem;">${escapeHtml(dest.name)} Trip Itinerary &amp; AI Travel Guide</h1>
          <p style="font-size:1.05rem;color:#334155;">${escapeHtml(locationLabel)} — ${escapeHtml(dest.tagline || '')}</p>
          <p style="color:#334155;margin-top:0.75rem;">${escapeHtml(dest.description || '')}</p>
        </header>
        <section style="margin-bottom:2rem;">
          <h2 style="font-size:1.4rem;font-weight:700;color:#15803D;">Quick Trip Facts for ${escapeHtml(dest.name)}</h2>
          <ul>
            <li><strong>Recommended Duration:</strong> ${escapeHtml(dest.recommendedDuration || '4 Days')}</li>
            <li><strong>Best Time to Visit:</strong> ${escapeHtml(dest.bestTime || 'Year-round')}</li>
            <li><strong>Starting Budget Estimate:</strong> ${escapeHtml(budgetInr)} (approx. ${escapeHtml(budgetUsd)})</li>
            <li><strong>Travel Vibe:</strong> ${escapeHtml(dest.category || 'Explore')}</li>
          </ul>
        </section>
        <section style="margin-bottom:2rem;">
          <h2 style="font-size:1.4rem;font-weight:700;color:#15803D;">Top Places &amp; Things to Do in ${escapeHtml(dest.name)}</h2>
          <ul>
${activitiesHtml}
          </ul>
        </section>
        <section style="margin-bottom:2rem;">
          <h2 style="font-size:1.4rem;font-weight:700;color:#15803D;">Related Destination Guides</h2>
          <p>
${relatedHtml}
          </p>
        </section>
      </main>`;

    const pageHtml = buildPageHtml(baseHtml, {
      title,
      description,
      canonicalPath,
      ogImage: dest.image,
      ogImageAlt: `${dest.name} (${countryLabel}) — TripVerse Travel Guide`,
      jsonLdGraph,
      noscriptHtml,
      keywords,
    });

    writePage(path.join('destination', slug), pageHtml);
  }
}

function buildLandingPages(baseHtml, destinations) {
  // 1. /explore
  const allDestLinks = destinations
    .map(
      (d) =>
        `          <li><a href="${SITE_ORIGIN}/destination/${escapeHtml(d.id)}"><strong>${escapeHtml(d.name)}</strong> (${escapeHtml(d.country || 'India')})</a> — ${escapeHtml(d.tagline || '')} • ${escapeHtml(d.recommendedDuration || '')}</li>`
    )
    .join('\n');

  const exploreHtml = buildPageHtml(baseHtml, {
    title: 'Explore 40+ Best Travel Destinations & AI Trip Itineraries | TripVerse',
    description:
      'Discover curated travel destinations worldwide — from Paris, Tokyo, Bali, and Swiss Alps to Goa, Ladakh, Manali, Udaipur, and Kerala — with instant AI itineraries, route maps, and budgets.',
    canonicalPath: '/explore',
    keywords:
      'explore travel destinations, best vacation spots, india road trips, international trip itineraries, free travel guides, TripVerse',
    jsonLdGraph: [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Explore Destinations', item: `${SITE_ORIGIN}/explore` },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: 'Explore Travel Destinations & AI Trip Guides',
        url: `${SITE_ORIGIN}/explore`,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: destinations.length,
          itemListElement: destinations.map((d, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: `${d.name} Trip Itinerary & Travel Guide`,
            url: `${SITE_ORIGIN}/destination/${d.id}`,
          })),
        },
      },
    ],
    noscriptHtml: `      <main style="padding:2.5rem 1.5rem;max-width:960px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;line-height:1.6;">
        <h1>Explore Curated Travel Destinations &amp; Free AI Itineraries</h1>
        <p>Browse ${destinations.length} top international cities, mountain escapes, beach getaways, and scenic road trips with instant day-by-day plans on TripVerse.</p>
        <ul>
${allDestLinks}
        </ul>
      </main>`,
  });
  writePage('explore', exploreHtml);

  // 2. /ai-trip-planner
  const aiPlannerHtml = buildPageHtml(baseHtml, {
    title: 'Free AI Trip Planner & Custom Day-by-Day Itinerary Generator | TripVerse',
    description:
      'Generate a personalized day-by-day travel itinerary in seconds with TripVerse Free AI Trip Planner. Includes verified landmarks, route optimization, hotels, live weather, packing lists, and group budget splitting.',
    canonicalPath: '/ai-trip-planner',
    keywords:
      'free ai trip planner, ai itinerary generator, ai vacation planner, travel itinerary builder, smart trip planner, TripVerse',
    jsonLdGraph: [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'AI Trip Planner', item: `${SITE_ORIGIN}/ai-trip-planner` },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        name: 'TripVerse Free AI Trip Planner',
        applicationCategory: 'TravelApplication',
        operatingSystem: 'Web, iOS, Android',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        url: `${SITE_ORIGIN}/ai-trip-planner`,
      },
    ],
    noscriptHtml: `      <main style="padding:2.5rem 1.5rem;max-width:920px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;line-height:1.6;">
        <h1>Free AI Trip Planner &amp; Itinerary Generator</h1>
        <p>Plan any domestic or international trip in seconds with TripVerse AI. Choose your origin, destination, dates, travel pace, and budget to receive an interactive map, hotel picks, live weather, and offline travel dossier.</p>
        <p><a href="${SITE_ORIGIN}/explore">Browse 40+ Destination Guides</a> • <a href="${SITE_ORIGIN}/road-trip-planner">Road Trip Route Planner</a></p>
      </main>`,
  });
  writePage('ai-trip-planner', aiPlannerHtml);

  // 3. /road-trip-planner
  const roadTripHtml = buildPageHtml(baseHtml, {
    title: 'Free Road Trip Planner — Highway Routes, Fuel, EV & Scenic Pitstops | TripVerse',
    description:
      'Plan smarter highway road trips with TripVerse Road Trip Planner. Map real driving routes, EV charging stations, fuel stops, scenic viewpoints, dhabas, weather alerts, and group fuel cost splits.',
    canonicalPath: '/road-trip-planner',
    keywords:
      'road trip planner, highway route planner, road trip stops, ev charging road trip, driving itinerary planner, india road trip planner, TripVerse',
    jsonLdGraph: [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Road Trip Planner', item: `${SITE_ORIGIN}/road-trip-planner` },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        name: 'TripVerse Road Trip Route Planner',
        applicationCategory: 'TravelApplication',
        operatingSystem: 'Web, iOS, Android',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        url: `${SITE_ORIGIN}/road-trip-planner`,
      },
    ],
    noscriptHtml: `      <main style="padding:2.5rem 1.5rem;max-width:920px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;line-height:1.6;">
        <h1>Free Road Trip Route &amp; Highway Pitstop Planner</h1>
        <p>Design multi-stop road trips with real driving distances, EV &amp; fuel stops, food courts, emergency SOS lookup, and printable offline dossiers.</p>
        <p>Popular Road Trips: <a href="${SITE_ORIGIN}/destination/ladakh">Ladakh</a> • <a href="${SITE_ORIGIN}/destination/manali">Manali</a> • <a href="${SITE_ORIGIN}/destination/spiti">Spiti Valley</a> • <a href="${SITE_ORIGIN}/destination/goa">Goa</a> • <a href="${SITE_ORIGIN}/destination/swiss-alps">Swiss Alps</a></p>
      </main>`,
  });
  writePage('road-trip-planner', roadTripHtml);

  // 4. /about (Dedicated Brand Entity & Knowledge Graph Authority Page for "TripVerse")
  const aboutHtml = buildPageHtml(baseHtml, {
    title: 'About TripVerse (trip-verse.com) — AI Trip Planner by Meet Sharma',
    description:
      'TripVerse (trip-verse.com) is an independent AI Trip Planner founded by Meet Sharma for Web, iOS, and Android. Plan custom day-by-day itineraries, rail and flight routes, road trip pitstops, live weather, and group budgets across 10,000+ destinations.',
    canonicalPath: '/about',
    keywords:
      'About TripVerse, TripVerse AI Trip Planner, trip-verse.com, Meet Sharma TripVerse, TripVerse official website',
    jsonLdGraph: [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'About TripVerse', item: `${SITE_ORIGIN}/about` },
        ],
      },
      {
        '@type': 'AboutPage',
        '@id': `${SITE_ORIGIN}/about#page`,
        url: `${SITE_ORIGIN}/about`,
        name: 'About TripVerse (trip-verse.com)',
        description:
          'Official brand overview of TripVerse (trip-verse.com), the free AI trip planning platform for Web, iOS, and Android.',
        mainEntity: {
          '@type': 'Organization',
          '@id': `${SITE_ORIGIN}/#organization`,
          name: 'TripVerse',
          alternateName: 'Trip Verse',
          url: `${SITE_ORIGIN}/`,
          foundingDate: '2026',
          founder: {
            '@type': 'Person',
            name: 'Meet Sharma',
          },
          sameAs: [
            'https://twitter.com/TripVerseApp',
            'https://github.com/meetsharma8c-beep/TripVerse',
          ],
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is TripVerse (trip-verse.com)?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'TripVerse (trip-verse.com) is a free AI Trip Planner and itinerary platform for Web, iOS, and Android founded by Meet Sharma. It generates custom day-by-day travel itineraries, mode-aware train, flight, and road trip routes, live Open-Meteo weather forecasts, OpenStreetMap local food trails, and multi-currency group budgets.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is TripVerse free to use?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. TripVerse lets travelers generate unlimited personalized trip itineraries, packing checklists, route maps, and printable offline PDF guides for free at https://trip-verse.com.',
            },
          },
        ],
      },
    ],
    noscriptHtml: `      <main style="padding:2.5rem 1.5rem;max-width:920px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;line-height:1.65;">
        <nav aria-label="Breadcrumb" style="font-size:0.875rem;margin-bottom:1.25rem;color:#475569;">
          <a href="${SITE_ORIGIN}/">TripVerse Home</a> / <span>About TripVerse</span>
        </nav>
        <h1>About TripVerse — Free AI Trip Planner (trip-verse.com)</h1>
        <p><strong>TripVerse</strong> (<a href="${SITE_ORIGIN}/">https://trip-verse.com</a>) is a modern AI-powered travel planning platform founded by Meet Sharma for Web, iOS, and Android. Unlike traditional static travel agencies, TripVerse builds interactive, real-time day-by-day itineraries tailored to your transport mode (Train, Flight, Bus, or Self-Drive Road Trip), budget, dietary preference, and live weather.</p>
        <h2>Core Capabilities of TripVerse</h2>
        <ul>
          <li><strong>AI Day-by-Day Itinerary Engine:</strong> Real landmarks, realistic transit timing, and 1-click Smart Replanning for rain, date shifts, or mode changes.</li>
          <li><strong>Mode-Aware Transit Intelligence:</strong> Dedicated IRCTC rail hub logic, global flight routing, and highway road-trip pitstops only when driving.</li>
          <li><strong>Live Open Data:</strong> Open-Meteo weather forecasts, OpenStreetMap local food &amp; hidden gem discovery, and Wikipedia hands-free audio tours.</li>
          <li><strong>Multi-Currency Budgets &amp; Offline Access:</strong> Real-time currency conversion, group expense splitting, and printable offline PDF travel dossiers.</li>
        </ul>
        <p><a href="${SITE_ORIGIN}/">Start Planning on TripVerse</a> • <a href="${SITE_ORIGIN}/explore">Explore Destinations</a> • <a href="${SITE_ORIGIN}/ai-trip-planner">AI Trip Planner</a></p>
      </main>`,
  });
  writePage('about', aboutHtml);
}

function buildSitemapXml(destinations) {
  const staticEntries = [
    {
      loc: `${SITE_ORIGIN}/`,
      priority: '1.0',
      changefreq: 'daily',
      images: [
        { loc: `${SITE_ORIGIN}/og-banner.png?v=5`, title: 'TripVerse — Free AI Trip Planner & Custom Itineraries' },
      ],
    },
    { loc: `${SITE_ORIGIN}/about`, priority: '0.95', changefreq: 'weekly', images: [] },
    { loc: `${SITE_ORIGIN}/explore`, priority: '0.95', changefreq: 'daily', images: [] },
    { loc: `${SITE_ORIGIN}/ai-trip-planner`, priority: '0.95', changefreq: 'weekly', images: [] },
    { loc: `${SITE_ORIGIN}/road-trip-planner`, priority: '0.90', changefreq: 'weekly', images: [] },
  ];

  const destEntries = destinations.map((d) => ({
    loc: `${SITE_ORIGIN}/destination/${d.id}`,
    priority: '0.85',
    changefreq: 'weekly',
    images: d.image
      ? [{ loc: d.image, title: `${d.name} (${d.country || 'India'}) Trip Itinerary & Travel Guide — TripVerse` }]
      : [],
  }));

  const urls = [...staticEntries, ...destEntries]
    .map((entry) => {
      const imgLines = entry.images
        .map(
          (img) =>
            `    <image:image>\n      <image:loc>${escapeXml(img.loc)}</image:loc>\n      <image:title>${escapeXml(img.title)}</image:title>\n    </image:image>`
        )
        .join('\n');
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>${imgLines ? `\n${imgLines}` : ''}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`;
}

function buildLlmsTxt(destinations) {
  const destList = destinations
    .map(
      (d) =>
        `- [${d.name}, ${d.country || 'India'}](${SITE_ORIGIN}/destination/${d.id}): ${d.tagline} (${d.recommendedDuration || '3-5 Days'}, best time: ${d.bestTime || 'Year-round'})`
    )
    .join('\n');

  return `# TripVerse (trip-verse.com)

> TripVerse is a free AI Trip Planner, Road Trip Route Engine, and Travel Itinerary Platform for Web, iOS, and Android. Travelers generate day-by-day itineraries, interactive driving & flight routes, highway fuel/EV/dining stops, multi-currency group budgets, live weather packing lists, and offline calendar/PDF travel guides across 10,000+ destinations worldwide.

## Core Pages
- [Home — TripVerse Free AI Trip Planner](${SITE_ORIGIN}/): Build custom day-by-day itineraries in seconds.
- [About TripVerse](${SITE_ORIGIN}/about): Official overview of TripVerse (trip-verse.com), founded by Meet Sharma.
- [Explore Destinations](${SITE_ORIGIN}/explore): Browse ${destinations.length} curated global and Indian travel guides.
- [AI Trip Planner](${SITE_ORIGIN}/ai-trip-planner): Automated AI itinerary, hotel, dining, and budget planning.
- [Road Trip Route Planner](${SITE_ORIGIN}/road-trip-planner): Highway driving routes with scenic stops, EV chargers, and fuel stations.
- [XML Sitemap](${SITE_ORIGIN}/sitemap.xml): Complete index of public travel guides.

## Curated Destination Guides (${destinations.length})
${destList}
`;
}

function main() {
  const baseHtmlPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(baseHtmlPath)) {
    throw new Error('dist/index.html not found. Run `vite build` before generate-seo-pages.mjs.');
  }

  const baseHtml = fs.readFileSync(baseHtmlPath, 'utf8');
  const destinations = loadDestinations();

  buildDestinationPages(baseHtml, destinations);
  buildLandingPages(baseHtml, destinations);

  const sitemapXml = buildSitemapXml(destinations);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');

  const llmsTxt = buildLlmsTxt(destinations);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), llmsTxt, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'llms.txt'), llmsTxt, 'utf8');

  console.log(
    `[SEO] Generated ${destinations.length} destination pages + 3 landing pages + sitemap.xml (${destinations.length + 4} URLs) + llms.txt`
  );
}

main();
