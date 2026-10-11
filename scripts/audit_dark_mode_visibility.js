import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = '/Users/ms/.gemini/antigravity-ide/brain/58c48f3a-5509-4337-9839-7a35ec45e32d';
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// Sample trip to populate storage so Itinerary, My Trips, Passes etc have full rich content to audit
const sampleTrip = {
  id: 'trip-audit-1',
  name: 'Royal Udaipur Heritage Roadtrip',
  destination: 'Udaipur, Rajasthan',
  destinationState: 'Rajasthan',
  title: 'Royal Udaipur Heritage Roadtrip',
  startDate: '2026-11-15',
  endDate: '2026-11-19',
  durationDays: 4,
  origin: 'Ahmedabad, Gujarat',
  originCity: 'Ahmedabad',
  budget: 25000,
  travelerType: 'couple',
  transportMode: 'car',
  accommodationType: '4star',
  foodPreference: 'local',
  preferences: ['culture', 'nature', 'food'],
  priorities: ['comfort', 'experience'],
  status: 'confirmed',
  isUserCreated: true,
  days: [
    {
      dayNumber: 1,
      date: '2026-11-15',
      title: 'Arrival & Lake Pichola Sunset Cruise',
      activities: [
        {
          id: 'act-1',
          dayNumber: 1,
          time: '09:00 AM',
          title: 'Scenic Drive along NH48 Highway',
          type: 'departure',
          location: 'Ahmedabad to Udaipur Express Highway',
          cost: 1200,
          notes: 'Smooth tollway, fuel stop at Himatnagar plaza.',
          coordinates: { lat: 23.5977, lng: 72.9666 }
        },
        {
          id: 'act-2',
          dayNumber: 1,
          time: '01:30 PM',
          title: 'Check-in at Lake View Heritage Haveli',
          type: 'hotel',
          location: 'Pichola Ghat Road',
          cost: 6500,
          notes: 'Courtyard view with welcome masala chai.',
          coordinates: { lat: 24.5764, lng: 73.6834 }
        },
        {
          id: 'act-3',
          dayNumber: 1,
          time: '05:00 PM',
          title: 'Private Sunset Boat Ride around Jag Mandir',
          type: 'attraction',
          location: 'Lake Pichola Ghat',
          cost: 1800,
          notes: 'Golden hour photography and cool breeze.',
          coordinates: { lat: 24.5678, lng: 73.6789 }
        }
      ]
    },
    {
      dayNumber: 2,
      date: '2026-11-16',
      title: 'City Palace & Jagdish Temple Tour',
      activities: [
        {
          id: 'act-4',
          dayNumber: 2,
          time: '10:00 AM',
          title: 'City Palace Museum & Crystal Gallery',
          type: 'attraction',
          location: 'Old City, Udaipur',
          cost: 900,
          notes: 'Hire an official heritage guide at gate 1.',
          coordinates: { lat: 24.5764, lng: 73.6835 }
        }
      ]
    }
  ],
  breakStops: [
    {
      id: 'bs-1',
      name: 'Honest Highway Plaza & Fuel Hub',
      category: 'highway_food_court',
      rating: 4.8,
      detourDistanceKm: 0.2,
      distanceFromStartKm: 85,
      foodAvailable: true,
      washroomAvailable: true,
      fuelStationAvailable: true,
      evChargingAvailable: true,
      openingHours: '24 Hours',
      estimatedStopMinutes: 35,
      description: 'Clean restrooms, filter coffee, hot pav bhaji, EV fast chargers.',
      recommendationReason: 'Top rated cleanliness on NH48 corridor.',
      coordinates: { lat: 23.6, lng: 73.0 }
    }
  ],
  budgetBreakdown: {
    total: 25000,
    transport: 4500,
    accommodation: 13000,
    food: 4200,
    activities: 2700,
    emergencyFund: 600
  }
};
sampleTrip.itinerary = sampleTrip.days;

