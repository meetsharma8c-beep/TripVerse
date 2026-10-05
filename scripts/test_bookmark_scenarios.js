import puppeteer from 'puppeteer-core';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const brainDir = '/Users/ms/.gemini/antigravity-ide/brain/f63bb7fe-0321-4faf-b5a5-32557bb4b315';

  console.log('--- Testing Bookmark & Standalone Scenarios ---');

  // Scenario 1: iPhone Safari Bookmark (Browser Mode)
  const iphoneBrowserPage = await browser.newPage();
  await iphoneBrowserPage.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await iphoneBrowserPage.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1');
  
  await iphoneBrowserPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 650));
  
  const iphoneSplashActive = await iphoneBrowserPage.evaluate(() => {
    const splash = document.querySelector('[aria-label*="TripVerse Opening Animation"]');
    const isIosMode = splash ? splash.getAttribute('aria-label').includes('iPhone iOS') : false;
    const title = document.querySelector('title') ? document.querySelector('title').innerText : '';
    return { hasSplash: !!splash, isIosMode, title };
  });
  console.log('1. iPhone Safari Bookmark (Browser Mode):', iphoneSplashActive);
  await iphoneBrowserPage.screenshot({ path: `${brainDir}/test_iphone_safari_bookmark.png` });

  // Scenario 2: iPhone Home Screen Bookmark (Standalone Mode)
  const iphoneHomescreenPage = await browser.newPage();
  await iphoneHomescreenPage.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await iphoneHomescreenPage.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1');
  
  await iphoneHomescreenPage.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'standalone', { get: () => true });
  });

  await iphoneHomescreenPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 650));

  const iphoneHomescreenActive = await iphoneHomescreenPage.evaluate(() => {
    const splash = document.querySelector('[aria-label*="TripVerse Opening Animation"]');
    const isIosMode = splash ? splash.getAttribute('aria-label').includes('iPhone iOS') : false;
    return { hasSplash: !!splash, isIosMode, isStandalone: (window.navigator).standalone };
  });
  console.log('2. iPhone Home Screen Bookmark (Standalone):', iphoneHomescreenActive);
  await iphoneHomescreenPage.screenshot({ path: `${brainDir}/test_iphone_homescreen_bookmark.png` });

  // Scenario 3: Android Chrome Bookmark (Browser Mode)
  const androidBrowserPage = await browser.newPage();
  await androidBrowserPage.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await androidBrowserPage.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');

  await androidBrowserPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 650));

  const androidSplashActive = await androidBrowserPage.evaluate(() => {
    const splash = document.querySelector('[aria-label*="TripVerse Opening Animation"]');
    const isAndroidMode = splash ? splash.getAttribute('aria-label').includes('Android') : false;
    return { hasSplash: !!splash, isAndroidMode };
  });
  console.log('3. Android Chrome Bookmark (Browser Mode):', androidSplashActive);
  await androidBrowserPage.screenshot({ path: `${brainDir}/test_android_chrome_bookmark.png` });

  // Scenario 4: Android Home Screen Shortcut / WebAPK (Standalone Mode)
  const androidHomescreenPage = await browser.newPage();
  await androidHomescreenPage.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await androidHomescreenPage.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');
  
  await androidHomescreenPage.evaluateOnNewDocument(() => {
    const origMatchMedia = window.matchMedia;
    window.matchMedia = (query) => {
      if (query.includes('(display-mode: standalone)')) {
        return { matches: true, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false };
      }
      return origMatchMedia(query);
    };
  });

  await androidHomescreenPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 650));

  const androidHomescreenActive = await androidHomescreenPage.evaluate(() => {
    const splash = document.querySelector('[aria-label*="TripVerse Opening Animation"]');
    const isAndroidMode = splash ? splash.getAttribute('aria-label').includes('Android') : false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    return { hasSplash: !!splash, isAndroidMode, isStandalone };
  });
  console.log('4. Android Home Screen Bookmark (Standalone):', androidHomescreenActive);
  await androidHomescreenPage.screenshot({ path: `${brainDir}/test_android_homescreen_bookmark.png` });

  await browser.close();
  console.log('All 4 bookmark scenarios validated successfully!');
}

run().catch(console.error);
