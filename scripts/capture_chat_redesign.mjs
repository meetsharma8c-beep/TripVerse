import puppeteer from 'puppeteer-core';
import fs from 'fs';

const chromePaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium'
];

let executablePath = chromePaths.find(p => fs.existsSync(p));

async function run() {
  if (!executablePath) {
    console.error('No Chrome binary found');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  const userId = 'a4b2c1d0-9988-4433-2211-123456789abc';
  const session = {
    token: 'live_token_123',
    expiresAt: Date.now() + 86400000,
    user: {
      uid: userId,
      email: 'alex.rivera@trip-verse.com',
      displayName: 'Alex Rivera',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      travelerStyle: 'Luxury Explorer',
      travelStyleTag: 'Explorer',
      location: 'Dubai, UAE',
      occupation: 'Creative Director',
      age: 29,
      emailVerified: true,
      provider: 'email',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      subscriptionTier: 'pro'
    }
  };

  const sampleMessages = [
    {
      id: 'm1',
      sender: 'user',
      text: 'Plan a 5-day luxury itinerary in Dubai with fine dining, desert safari, and iconic architecture.',
      timestamp: '10:42 AM'
    },
    {
      id: 'm2',
      sender: 'ai',
      text: "I've crafted an exquisite 5-day luxury Dubai itinerary combining Michelin dining, bespoke desert dunes glamping, and VIP access to world-class architectural marvels.\n\n### Highlights:\n- **Day 1**: Private sunset viewing at At The Top, Burj Khalifa SKY (Level 148) followed by dinner at *Atmosphere*.\n- **Day 2**: Vintage Land Rover wildlife safari & stargazing with private Bedouin dining at Al Maha Reserve.\n- **Day 3**: Museum of the Future guided VIP walk & sunset yacht charter across Dubai Marina.\n- **Day 4**: Old Dubai & Al Fahidi historical district heritage tour + Michelin-starred dinner at *Tresind Studio*.\n- **Day 5**: Relaxed cabana morning at Aura Skypool and boutique perfumery experience at Alserkal Avenue.",
      timestamp: '10:42 AM',
      engine: 'concode_brain',
      confidence: 99,
      guild: 'Concierge AI',
      guildIcon: 'sparkles',
      actionButtons: [
        {
          label: 'Book VIP Burj Khalifa & Desert Safari Experience',
          action: 'book_experience',
          primary: true
        },
        {
          label: 'View 3D Landmark Twin',
          action: 'view_3d',
          payload: { landmark: 'Burj Khalifa' }
        },
        {
          label: 'Budget Breakdown (₹1,85,000)',
          action: 'view_budget'
        },
        {
          label: 'Optimize Schedule (-15% Time)',
          action: 'optimize_schedule'
        },
        {
          label: 'Export Trip Passport PDF',
          action: 'export_pdf'
        }
      ]
    }
  ];

  await page.evaluateOnNewDocument((sess, msgs, uId) => {
    localStorage.setItem('tripverse_onboarding_completed', 'true');
    localStorage.setItem('tripverse_auth_session_v3', JSON.stringify(sess));
    localStorage.setItem(`tripverse_chat_u_${uId}`, JSON.stringify(msgs));
  }, session, sampleMessages, userId);

  console.log('Navigating to https://trip-verse.com/#home ...');
  await page.goto('https://trip-verse.com/#home', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Dismiss any tour modal if present
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const skip = buttons.find(b => b.textContent?.includes('Skip') || b.textContent?.includes('Got it'));
    if (skip) skip.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Open ConCode Chat Drawer
  console.log('Opening ConCode Chat Drawer via floating mascot...');
  const clicked = await page.evaluate(() => {
    const mascotBtn = document.querySelector('button[aria-label="Open ConCode AI Travel Assistant"]');
    if (mascotBtn) {
      mascotBtn.click();
      return 'clicked mascot';
    }
    const hintBtn = document.querySelector('button[aria-label="ConCode AI Co-Pilot"] button');
    if (hintBtn) {
      hintBtn.click();
      return 'clicked hint';
    }
    const anyAi = document.querySelector('button[title*="AI"], button[aria-label*="AI"]');
    if (anyAi) {
      anyAi.click();
      return 'clicked anyAi';
    }
    return 'none found';
  });

  console.log('Chat button status:', clicked);
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot Desktop
  const desktopPath = '/Users/ms/.gemini/antigravity/brain/a8899a96-22c7-445a-abb8-4b193dcde446/concode_chat_redesign_live.png';
  await page.screenshot({ path: desktopPath });
  console.log('Saved desktop screenshot to', desktopPath);

  // Switch to mobile viewport and open drawer on mobile
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    const mascotBtn = document.querySelector('button[aria-label="Open ConCode AI Travel Assistant"]');
    if (mascotBtn) mascotBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const mobilePath = '/Users/ms/.gemini/antigravity/brain/a8899a96-22c7-445a-abb8-4b193dcde446/concode_chat_redesign_mobile.png';
  await page.screenshot({ path: mobilePath });
  console.log('Saved mobile screenshot to', mobilePath);

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