async function waitForSplashDismiss(page) {
  try {
    const splash = await page.$('[aria-label="TripVerse Opening"]');
    if (splash) {
      await splash.click().catch(() => {});
    }
  } catch {}
  await page.waitForFunction(() => !document.querySelector('[aria-label="TripVerse Opening"]'), { timeout: 3500 }).catch(() => {});
  await new Promise(r => setTimeout(r, 600));
}

async function auditDOMTextInDarkMode(page, viewName) {
  return await page.evaluate((vName) => {
    function parseColor(cStr) {
      if (!cStr) return null;
      const m = cStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return null;
      return {
        r: parseInt(m[1], 10),
        g: parseInt(m[2], 10),
        b: parseInt(m[3], 10),
        a: m[4] !== undefined ? parseFloat(m[4]) : 1
      };
    }

    function srgbToLinear(c) {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }

    function relativeLuminance(rgb) {
      return 0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b);
    }

    function getContrast(rgb1, rgb2) {
      const l1 = relativeLuminance(rgb1);
      const l2 = relativeLuminance(rgb2);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function blendOver(topRgb, bottomRgb) {
      const alpha = topRgb.a;
      return {
        r: Math.round(topRgb.r * alpha + bottomRgb.r * (1 - alpha)),
        g: Math.round(topRgb.g * alpha + bottomRgb.g * (1 - alpha)),
        b: Math.round(topRgb.b * alpha + bottomRgb.b * (1 - alpha)),
        a: 1
      };
    }

    function getEffectiveBgColor(elem) {
      let current = elem;
      let blended = { r: 7, g: 12, b: 22, a: 1 }; // default dark background #070C16
      const layers = [];

      while (current && current !== document.documentElement) {
        const style = window.getComputedStyle(current);
        const bg = parseColor(style.backgroundColor);
        if (bg && bg.a > 0) {
          layers.unshift(bg); // push to front
          if (bg.a >= 0.99) break; // found opaque bg
        }
        current = current.parentElement;
      }

      for (const layer of layers) {
        blended = blendOver(layer, blended);
      }
      return blended;
    }

    const allElements = Array.from(document.querySelectorAll('*'));
    const issues = [];
    const audited = [];

    allElements.forEach((el) => {
      let text = '';
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        text = el.value || el.placeholder || '';
      } else {
        const directText = Array.from(el.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent.trim())
          .join(' ');
        if (directText.length > 0) {
          text = directText;
        }
      }

      if (!text || text.length === 0) return;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) < 0.1) return;

      const textColor = parseColor(style.color);
      if (!textColor) return;

      const isTextClippedGradient = 
        el.classList.contains('bg-clip-text') ||
        (typeof el.className === 'string' && el.className.includes('bg-clip-text')) ||
        style.getPropertyValue('-webkit-background-clip') === 'text' ||
        style.getPropertyValue('background-clip') === 'text' ||
        style.webkitBackgroundClip === 'text' ||
        style.backgroundClip === 'text';

      const bgColor = getEffectiveBgColor(el);
      const contrast = isTextClippedGradient ? 10.0 : getContrast(textColor, bgColor);
      const fontSize = parseFloat(style.fontSize);
      const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && (parseInt(style.fontWeight, 10) >= 700 || style.fontWeight === 'bold'));
      const minRequiredContrast = isLargeText ? 3.0 : 4.5;

      const textLum = relativeLuminance(textColor);
      const bgLum = relativeLuminance(bgColor);

      const isDarkOnDark = !isTextClippedGradient && textLum < 0.18 && bgLum < 0.18;
      const isLightOnLight = !isTextClippedGradient && textLum > 0.65 && bgLum > 0.65;

      const record = {
        view: vName,
        text: text.slice(0, 80),
        tag: el.tagName.toLowerCase(),
        classes: (el.className || '').toString().slice(0, 100),
        colorStr: style.color,
        bgStr: `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`,
        contrast: parseFloat(contrast.toFixed(2)),
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        isDarkOnDark,
        isLightOnLight,
        level: 'PASS'
      };

      if (contrast < 3.0 || isDarkOnDark || isLightOnLight) {
        record.level = 'CRITICAL';
        issues.push(record);
      } else if (contrast < minRequiredContrast) {
        record.level = 'WARNING';
        issues.push(record);
      }

      audited.push(record);
    });

    return {
      totalAudited: audited.length,
      issuesCount: issues.length,
      criticalCount: issues.filter(i => i.level === 'CRITICAL').length,
      warningCount: issues.filter(i => i.level === 'WARNING').length,
      issues: issues,
      sampleTexts: audited.slice(0, 10).map(a => `${a.tag}: "${a.text}" (${a.colorStr} on ${a.bgStr}, CR ${a.contrast}:1)`)
    };
  }, viewName);
}

