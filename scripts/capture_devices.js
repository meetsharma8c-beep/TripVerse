import puppeteer from 'puppeteer-core';

async function clickByText(page, text) {
  return await page.evaluate((t) => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes(t));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, text);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  console.log('Navigating to http://127.0.0.1:5173/');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

  // 1. Click "All Devices" button to open Hub
  const clickedDevices = await clickByText(page, 'All Devices');
  console.log('Clicked All Devices:', clickedDevices);
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_device_hub.png'
  });
  console.log('1. Saved tripverse_device_hub.png');

  // 2. Click "iPhone 16 Pro" inside Device Hub
  const clickedIPhone = await clickByText(page, 'iPhone 16 Pro');
  console.log('Clicked iPhone 16 Pro:', clickedIPhone);
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_iphone_frame.png'
  });
  console.log('2. Saved tripverse_iphone_frame.png');

  // 3. Switch to Google Pixel 9 from the floating device control bar
  const clickedPixel = await clickByText(page, 'Pixel 9');
  console.log('Clicked Pixel 9:', clickedPixel);
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_pixel_frame.png'
  });
  console.log('3. Saved tripverse_pixel_frame.png');

  // 4. Test Native Mobile Viewport (iPhone / Android physical phone screen)
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobilePage.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  await mobilePage.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_native_mobile.png'
  });
  console.log('4. Saved tripverse_native_mobile.png');

  // 5. Open mobile menu / itinerary on mobile viewport
  const mobileItinerary = await clickByText(mobilePage, 'Open Itinerary');
  console.log('Mobile Clicked Itinerary:', mobileItinerary);
  await new Promise(r => setTimeout(r, 1000));

  await mobilePage.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_mobile_itinerary.png'
  });
  console.log('5. Saved tripverse_mobile_itinerary.png');

  await browser.close();
  console.log('All multi-device screenshots captured successfully!');
}

run().catch(console.error);
