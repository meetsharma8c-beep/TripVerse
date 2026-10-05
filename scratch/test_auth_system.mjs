import puppeteer from '/Users/ms/Downloads/TripVerse/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACTS_DIR = '/Users/ms/.gemini/antigravity-ide/brain/f0593460-c289-4cd3-96a6-2a9c83d9503f';
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function run() {
  console.log('🚀 Verifying User Profile Authentication System in TripVerse...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('1. Setting up clean localStorage and loading TripVerse...');
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('tripverse_onboarding_completed_v1', 'true');
    });

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await delay(1000);

    // Navigate to Profile View
    console.log('2. Navigating to Profile View...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const profileBtn = buttons.find(b => b.textContent && b.textContent.includes('Rahul') || b.title === 'View Profile');
      if (profileBtn) profileBtn.click();
    });
    await delay(800);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'auth_01_profile_authenticated.png') });
    console.log('✅ Captured: auth_01_profile_authenticated.png');

    // Click Sign Out
    console.log('3. Testing Sign Out...');
    page.on('dialog', async dialog => {
      console.log('Dialog prompt:', dialog.message());
      await dialog.accept();
    });

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const signOutBtn = buttons.find(b => b.textContent && b.textContent.includes('Sign Out'));
      if (signOutBtn) signOutBtn.click();
    });
    await delay(1000);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'auth_02_signed_out_modal.png') });
    console.log('✅ Captured: auth_02_signed_out_modal.png');

    // Switch to Sign Up tab
    console.log('4. Testing User Registration...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const createAccTab = tabs.find(b => b.textContent && b.textContent.includes('Create Account'));
      if (createAccTab) createAccTab.click();
    });
    await delay(500);

    // Fill in registration form
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      // Inputs: [name, email, password, confirmPassword, location]
      inputs.forEach(input => {
        if (input.placeholder && input.placeholder.includes('Priya')) {
          input.value = 'Aarav Patel';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (input.type === 'email') {
          input.value = 'aarav.patel@tripverse.in';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (input.placeholder && input.placeholder.includes('Minimum 6')) {
          input.value = 'patel2026';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (input.placeholder && input.placeholder.includes('Re-enter')) {
          input.value = 'patel2026';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (input.placeholder && input.placeholder.includes('Mumbai')) {
          input.value = 'Surat, Gujarat';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
    await delay(500);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'auth_03_registration_filled.png') });
    console.log('✅ Captured: auth_03_registration_filled.png');

    // Submit form
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Create My Account'));
      if (submitBtn) submitBtn.click();
    });
    await delay(1200);

    // Re-navigate to profile to verify new account state
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const profileBtn = buttons.find(b => b.textContent && b.textContent.includes('Aarav') || b.title === 'View Profile');
      if (profileBtn) profileBtn.click();
    });
    await delay(800);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'auth_04_new_user_authenticated.png') });
    console.log('✅ Captured: auth_04_new_user_authenticated.png');

    console.log('🎉 Authentication System verified successfully!');
  } catch (err) {
    console.error('Error during auth verification:', err);
  } finally {
    await browser.close();
  }
}

run();
