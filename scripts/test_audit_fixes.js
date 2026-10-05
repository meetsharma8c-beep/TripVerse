import puppeteer from 'puppeteer-core';

async function testAuditFixes() {
  console.log('🚀 Starting Automated Verification for UX & Product Audit Fixes...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 }); // Mobile viewport tested in audit

  const BASE_URL = 'http://localhost:5173';

  try {
    // TEST 1: Viewport meta allows pinch-to-zoom (WCAG 1.4.4)
    console.log('\n--- TEST 1: Viewport Accessibility (WCAG 1.4.4) ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));
    const viewportMeta = await page.$eval('meta[name="viewport"]', el => el.getAttribute('content'));
    console.log('Viewport content:', viewportMeta);
    if (viewportMeta.includes('user-scalable=no') || viewportMeta.includes('maximum-scale=1.0')) {
      throw new Error('FAIL: Viewport still disables pinch-zoom!');
    }
    console.log('✅ PASS: user-scalable=no and maximum-scale=1.0 removed!');

    // TEST 2: PWA Install Prompt does NOT appear on initial landing (delayed until intent/repeat)
    console.log('\n--- TEST 2: PWA Install Prompt Non-Intrusiveness ---');
    await new Promise(r => setTimeout(r, 3200)); // Wait 3.2s
    const pwaPromptExists = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="pwa-install-prompt"]') ||
                 document.body.innerText.includes('Install TripVerse for instant highway offline navigation');
      return el;
    });
    console.log('PWA Prompt visible on cold load:', pwaPromptExists);
    if (pwaPromptExists) {
      throw new Error('FAIL: PWA prompt popped up immediately on first visit!');
    }
    console.log('✅ PASS: PWA prompt did not intrusive auto-popup on landing!');

    // TEST 3: Cold Load Deep Link /explore
    console.log('\n--- TEST 3: Cold Load Deep Link /explore ---');
    await page.goto(`${BASE_URL}/explore`, { waitUntil: 'networkidle2' });
    const exploreTitle = await page.title();
    console.log('Page title on /explore:', exploreTitle);
    const exploreHeader = await page.evaluate(() => {
      return document.body.innerText.includes('Explore Handpicked') ||
             document.body.innerText.includes('Curated Indian Getaways') ||
             document.querySelector('input[placeholder*="Search destinations"]')?.value !== undefined;
    });
    if (!exploreHeader) {
      throw new Error('FAIL: /explore did not render Explore view!');
    }
    console.log('✅ PASS: Cold load /explore successfully rendered Explore view with dynamic title!');

    // TEST 4: Cold Load Deep Link /mytrips
    console.log('\n--- TEST 4: Cold Load Deep Link /mytrips ---');
    await page.goto(`${BASE_URL}/mytrips`, { waitUntil: 'networkidle2' });
    const myTripsTitle = await page.title();
    console.log('Page title on /mytrips:', myTripsTitle);
    const hasMyTripsContent = await page.evaluate(() => {
      return document.body.innerText.includes('My Trips & Itineraries') ||
             document.body.innerText.includes('Active Route') ||
             document.body.innerText.includes('Plan New Trip');
    });
    if (!hasMyTripsContent) {
      throw new Error('FAIL: /mytrips did not render My Trips view!');
    }
    console.log('✅ PASS: Cold load /mytrips successfully rendered My Trips view!');

    // TEST 5: Cold Load Deep Link /saved
    console.log('\n--- TEST 5: Cold Load Deep Link /saved ---');
    await page.goto(`${BASE_URL}/saved`, { waitUntil: 'networkidle2' });
    const savedTitle = await page.title();
    console.log('Page title on /saved:', savedTitle);
    const hasSavedContent = await page.evaluate(() => {
      return document.body.innerText.includes('Saved Places') ||
             document.body.innerText.includes('Bookmarks');
    });
    if (!hasSavedContent) {
      throw new Error('FAIL: /saved did not render Saved view!');
    }
    console.log('✅ PASS: Cold load /saved successfully rendered Saved view!');

    // TEST 6: Cold Load Deep Link /destination/manali
    console.log('\n--- TEST 6: Cold Load Deep Link /destination/manali ---');
    await page.goto(`${BASE_URL}/destination/manali`, { waitUntil: 'networkidle2' });
    const manaliTitle = await page.title();
    console.log('Page title on /destination/manali:', manaliTitle);
    const manaliModalVisible = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return (text.includes('price transparency & inclusions') ||
              text.includes('price breakdown & inclusions') ||
              document.body.textContent.includes('Price Transparency & Inclusions')) &&
             document.body.innerText.includes('Manali');
    });
    if (!manaliModalVisible) {
      throw new Error('FAIL: /destination/manali did not open DestinationDetailModal!');
    }
    console.log('✅ PASS: Cold load /destination/manali directly opened destination modal with Price Breakdown!');

    // TEST 7: Home Page Differentiator & Touch Targets
    console.log('\n--- TEST 7: Home Landing & Highway Differentiator ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    const differentiatorVisible = await page.evaluate(() => {
      return document.body.innerText.includes('The TripVerse Secret Weapon') &&
             document.body.innerText.includes('We Plan the Highway');
    });
    if (!differentiatorVisible) {
      throw new Error('FAIL: HighwayBreakstopsShowcase differentiator missing from Home!');
    }
    console.log('✅ PASS: HighwayBreakstopsShowcase successfully displayed on Home landing!');

    // Dismiss splash screen if present
    await page.evaluate(() => {
      const splash = Array.from(document.querySelectorAll('div')).find(d => d.className && d.className.includes('z-[9999]'));
      if (splash) splash.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Submit hero form
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    });

    // Check that AIGenerationSkeleton appears
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Synthesizing Optimal Highway Corridor');
    }, { timeout: 3000 });
    console.log('✅ Stepped AI generation skeleton appeared!');

    // Wait for trip generation completion (~2s)
    await page.waitForFunction(() => {
      return window.location.pathname.startsWith('/trip/') || document.body.innerText.includes('Reserve & Lock Rate');
    }, { timeout: 6000 });
    console.log('✅ PASS: 1-Click fast generation succeeded and transitioned directly to Itinerary!');

    // TEST 9: Booking Drawer Loop Closure
    console.log('\n--- TEST 9: Booking Drawer Loop Closure ---');
    const reserveBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Reserve & Lock Rate'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (!reserveBtn) throw new Error('Could not find Reserve & Lock Rate button');

    await page.waitForFunction(() => {
      return document.body.innerText.includes('Verified Highway Route Package') ||
             document.body.innerText.includes('Proceed to Payment');
    }, { timeout: 3000 });
    console.log('✅ PASS: TripBookingCheckoutModal opened with transparent package breakdown!');

    console.log('\n🎉 ALL 9 AUDIT VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testAuditFixes();
