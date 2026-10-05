import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACTS_DIR = '/Users/ms/.gemini/antigravity-ide/brain/b541d50e-cbfe-4a71-a056-649801859600';
const CHROME_PATH = '/Users/ms/Desktop/Google Chrome.app/Contents/MacOS/Google Chrome';

async function run() {
  console.log('Launching browser for showcase capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 920, deviceScaleFactor: 2 });

  // 1. Home Dashboard
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'showcase_home.png') });
  console.log('Saved showcase_home.png');

  // Helper to click button by text
  async function clickButton(textMatch) {
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes(textMatch)) {
        await btn.click();
        await new Promise(r => setTimeout(r, 900));
        return true;
      }
    }
    return false;
  }

  // 2. Open Itinerary
  await clickButton('Open Itinerary');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'showcase_itinerary.png') });
  console.log('Saved showcase_itinerary.png');

  // 3. Packing & Weather
  if (await clickButton('Packing & Weather')) {
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'showcase_packing_weather.png') });
    console.log('Saved showcase_packing_weather.png');
  }

  // 4. TripSplit & Fuel
  if (await clickButton('TripSplit & Fuel')) {
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'showcase_tripsplit.png') });
    console.log('Saved showcase_tripsplit.png');
  }

  // 5. Food Trails & Gems
  if (await clickButton('Food Trails & Gems')) {
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'showcase_food_gems.png') });
    console.log('Saved showcase_food_gems.png');
  }

  // 6. Mobile View (iPhone 15 Pro)
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await mobilePage.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'showcase_mobile_home.png') });
  console.log('Saved showcase_mobile_home.png');

  await browser.close();
  console.log('Showcase captured successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
