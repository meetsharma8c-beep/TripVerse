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

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

  // Scroll slightly to center the Active Journey Banner
  await page.evaluate(() => window.scrollBy(0, 520));
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'tripverse_home_active_banner.png')
  });
  console.log('Saved tripverse_home_active_banner.png');

  // Go to Itinerary
  const openItinBtns = await page.$$('button');
  for (const b of openItinBtns) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Open Itinerary')) {
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'tripverse_itinerary_header_liveguide.png')
  });
  console.log('Saved tripverse_itinerary_header_liveguide.png');

  // Click Smart Route Map tab
  const tabs = await page.$$('button');
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text && text.includes('Smart Route Map')) {
      await tab.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'tripverse_smart_route_map_liveguide.png')
  });
  console.log('Saved tripverse_smart_route_map_liveguide.png');

  await browser.close();
  console.log('Done!');
}

run().catch(console.error);
