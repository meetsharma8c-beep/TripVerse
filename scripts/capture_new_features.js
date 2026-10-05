import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACTS_DIR = '/Users/ms/.gemini/antigravity-ide/brain/b541d50e-cbfe-4a71-a056-649801859600';
const CHROME_PATH = '/Users/ms/Desktop/Google Chrome.app/Contents/MacOS/Google Chrome';

async function run() {
  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 2 });

  console.log('Navigating to http://127.0.0.1:5173/ ...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

  // Click "Open Itinerary"
  const openItinBtn = await page.waitForSelector('button:has-text("Open Itinerary")', { timeout: 5000 })
    .catch(async () => {
      // fallback: find button containing "Open Itinerary"
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('Open Itinerary')) return btn;
      }
      return null;
    });

  if (openItinBtn) {
    await openItinBtn.click();
    await new Promise(r => setTimeout(r, 1200));
  }

  // 1. Capture Itinerary with "+ Add Activity" button
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screen_itinerary.png') });
  console.log('Saved screen_itinerary.png');

  // Helper to click sub-tab
  async function clickSubTab(label) {
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes(label)) {
        await btn.click();
        await new Promise(r => setTimeout(r, 800));
        return true;
      }
    }
    return false;
  }

  // 2. Click "Packing & Weather"
  if (await clickSubTab('Packing & Weather')) {
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screen_packing_weather.png') });
    console.log('Saved screen_packing_weather.png');
  }

  // 3. Click "TripSplit & Fuel"
  if (await clickSubTab('TripSplit & Fuel')) {
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screen_tripsplit_fuel.png') });
    console.log('Saved screen_tripsplit_fuel.png');
  }

  // 4. Click "Food Trails & Gems"
  if (await clickSubTab('Food Trails & Gems')) {
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screen_food_gems.png') });
    console.log('Saved screen_food_gems.png');
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
