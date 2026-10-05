import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function main() {
  const brainDir = '/Users/ms/.gemini/antigravity-ide/brain/e8640bc6-d986-49be-984d-002fde678095';
  if (!fs.existsSync(brainDir)) {
    fs.mkdirSync(brainDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('=== TEST 1: iOS iPhone 15 Pro Opening Animation ===');
  const iosPage = await browser.newPage();
  await iosPage.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await iosPage.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1');

  await iosPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  
  // Wait 700ms for animations and status text
  await new Promise(r => setTimeout(r, 700));

  const iosDetails = await iosPage.evaluate(() => {
    const splash = document.querySelector('[role="dialog"][aria-label*="TripVerse Opening Animation"]');
    if (!splash) return { found: false };
    const label = splash.getAttribute('aria-label') || '';
    const dynamicIsland = splash.innerText.includes('TripVerse Live Activity');
    const gpsReady = splash.innerText.includes('GPS Ready');
    const statusText = splash.innerText.includes('Connecting to Apple CoreLocation & Routes...') ||
                       splash.innerText.includes('Mapping verified highway food & fuel stops...') ||
                       splash.innerText.includes('Initializing travel engine...');
    const iosBadge = splash.innerText.includes('Optimized for iOS & iPadOS');
    const homeIndicator = splash.innerText.includes('Swipe up or tap to enter');
    const platformToggle = !!splash.querySelector('.splash-platform-toggle');
    return {
      found: true,
      label,
      isIosMode: label.includes('iPhone iOS'),
      dynamicIsland,
      gpsReady,
      statusText,
      iosBadge,
      homeIndicator,
      platformToggle
    };
  });

  console.log('iOS Opening Details:', iosDetails);
  await iosPage.screenshot({ path: path.join(brainDir, 'ios_opening_animation.png') });
  console.log('Saved ios_opening_animation.png');

  // Wait for animation to finish and confirm exit transition
  await new Promise(r => setTimeout(r, 2200));
  const iosAfterSplash = await iosPage.evaluate(() => {
    const splash = document.querySelector('[role="dialog"][aria-label*="TripVerse Opening Animation"]');
    const navbar = !!document.querySelector('nav');
    return { splashClosed: !splash, navbarVisible: navbar };
  });
  console.log('iOS After Splash Exit:', iosAfterSplash);
  await iosPage.screenshot({ path: path.join(brainDir, 'ios_app_ready.png') });
  console.log('Saved ios_app_ready.png');

  console.log('\n=== TEST 2: Android Pixel 8 Opening Animation ===');
  const androidPage = await browser.newPage();
  await androidPage.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await androidPage.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');

  await androidPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 700));

  const androidDetails = await androidPage.evaluate(() => {
    const splash = document.querySelector('[role="dialog"][aria-label*="TripVerse Opening Animation"]');
    if (!splash) return { found: false };
    const label = splash.getAttribute('aria-label') || '';
    const statusBar = splash.innerText.includes('5G • GPS') && splash.innerText.includes('Material You');
    const androidBadge = splash.innerText.includes('Material You • Android 15');
    const navPill = splash.innerText.includes('Tap anywhere to enter');
    const statusText = splash.innerText.includes('Syncing Google Play Services & Navigation...') ||
                       splash.innerText.includes('Mapping verified highway food & fuel stops...') ||
                       splash.innerText.includes('Initializing travel engine...');
    const platformToggle = !!splash.querySelector('.splash-platform-toggle');
    return {
      found: true,
      label,
      isAndroidMode: label.includes('Android'),
      statusBar,
      androidBadge,
      navPill,
      statusText,
      platformToggle
    };
  });

  console.log('Android Opening Details:', androidDetails);
  await androidPage.screenshot({ path: path.join(brainDir, 'android_opening_animation.png') });
  console.log('Saved android_opening_animation.png');

  // Wait for animation to finish
  await new Promise(r => setTimeout(r, 2200));
  const androidAfterSplash = await androidPage.evaluate(() => {
    const splash = document.querySelector('[role="dialog"][aria-label*="TripVerse Opening Animation"]');
    const navbar = !!document.querySelector('nav');
    return { splashClosed: !splash, navbarVisible: navbar };
  });
  console.log('Android After Splash Exit:', androidAfterSplash);
  await androidPage.screenshot({ path: path.join(brainDir, 'android_app_ready.png') });
  console.log('Saved android_app_ready.png');

  console.log('\n=== TEST 3: Interactive Platform Switcher Test ===');
  const togglePage = await browser.newPage();
  await togglePage.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });
  await togglePage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 400));

  // Switch to Android while in iOS viewport
  await togglePage.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.splash-platform-toggle button'));
    const androidBtn = buttons.find(b => b.textContent && b.textContent.includes('Android'));
    if (androidBtn) androidBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));

  const switchedMode = await togglePage.evaluate(() => {
    const splash = document.querySelector('[role="dialog"][aria-label*="TripVerse Opening Animation"]');
    return splash ? splash.getAttribute('aria-label') : '';
  });
  console.log('Switched platform to:', switchedMode);
  await togglePage.screenshot({ path: path.join(brainDir, 'platform_toggle_switched.png') });

  console.log('\n=== TEST 4: Tap to Skip Responsiveness ===');
  const skipPage = await browser.newPage();
  await skipPage.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });
  await skipPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 300));

  // Tap splash screen
  await skipPage.click('[role="dialog"][aria-label*="TripVerse Opening Animation"]');
  await new Promise(r => setTimeout(r, 450));

  const skippedState = await skipPage.evaluate(() => {
    const splash = document.querySelector('[role="dialog"][aria-label*="TripVerse Opening Animation"]');
    return { splashClosed: !splash };
  });
  console.log('Tap to skip result:', skippedState);

  console.log('\n=== TEST 5: Profile View Replay Button ===');
  const profilePage = await browser.newPage();
  await profilePage.setViewport({ width: 1200, height: 800 });
  // Skip initial splash
  await profilePage.goto('http://localhost:5173/#profile', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500)); // wait past initial splash

  const profileReplaySuccess = await profilePage.evaluate(() => {
    const replayBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Opening Animation'));
    if (replayBtn) {
      replayBtn.click();
      return true;
    }
    return false;
  });
  await new Promise(r => setTimeout(r, 500));

  const splashReplayed = await profilePage.evaluate(() => {
    return !!document.querySelector('[role="dialog"][aria-label*="TripVerse Opening Animation"]');
  });
  console.log('Profile View Replay Triggered:', profileReplaySuccess, 'Splash visible again:', splashReplayed);
  await profilePage.screenshot({ path: path.join(brainDir, 'profile_replay_splash.png') });

  await browser.close();
  console.log('\nAll validation tests finished successfully!');
}

main().catch(err => {
  console.error('Error running opening animation tests:', err);
  process.exit(1);
});
