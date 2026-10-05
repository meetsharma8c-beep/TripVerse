import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACTS_DIR = '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b';
const CHROME_PATH = '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta';

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  console.log('Navigating to http://127.0.0.1:5173/ ...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

  // 1. Capture Home Screen showing Live Guide button
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'tripverse_home_liveguide_btn.png')
  });
  console.log('Saved tripverse_home_liveguide_btn.png');

  // 2. Click "Live Guide" button on Home Active Journey banner
  const liveGuideBtn = await page.waitForSelector('button[title*="Turn-by-Turn"]', { timeout: 5000 });
  if (liveGuideBtn) {
    console.log('Found Live Guide button, clicking...');
    await liveGuideBtn.click();
  }

  // Wait for Live HUD to open by checking for the close button
  await page.waitForSelector('button[title="Exit Navigation HUD"]', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 1500)); // allow map tiles and leaflet to render

  // 3. Capture Initial HUD
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'tripverse_live_nav_initial.png')
  });
  console.log('Saved tripverse_live_nav_initial.png');

  // 4. Advance step 1 -> 2 -> 3 (to NH-48 and Shamlaji Food Court)
  const nextStepBtn = await page.waitForSelector('button[title="Next Step"]', { timeout: 3000 });
  if (nextStepBtn) {
    console.log('Advancing step 1 -> 2...');
    await nextStepBtn.click();
    await new Promise(r => setTimeout(r, 800));

    console.log('Advancing step 2 -> 3 (Approaching Shamlaji Food Court Rest Stop)...');
    await nextStepBtn.click();
    await new Promise(r => setTimeout(r, 800));

    console.log('Advancing step 3 -> 4 (On NH-48 Corridor)...');
    await nextStepBtn.click();
    await new Promise(r => setTimeout(r, 800));
  }

  // 5. Capture Live Driving HUD with Highway Maneuver, Speedometer, and Break Stop banner
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'tripverse_live_nav_driving.png')
  });
  console.log('Saved tripverse_live_nav_driving.png');

  // 6. Open Cue Sheet / Step-by-Step drawer
  const stepsDrawerBtn = await page.waitForSelector('button[title="View Turn-by-Turn Cue Sheet"]', { timeout: 3000 });
  if (stepsDrawerBtn) {
    console.log('Opening Cue Sheet drawer...');
    await stepsDrawerBtn.click();
    await new Promise(r => setTimeout(r, 800));
  }

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'tripverse_live_nav_cuesheet.png')
  });
  console.log('Saved tripverse_live_nav_cuesheet.png');

  // Close Cue Sheet drawer
  const closeDrawerBtn = await page.waitForSelector('button[title="Close Cue Sheet"]', { timeout: 3000 });
  if (closeDrawerBtn) {
    await closeDrawerBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // 7. Mobile Viewport Test (iPhone 14 Pro: 393 x 852)
  console.log('Testing mobile responsive layout...');
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'tripverse_live_nav_mobile.png')
  });
  console.log('Saved tripverse_live_nav_mobile.png');

  // 8. Close HUD and verify return to App
  const closeHudBtn = await page.waitForSelector('button[title="Exit Navigation HUD"]');
  if (closeHudBtn) {
    await closeHudBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // 9. Navigate to Smart Route Map sub-tab inside Itinerary to verify the in-page trigger button
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  const openItineraryBtn = await page.waitForSelector('text/Open Itinerary');
  if (openItineraryBtn) {
    await openItineraryBtn.click();
    await new Promise(r => setTimeout(r, 500));

    // Click "Smart Route Map" sub tab
    const routeMapTab = await page.waitForSelector('text/Smart Route Map');
    if (routeMapTab) {
      await routeMapTab.click();
      await new Promise(r => setTimeout(r, 1200));
    }

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'tripverse_route_map_with_liveguide.png')
    });
    console.log('Saved tripverse_route_map_with_liveguide.png');
  }

  await browser.close();
  console.log('Verification completed successfully!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
