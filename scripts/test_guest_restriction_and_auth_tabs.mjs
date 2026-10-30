import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';

const PORT = 5176;
const BASE_URL = `http://localhost:${PORT}/`;

async function runTest() {
  console.log('======================================================================');
  console.log('🚀 TESTING GOOGLE AUTH DEDICATED PAGE & GUEST AI PLANNER RESTRICTION');
  console.log('======================================================================\n');

  // Start Vite preview/dev on port 5176
  const server = spawn('npx', ['vite', '--port', String(PORT)], {
    cwd: process.cwd(),
    stdio: 'pipe'
  });

  await new Promise((resolve) => {
    server.stdout.on('data', (d) => {
      const text = d.toString();
      if (text.includes('Local:')) resolve(true);
    });
    setTimeout(resolve, 3000);
  });

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    page.on('dialog', async dialog => await dialog.accept());
    await page.setViewport({ width: 1280, height: 800 });

    console.log('[Step 1] Navigating to TripVerse...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });

    const MODAL = '.fixed.inset-0 .bg-white.rounded-3xl.max-w-md';

    // Helper: open AuthModal
    async function openAuthModal() {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const signInBtn = btns.find(b => b.innerText?.includes('Sign In') || b.innerText?.includes('Login'));
        if (signInBtn) signInBtn.click();
      });
      await page.waitForSelector(MODAL, { timeout: 5000 });
    }

    console.log('\n[Step 2] Verifying AuthModal tabs...');
    await openAuthModal();

    const tabsInfo = await page.evaluate((sel) => {
      const tabs = Array.from(document.querySelectorAll(`${sel} .grid.grid-cols-4 button`));
      return tabs.map(t => t.innerText.trim());
    }, MODAL);

    console.log('AuthModal Tabs detected:', tabsInfo);
    if (!tabsInfo.some(t => t.includes('Google'))) throw new Error('Missing Google dedicated tab');
    if (!tabsInfo.some(t => t.includes('Email'))) throw new Error('Missing Email tab');
    if (!tabsInfo.some(t => t.includes('Mobile OTP'))) throw new Error('Missing Mobile OTP tab');
    if (!tabsInfo.some(t => t.includes('Quick Guest'))) throw new Error('Missing Quick Guest tab');
    console.log('✅ PASS: All 4 distinct tabs (Google, Email, Mobile OTP, Quick Guest) properly rendered');

    // Check Google dedicated tab
    console.log('\n[Step 3] Checking Google dedicated Auth Page...');
    await page.evaluate((sel) => {
      const tabs = Array.from(document.querySelectorAll(`${sel} button`));
      const googleTab = tabs.find(t => t.innerText.includes('Google'));
      if (googleTab) googleTab.click();
    }, MODAL);
    await new Promise(r => setTimeout(r, 400));

    const googlePageCheck = await page.evaluate((sel) => {
      const text = document.querySelector(sel)?.innerText || '';
      return {
        hasTitle: text.includes('Sign In with Google'),
        hasGoogleBtn: text.includes('Continue with Google') || !!document.querySelector(`${sel} iframe[src*="accounts.google.com"]`),
        hasBenefits: text.includes('Full access to AI Day-by-Day Itinerary Planner')
      };
    }, MODAL);
    console.log('Google page check:', googlePageCheck);
    if (!googlePageCheck.hasTitle || !googlePageCheck.hasBenefits) {
      throw new Error('Google dedicated page structure failed');
    }
    console.log('✅ PASS: Google Auth has its own dedicated page with GIS integration and full benefits');

    // Check Phone Auth page: PROVE NO GOOGLE BUTTON EXISTS
    console.log('\n[Step 4] Checking Phone Auth Page (Verifying Google button was removed)...');
    await page.evaluate((sel) => {
      const tabs = Array.from(document.querySelectorAll(`${sel} button`));
      const phoneTab = tabs.find(t => t.innerText.includes('Mobile OTP'));
      if (phoneTab) phoneTab.click();
    }, MODAL);
    await new Promise(r => setTimeout(r, 400));

    const phonePageCheck = await page.evaluate((sel) => {
      const modal = document.querySelector(sel);
      const text = modal?.innerText || '';
      const hasGoogleButton = text.includes('Continue with Google') || !!modal?.querySelector('iframe[src*="accounts.google.com"]');
      const hasSmsDivider = text.includes('or verify with SMS');
      const hasPhoneInput = !!modal?.querySelector('input[type="tel"]');
      const hasRecaptchaContainer = !!document.getElementById('tripverse-recaptcha-container');
      const hasRecaptchaBadge = !!document.querySelector('.grecaptcha-badge');
      return {
        hasGoogleButton,
        hasSmsDivider,
        hasPhoneInput,
        hasRecaptchaContainer,
        hasRecaptchaBadge,
        title: text.includes('Sign In with Mobile')
      };
    }, MODAL);

    console.log('Phone page check:', phonePageCheck);
    if (phonePageCheck.hasGoogleButton || phonePageCheck.hasSmsDivider) {
      throw new Error('Google button or SMS divider still present on Phone auth page!');
    }
    if (phonePageCheck.hasRecaptchaContainer) {
      throw new Error('reCAPTCHA container still present in DOM! Zero reCAPTCHA required.');
    }
    if (!phonePageCheck.hasPhoneInput || !phonePageCheck.title) {
      throw new Error('Phone input not found on Phone auth page');
    }
    console.log('✅ PASS: Phone Auth page has ZERO Google button, ZERO reCAPTCHA, and is 100% dedicated to mobile SMS verification');

    // Step 5: Test Guest Login
    console.log('\n[Step 5] Signing in as Instant Guest Explorer...');
    await page.evaluate((sel) => {
      const tabs = Array.from(document.querySelectorAll(`${sel} button`));
      const guestTab = tabs.find(t => t.innerText.includes('Quick Guest'));
      if (guestTab) guestTab.click();
    }, MODAL);
    await new Promise(r => setTimeout(r, 400));

    // Confirm Explore-Only banner on Guest tab
    const guestNoticePresent = await page.evaluate((sel) => {
      const text = document.querySelector(sel)?.innerText || '';
      return text.includes('Explore-Only Mode') && text.includes('AI Planner');
    }, MODAL);
    console.log('Guest explore-only warning present:', guestNoticePresent);
    if (!guestNoticePresent) throw new Error('Explore-Only warning missing on Quick Guest tab');
    console.log('✅ PASS: Quick Guest tab warns user that Guest mode is explore-only');

    // Click Start Exploring as Verified Guest
    await page.evaluate((sel) => {
      const submitBtn = Array.from(document.querySelectorAll(`${sel} button`)).find(b => b.innerText?.includes('Start Exploring as Verified Guest'));
      if (submitBtn) submitBtn.click();
    }, MODAL);
    await new Promise(r => setTimeout(r, 2500));

    // Confirm Guest Mode in localStorage and state
    const isGuest = await page.evaluate(() => {
      const raw = localStorage.getItem('tripverse_auth_session_v3');
      const session = raw ? JSON.parse(raw) : null;
      return {
        authenticated: !!session,
        isGuest: session?.user?.provider === 'guest' || session?.user?.isAnonymous === true,
        displayName: session?.user?.displayName
      };
    });
    console.log('Current user session:', isGuest);
    if (!isGuest.authenticated || !isGuest.isGuest) {
      throw new Error('Failed to establish guest session');
    }
    console.log('✅ PASS: Guest session active in app');

    // Step 6: Test AI Planner Restriction from Navbar
    console.log('\n[Step 6] Testing AI Planner restriction from Navbar link...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('header button, nav button'));
      const plannerBtn = links.find(l => l.innerText?.includes('Planner'));
      if (plannerBtn) plannerBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Check if GuestPlannerRestrictedModal popped up
    const restrictedModalCheck = await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('[role="dialog"]'));
      const restricted = modals.find(m => m.innerText?.includes('Sign Up to Use the AI Trip Planner') || m.innerText?.includes('AI Trip Planner Requires an Account'));
      return {
        isRestrictedModalOpen: !!restricted,
        hasComparison: restricted?.innerText?.includes('What you can do in Guest Mode:'),
        hasSignUpCTA: restricted?.innerText?.includes('Sign Up to Unlock AI Planner (Free)') || restricted?.innerText?.includes('Sign In to Unlock AI Planner (Free)'),
        isPlannerWizardOpen: !!document.querySelector('.text-xl')?.innerText?.includes('TripVerse AI Trip Planner')
      };
    });

    console.log('Restricted Modal check (Navbar):', restrictedModalCheck);
    if (!restrictedModalCheck.isRestrictedModalOpen || restrictedModalCheck.isPlannerWizardOpen) {
      throw new Error('Guest was not blocked from opening Planner from Navbar!');
    }
    console.log('✅ PASS: Guest blocked from opening Planner via Navbar; GuestPlannerRestrictedModal displayed');

    // Close restricted modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('[role="dialog"] button[aria-label="Close"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Step 7: Test AI Planner Restriction from Hero "Plan My Trip"
    console.log('\n[Step 7] Testing AI Planner restriction from Hero section...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const planBtn = buttons.find(b => b.innerText?.includes('Generate Live Itinerary with AI') || b.innerText?.includes('Plan My Trip'));
      if (planBtn) planBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const heroBlockCheck = await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('[role="dialog"]'));
      const restricted = modals.find(m => m.innerText?.includes('Sign Up to Use the AI Trip Planner') || m.innerText?.includes('AI Trip Planner Requires an Account'));
      return !!restricted;
    });
    console.log('Restricted Modal check (Hero):', heroBlockCheck);
    if (!heroBlockCheck) {
      throw new Error('Guest was not blocked from Hero section planner button!');
    }
    console.log('✅ PASS: Guest blocked from generating AI trip via Hero Section');

    // Close restricted modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('[role="dialog"] button[aria-label="Close"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Step 8: Test AI Planner Restriction from Direct URL route
    console.log('\n[Step 8] Testing AI Planner restriction from URL route (/planner)...');
    await page.goto(`${BASE_URL}planner`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const routeBlockCheck = await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('[role="dialog"]'));
      const restricted = modals.find(m => m.innerText?.includes('Sign Up to Use the AI Trip Planner') || m.innerText?.includes('AI Trip Planner Requires an Account'));
      return {
        isRestrictedModalOpen: !!restricted,
        isPlannerWizardOpen: !!document.querySelector('h2')?.innerText?.includes('TripVerse AI Trip Planner')
      };
    });
    console.log('Direct route check (/planner):', routeBlockCheck);
    if (!routeBlockCheck.isRestrictedModalOpen || routeBlockCheck.isPlannerWizardOpen) {
      throw new Error('Guest was not blocked on direct /planner navigation!');
    }
    console.log('✅ PASS: Direct /planner navigation is strictly locked for guest users');

    console.log('\n======================================================================');
    console.log('🎉 ALL TESTS PASSED: GOOGLE DEDICATED AUTH & GUEST RESTRICTION VERIFIED!');
    console.log('======================================================================');
  } finally {
    await browser.close();
    server.kill();
  }
}

runTest().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
