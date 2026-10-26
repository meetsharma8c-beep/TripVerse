import puppeteer from 'puppeteer-core';

async function testFreshUser() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const brainDir = '/Users/ms/.gemini/antigravity-ide/brain/f63bb7fe-0321-4faf-b5a5-32557bb4b315';
  const page = await browser.newPage();
  await page.setViewport({ width: 414, height: 896, isMobile: true, hasTouch: true });

  // Clear storage first
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Reload afresh
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2200)); // wait past splash

  // Dismiss onboarding modal if shown
  await page.evaluate(() => {
    const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Skip Tour'));
    if (skipBtn) skipBtn.click();
    const notNowBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Not Now'));
    if (notNowBtn) notNowBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 1. Check Profile Tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav button'));
    const profileBtn = btns.find(b => b.textContent && b.textContent.includes('Profile'));
    if (profileBtn) profileBtn.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  const profileData = await page.evaluate(() => {
    return {
      hasRahul: document.body.innerText.includes('Rahul Mehta'),
      hasMeet: document.body.innerText.includes('Meet Sharma'),
      hasExplorer: document.body.innerText.includes('Traveler Explorer'),
      hasGuestMode: document.body.innerText.includes('Guest Mode'),
      avatarSrc: document.querySelector('img[alt*="Traveler"], img[alt*="Profile"]')?.src || ''
    };
  });

  console.log('--- Fresh User Profile Test ---');
  console.log('Contains Rahul Mehta?', profileData.hasRahul);
  console.log('Contains Meet Sharma?', profileData.hasMeet);
  console.log('Contains Traveler Explorer?', profileData.hasExplorer);
  console.log('Contains Guest Mode?', profileData.hasGuestMode);
  console.log('Avatar Src:', profileData.avatarSrc);

  await page.screenshot({ 
    path: `${brainDir}/fresh_user_profile.png`,
    fullPage: false 
  });

  // 2. Open Notification Center
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const notifBtn = btns.find(b => b.textContent && b.textContent.includes('Reminders')) ||
                     document.querySelector('button[title*="Notification"], button[title*="Reminders"]');
    if (notifBtn) notifBtn.click();
  });

  await new Promise(r => setTimeout(r, 800));

  const notifData = await page.evaluate(() => {
    const modal = document.querySelector('.bg-white.rounded-3xl.w-full.max-w-2xl');
    return {
      modalFound: !!modal,
      modalText: modal ? modal.innerText : '',
      hasCountdown: modal ? modal.innerText.includes('Departure Countdown') : false,
      hasCopilotReady: modal ? modal.innerText.includes('TripVerse Co-Pilot Ready') : false,
      hasSafetyNotif: modal ? modal.innerText.includes('Highway Safety & SOS Armed') : false,
      hasWelcomeNotif: modal ? modal.innerText.includes('Welcome to TripVerse Explorer') : false
    };
  });

  console.log('--- Fresh User Notification Test ---');
  console.log('Modal Found?', notifData.modalFound);
  console.log('Has fake countdown?', notifData.hasCountdown);
  console.log('Has Co-Pilot Ready card?', notifData.hasCopilotReady);
  console.log('Has Highway Safety & SOS Armed notif?', notifData.hasSafetyNotif);
  console.log('Has Welcome to TripVerse Explorer?', notifData.hasWelcomeNotif);

  await page.screenshot({ 
    path: `${brainDir}/fresh_user_notifications.png`,
    fullPage: false 
  });

  await browser.close();
}

testFreshUser().catch(err => {
  console.error(err);
  process.exit(1);
});
