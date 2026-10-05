const puppeteer = require('puppeteer');
const path = require('path');

async function testFreshUser() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 414, height: 896, isMobile: true, hasTouch: true });

  // Clear all storage to simulate a brand new fresh visitor
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Reload afresh
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2200)); // wait past splash

  // 1. Check Profile Tab
  // Click on Profile nav button
  await page.evaluate(() => {
    // Find bottom nav buttons
    const btns = Array.from(document.querySelectorAll('nav button, [role="tab"], button'));
    const profileBtn = btns.find(b => b.textContent && b.textContent.includes('Profile'));
    if (profileBtn) profileBtn.click();
  });

  await new Promise(r => setTimeout(r, 800));

  const profileData = await page.evaluate(() => {
    return {
      bodyText: document.body.innerText,
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
    path: path.join(__dirname, '../fresh_user_profile.png'),
    fullPage: false 
  });

  // 2. Open Notification Center
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const notifBtn = btns.find(b => b.textContent && b.textContent.includes('Reminders')) ||
                     document.querySelector('button[title*="Notification"], button[title*="Reminders"]');
    if (notifBtn) notifBtn.click();
  });

  await new Promise(r => setTimeout(r, 600));

  const notifData = await page.evaluate(() => {
    const modal = document.querySelector('.bg-white.rounded-3xl.w-full.max-w-2xl');
    return {
      modalFound: !!modal,
      modalText: modal ? modal.innerText : '',
      hasCountdown: modal ? modal.innerText.includes('Departure Countdown') : false,
      hasCopilotReady: modal ? modal.innerText.includes('TripVerse Co-Pilot Ready') : false,
      hasSafetyNotif: modal ? modal.innerText.includes('Highway Safety & SOS Armed') : false
    };
  });

  console.log('--- Fresh User Notification Test ---');
  console.log('Modal Found?', notifData.modalFound);
  console.log('Has fake countdown?', notifData.hasCountdown);
  console.log('Has Co-Pilot Ready card?', notifData.hasCopilotReady);
  console.log('Has Highway Safety & SOS Armed notif?', notifData.hasSafetyNotif);

  await page.screenshot({ 
    path: path.join(__dirname, '../fresh_user_notifications.png'),
    fullPage: false 
  });

  await browser.close();
}

testFreshUser().catch(err => {
  console.error(err);
  process.exit(1);
});