async function runAudit() {
  console.log('🌟 Starting Comprehensive TripVerse Dark Mode Visibility Audit...');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Pre-seed dark mode & trip data
  await page.evaluateOnNewDocument((tripData) => {
    localStorage.setItem('tripverse_theme', 'dark');
    localStorage.setItem('tripverse_onboarding_completed', 'true');
    localStorage.setItem('tripverse_has_visited', 'true');
    localStorage.setItem('tripverse_skip_splash', 'true');
    sessionStorage.setItem('tripverse_skip_splash', 'true');
    localStorage.setItem('tripverse_trips_guest', JSON.stringify([tripData]));
    localStorage.setItem('tripverse_active_trip_id_guest', tripData.id);
    localStorage.setItem('tripverse_saved_ids_guest', JSON.stringify(['bali', 'kyoto', 'udaipur']));
    sessionStorage.setItem('tripverse_trips_guest', JSON.stringify([tripData]));
    sessionStorage.setItem('tripverse_active_trip_id_guest', tripData.id);
    sessionStorage.setItem('tripverse_saved_ids_guest', JSON.stringify(['bali', 'kyoto', 'udaipur']));
    document.documentElement.classList.add('dark');
  }, sampleTrip);

  const BASE_URL = 'http://localhost:5173';
  const allResults = [];

  const auditViews = [
    { name: '1. Home Page (Top/Hero)', url: `${BASE_URL}/?nosplash=true`, scroll: 0, screenshot: 'audit_dark_1_home_hero.png' },
    { name: '2. Home Page (Destinations)', url: `${BASE_URL}/?nosplash=true`, scroll: 850, screenshot: 'audit_dark_2_home_destinations.png' },
    { name: '3. Home Page (Highway & Footer)', url: `${BASE_URL}/?nosplash=true`, scroll: 2200, screenshot: 'audit_dark_3_home_footer.png' },
    { name: '4. Explore Page', url: `${BASE_URL}/explore?nosplash=true`, scroll: 0, screenshot: 'audit_dark_4_explore.png' },
    { name: '5. Destination Detail (Bali)', url: `${BASE_URL}/destination/bali?nosplash=true`, scroll: 0, screenshot: 'audit_dark_5_destination_bali.png' },
    { name: '6. My Trips Page', url: `${BASE_URL}/mytrips?nosplash=true`, scroll: 0, screenshot: 'audit_dark_6_mytrips.png' },
    { name: '7. Saved Items Bookmarks', url: `${BASE_URL}/saved?nosplash=true`, scroll: 0, screenshot: 'audit_dark_7_saved.png' },
    { name: '8. Profile & Settings', url: `${BASE_URL}/profile?nosplash=true`, scroll: 0, screenshot: 'audit_dark_8_profile.png' },
    { name: '9. Transport Deals Hub', url: `${BASE_URL}/deals?nosplash=true`, scroll: 0, screenshot: 'audit_dark_9_deals.png' },
    { name: '10. Trip Passes & Boarding Vouchers', url: `${BASE_URL}/passes?nosplash=true`, scroll: 0, screenshot: 'audit_dark_10_passes.png' },
    { name: '11. AI Trip Planner Wizard', url: `${BASE_URL}/planner?nosplash=true`, scroll: 0, screenshot: 'audit_dark_11_planner.png' },
    { name: '12. Booking Checkout Modal', url: `${BASE_URL}/booking?nosplash=true`, scroll: 0, screenshot: 'audit_dark_12_booking.png' },
  ];

  for (const v of auditViews) {
    console.log(`\n🔍 Auditing: ${v.name}...`);
    await page.goto(v.url, { waitUntil: 'networkidle2' });
    await page.waitForSelector('header, nav, main', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 900));

    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tripverse_theme', 'dark');
    });

    if (v.scroll > 0) {
      await page.evaluate((s) => window.scrollTo(0, s), v.scroll);
      await new Promise(r => setTimeout(r, 500));
    }

    if (v.screenshot) {
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, v.screenshot) });
    }

    const audit = await auditDOMTextInDarkMode(page, v.name);
    console.log(`   Audited ${audit.totalAudited} text nodes. Found ${audit.criticalCount} CRITICAL, ${audit.warningCount} WARNING.`);
    if (audit.criticalCount > 0) {
      console.log('   ⚠️ CRITICALS:', JSON.stringify(audit.issues.filter(i => i.level === 'CRITICAL'), null, 2));
    }
    allResults.push({ ...v, ...audit });
  }

  // Next, Audit Itinerary Tabs by navigating to `/trip/trip-audit-1`
  console.log(`\n🔍 Auditing Itinerary Views (/trip/trip-audit-1)...`);
  await page.goto(`${BASE_URL}/trip/trip-audit-1?nosplash=true`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('header, nav, main', { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 900));
  await page.evaluate(() => document.documentElement.classList.add('dark'));

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'audit_dark_13_itinerary_timeline.png') });
  const itinTimeline = await auditDOMTextInDarkMode(page, '13. Itinerary Timeline');
  console.log(`   Audited ${itinTimeline.totalAudited} text nodes. Found ${itinTimeline.criticalCount} CRITICAL, ${itinTimeline.warningCount} WARNING.`);
  if (itinTimeline.criticalCount > 0) {
    console.log('   ⚠️ CRITICALS:', JSON.stringify(itinTimeline.issues.filter(i => i.level === 'CRITICAL'), null, 2));
  }
  allResults.push({ name: '13. Itinerary Timeline', ...itinTimeline });

  const subTabs = ['Break Stops', 'Budget', 'Safety', 'Weather', 'Local Gems', 'Split Bill'];
  for (let i = 0; i < subTabs.length; i++) {
    const tabName = subTabs[i];
    console.log(`   Auditing Itinerary sub-tab: ${tabName}...`);
    const clicked = await page.evaluate((tText) => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const b = tabs.find(el => el.textContent && el.textContent.includes(tText));
      if (b) { b.click(); return true; }
      return false;
    }, tabName);

    if (clicked) {
      await new Promise(r => setTimeout(r, 600));
      const shotName = `audit_dark_14_${tabName.toLowerCase().replace(/\s+/g, '_')}.png`;
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, shotName) });
      const subAudit = await auditDOMTextInDarkMode(page, `Itinerary Subtab: ${tabName}`);
      console.log(`   Audited ${subAudit.totalAudited} text nodes. Found ${subAudit.criticalCount} CRITICAL, ${subAudit.warningCount} WARNING.`);
      if (subAudit.criticalCount > 0) {
        console.log('   ⚠️ CRITICALS:', JSON.stringify(subAudit.issues.filter(i => i.level === 'CRITICAL'), null, 2));
      }
      allResults.push({ name: `Itinerary Subtab: ${tabName}`, ...subAudit });
    }
  }

  // Next, Audit Global Modals:
  // 1. Global Search Modal (⌘K)
  console.log(`\n🔍 Auditing Global Search Modal (⌘K)...`);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('tripverse-open-search'));
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'audit_dark_15_search_modal.png') });
  const searchModalAudit = await auditDOMTextInDarkMode(page, '15. Global Search Modal');
  console.log(`   Audited ${searchModalAudit.totalAudited} text nodes. Found ${searchModalAudit.criticalCount} CRITICAL, ${searchModalAudit.warningCount} WARNING.`);
  if (searchModalAudit.criticalCount > 0) {
    console.log('   ⚠️ CRITICALS:', JSON.stringify(searchModalAudit.issues.filter(i => i.level === 'CRITICAL'), null, 2));
  }
  allResults.push({ name: '15. Global Search Modal', ...searchModalAudit });
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // 2. AI Chat Drawer
  console.log(`\n🔍 Auditing AI Assistant Chat Drawer...`);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('AI Assistant'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'audit_dark_16_ai_chat.png') });
  const chatDrawerAudit = await auditDOMTextInDarkMode(page, '16. AI Chat Drawer');
  console.log(`   Audited ${chatDrawerAudit.totalAudited} text nodes. Found ${chatDrawerAudit.criticalCount} CRITICAL, ${chatDrawerAudit.warningCount} WARNING.`);
  if (chatDrawerAudit.criticalCount > 0) {
    console.log('   ⚠️ CRITICALS:', JSON.stringify(chatDrawerAudit.issues.filter(i => i.level === 'CRITICAL'), null, 2));
  }
  allResults.push({ name: '16. AI Chat Drawer', ...chatDrawerAudit });

  // Close AI Chat Drawer
  await page.evaluate(() => {
    const closeBtn = document.querySelector('[aria-label="Close assistant"], [aria-label="Close chat"], button:has(svg.lucide-x)');
    if (closeBtn) closeBtn.click();
  });
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  // 17. Trip Replanning Modal
  console.log(`\n🔍 Auditing Trip Replanning Modal...`);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Trip Replanning'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'audit_dark_18_replanning.png') });
  const replanningAudit = await auditDOMTextInDarkMode(page, '18. Trip Replanning Modal');
  console.log(`   Audited ${replanningAudit.totalAudited} text nodes. Found ${replanningAudit.criticalCount} CRITICAL, ${replanningAudit.warningCount} WARNING.`);
  if (replanningAudit.criticalCount > 0) {
    console.log('   ⚠️ CRITICALS:', JSON.stringify(replanningAudit.issues.filter(i => i.level === 'CRITICAL'), null, 2));
  }
  allResults.push({ name: '18. Trip Replanning Modal', ...replanningAudit });
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  // 19. Trip Review Modal
  console.log(`\n🔍 Auditing Trip Review Modal...`);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Review'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'audit_dark_19_review.png') });
  const reviewAudit = await auditDOMTextInDarkMode(page, '19. Trip Review Modal');
  console.log(`   Audited ${reviewAudit.totalAudited} text nodes. Found ${reviewAudit.criticalCount} CRITICAL, ${reviewAudit.warningCount} WARNING.`);
  if (reviewAudit.criticalCount > 0) {
    console.log('   ⚠️ CRITICALS:', JSON.stringify(reviewAudit.issues.filter(i => i.level === 'CRITICAL'), null, 2));
  }
  allResults.push({ name: '19. Trip Review Modal', ...reviewAudit });
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  // 20. Notification Center Modal
  console.log(`\n🔍 Auditing Notification Center Modal...`);
  await page.evaluate(() => {
    const bellBtn = document.querySelector('button[aria-label*="notification" i], button:has(svg.lucide-bell)');
    if (bellBtn) bellBtn.click();
  });
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'audit_dark_20_notifications.png') });
  const notifAudit = await auditDOMTextInDarkMode(page, '20. Notification Center Modal');
  console.log(`   Audited ${notifAudit.totalAudited} text nodes. Found ${notifAudit.criticalCount} CRITICAL, ${notifAudit.warningCount} WARNING.`);
  if (notifAudit.criticalCount > 0) {
    console.log('   ⚠️ CRITICALS:', JSON.stringify(notifAudit.issues.filter(i => i.level === 'CRITICAL'), null, 2));
  }
  allResults.push({ name: '20. Notification Center Modal', ...notifAudit });
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  // 3. Mobile Viewport Navigation
  console.log(`\n🔍 Auditing Mobile Viewport (iPhone 14/15 size: 390x844)...`);
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobilePage.evaluateOnNewDocument((tripData) => {
    localStorage.setItem('tripverse_theme', 'dark');
    localStorage.setItem('tripverse_onboarding_completed', 'true');
    localStorage.setItem('tripverse_has_visited', 'true');
    localStorage.setItem('tripverse_skip_splash', 'true');
    sessionStorage.setItem('tripverse_skip_splash', 'true');
    localStorage.setItem('tripverse_trips_guest', JSON.stringify([tripData]));
    localStorage.setItem('tripverse_active_trip_id_guest', tripData.id);
    sessionStorage.setItem('tripverse_trips_guest', JSON.stringify([tripData]));
    sessionStorage.setItem('tripverse_active_trip_id_guest', tripData.id);
    document.documentElement.classList.add('dark');
  }, sampleTrip);

  await mobilePage.goto(`${BASE_URL}/?nosplash=true`, { waitUntil: 'networkidle2' });
  await mobilePage.waitForSelector('header, nav, main', { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 900));
  await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'audit_dark_17_mobile_home.png') });
  const mobileHomeAudit = await auditDOMTextInDarkMode(mobilePage, '17. Mobile Home & BottomNav');
  console.log(`   Audited ${mobileHomeAudit.totalAudited} text nodes. Found ${mobileHomeAudit.criticalCount} CRITICAL, ${mobileHomeAudit.warningCount} WARNING.`);
  if (mobileHomeAudit.criticalCount > 0) {
    console.log('   ⚠️ CRITICALS:', JSON.stringify(mobileHomeAudit.issues.filter(i => i.level === 'CRITICAL'), null, 2));
  }
  allResults.push({ name: '17. Mobile Home & BottomNav', ...mobileHomeAudit });

  await browser.close();

  // Summary Report
  console.log('\n======================================================');
  console.log('🎯 DARK MODE TEXT VISIBILITY AUDIT COMPLETE');
  console.log('======================================================');

  let totalAudited = 0;
  let totalCritical = 0;
  let totalWarnings = 0;
  const criticalItems = [];
  const warningItems = [];

  for (const res of allResults) {
    totalAudited += res.totalAudited || 0;
    totalCritical += res.criticalCount || 0;
    totalWarnings += res.warningCount || 0;
    if (res.issues) {
      res.issues.forEach(issue => {
        if (issue.level === 'CRITICAL') criticalItems.push(issue);
        else warningItems.push(issue);
      });
    }
  }

  console.log(`Total Text Elements Audited: ${totalAudited}`);
  console.log(`Total Critical Contrast Violations (< 3.0:1): ${totalCritical}`);
  console.log(`Total Warnings (< 4.5:1): ${totalWarnings}`);

  const reportPath = path.join(ARTIFACTS_DIR, 'dark_mode_visibility_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    totalAudited,
    totalCritical,
    totalWarnings,
    criticalItems,
    warningItems
  }, null, 2));

  console.log(`Saved detailed JSON audit report to: ${reportPath}`);

  if (criticalItems.length > 0) {
    console.log('\n🚨 CRITICAL VIOLATIONS (ALL):');
    criticalItems.forEach((item, idx) => {
      console.log(`[#${idx+1}] View: ${item.view}`);
      console.log(`     Text: "${item.text}"`);
      console.log(`     Tag/Classes: <${item.tag}> ${item.classes}`);
      console.log(`     Color: ${item.colorStr} on Bg: ${item.bgStr} -> Contrast: ${item.contrast}:1`);
      console.log(`     Issue: ${item.isDarkOnDark ? 'DARK-ON-DARK' : item.isLightOnLight ? 'LIGHT-ON-LIGHT' : 'LOW CONTRAST'}`);
    });
  }

  if (warningItems.length > 0) {
    console.log('\n⚠️ WARNINGS SAMPLE (First 20):');
    warningItems.slice(0, 20).forEach((item, idx) => {
      console.log(`[#${idx+1}] View: ${item.view}`);
      console.log(`     Text: "${item.text}"`);
      console.log(`     Tag/Classes: <${item.tag}> ${item.classes}`);
      console.log(`     Color: ${item.colorStr} on Bg: ${item.bgStr} -> Contrast: ${item.contrast}:1`);
    });
  }
}

runAudit().catch(err => {
  console.error('Audit run error:', err);
  process.exit(1);
});
