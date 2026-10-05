import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACTS_DIR = '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b';
const CHROME_PATH = '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Test 1: Mobile Live Navigation HUD
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true });
  await mobilePage.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

  // Find and click Live Guide button
  const liveGuideBtn = await mobilePage.waitForSelector('button[title*="Turn-by-Turn"]', { timeout: 5000 });
  await liveGuideBtn.click();
  await mobilePage.waitForSelector('button[title="Exit Navigation HUD"]', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 1500));

  // Advance 2 steps on mobile
  const nextBtn = await mobilePage.waitForSelector('button[title="Next Step"]', { timeout: 3000 });
  await nextBtn.click();
  await new Promise(r => setTimeout(r, 600));
  await nextBtn.click();
  await new Promise(r => setTimeout(r, 600));

  await mobilePage.screenshot({
    path: path.join(ARTIFACTS_DIR, 'tripverse_live_nav_mobile_hud.png')
  });
  console.log('Saved tripverse_live_nav_mobile_hud.png');

  // Test 2: Smart Route Map with Start Live GPS Guide button on Desktop
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await desktopPage.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

  // Open Itinerary
  const openItinBtns = await desktopPage.$$('button');
  for (const b of openItinBtns) {
    const text = await desktopPage.evaluate(el => el.textContent, b);
    if (text && text.includes('Open Itinerary')) {
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 800));

  // Click Smart Route Map tab
  const tabs = await desktopPage.$$('button');
  for (const tab of tabs) {
    const text = await desktopPage.evaluate(el => el.textContent, tab);
    if (text && text.includes('Smart Route Map')) {
      await tab.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1200));

  await desktopPage.screenshot({
    path: path.join(ARTIFACTS_DIR, 'tripverse_route_map_with_liveguide.png')
  });
  console.log('Saved tripverse_route_map_with_liveguide.png');

  await browser.close();
  console.log('Mobile & Desktop captures done!');
}

run().catch(console.error);
