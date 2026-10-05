import puppeteer from 'puppeteer-core';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const brainDir = '/Users/ms/.gemini/antigravity-ide/brain/f63bb7fe-0321-4faf-b5a5-32557bb4b315';

  // 1. iPhone 15 Pro / iOS App Opening Experience
  const iphonePage = await browser.newPage();
  await iphonePage.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await iphonePage.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1');
  
  console.log('Navigating to http://localhost:5173/ as iPhone...');
  await iphonePage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  
  // Wait 600ms into the animation to capture the dynamic island, glowing logo & progress bar
  await new Promise(r => setTimeout(r, 650));
  await iphonePage.screenshot({ path: `${brainDir}/splash_iphone_opening.png` });
  console.log('Saved splash_iphone_opening.png');

  // 2. Android (Google Pixel 8 / Samsung Galaxy) App Opening Experience
  const androidPage = await browser.newPage();
  await androidPage.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await androidPage.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');

  console.log('Navigating to http://localhost:5173/ as Android...');
  await androidPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  // Wait 650ms to capture Android Material squircle, ripple, and linear track
  await new Promise(r => setTimeout(r, 650));
  await androidPage.screenshot({ path: `${brainDir}/splash_android_opening.png` });
  console.log('Saved splash_android_opening.png');

  // 3. Desktop / Tablet View of the Splash Screen with Platform Switcher
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1200, height: 800 });
  await desktopPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 700));
  await desktopPage.screenshot({ path: `${brainDir}/splash_desktop_opening.png` });
  console.log('Saved splash_desktop_opening.png');

  // 4. Capture after animation completes (main app revealed)
  await new Promise(r => setTimeout(r, 2200));
  await desktopPage.screenshot({ path: `${brainDir}/app_after_splash.png` });
  console.log('Saved app_after_splash.png');

  await browser.close();
  console.log('All splash animation tests completed successfully!');
}

run().catch(console.error);
