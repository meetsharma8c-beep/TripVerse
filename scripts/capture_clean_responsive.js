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

  // 1. Desktop Viewport (1280 x 850)
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1280, height: 850 });
  await desktopPage.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await desktopPage.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_desktop_clean.png'
  });
  console.log('1. Captured tripverse_desktop_clean.png');

  // 2. Tablet Viewport (768 x 1024 - iPad)
  const tabletPage = await browser.newPage();
  await tabletPage.setViewport({ width: 768, height: 1024 });
  await tabletPage.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await tabletPage.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_tablet_clean.png'
  });
  console.log('2. Captured tripverse_tablet_clean.png');

  // 3. Mobile Viewport (390 x 844 - iPhone / Android)
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobilePage.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await mobilePage.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_mobile_clean.png'
  });
  console.log('3. Captured tripverse_mobile_clean.png');

  // 4. Mobile Itinerary & Route
  await clickByText(mobilePage, 'Open Itinerary');
  await new Promise(r => setTimeout(r, 1000));
  await mobilePage.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_mobile_itinerary_clean.png'
  });
  console.log('4. Captured tripverse_mobile_itinerary_clean.png');

  // 5. Open AI Assistant on Mobile
  await clickByText(mobilePage, 'AI Assistant');
  await new Promise(r => setTimeout(r, 1000));
  await mobilePage.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_mobile_chat_clean.png'
  });
  console.log('5. Captured tripverse_mobile_chat_clean.png');

  await browser.close();
  console.log('Responsive verification complete!');
}

run().catch(console.error);
