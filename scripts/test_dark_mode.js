import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = '/Users/ms/.gemini/antigravity-ide/brain/bb5f96a0-49d0-4016-8da4-7f335a5f249a';

async function clickByText(page, text) {
  return await page.evaluate((targetText) => {
    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes(targetText));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, text);
}

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Set theme in localStorage to dark before loading
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('tripverse_theme', 'dark');
    localStorage.setItem('tripverse_onboarding_completed', 'true');
    localStorage.setItem('tripverse_has_visited', 'true');
  });

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // Wait for splash screen to dismiss if present
  await new Promise(r => setTimeout(r, 1200));

  // Screenshot 1: Desktop Home & Hero in Dark Mode
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'dark_v2_hero.png')
  });
  console.log('Saved dark_v2_hero.png');

  // Screenshot 2: Scroll to Inspiring Destinations
  await page.evaluate(() => {
    window.scrollBy(0, 750);
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'dark_v2_destinations.png')
  });
  console.log('Saved dark_v2_destinations.png');

  // Screenshot 3: Scroll further down to Quick Actions & phone mockup
  await page.evaluate(() => {
    window.scrollBy(0, 800);
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'dark_v2_midpage.png')
  });
  console.log('Saved dark_v2_midpage.png');

  // Screenshot 4: Scroll to Footer
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'dark_v2_footer.png')
  });
  console.log('Saved dark_v2_footer.png');

  // Screenshot 5: Global Search Modal (⌘K)
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    window.dispatchEvent(new CustomEvent('tripverse-open-search'));
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'dark_v2_search_modal.png')
  });
  console.log('Saved dark_v2_search_modal.png');

  // Close search modal
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // Screenshot 6: Navigate to Itinerary / Trips
  await clickByText(page, 'My Trips');
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'dark_v2_trips.png')
  });
  console.log('Saved dark_v2_trips.png');

  // Click on a trip to view Itinerary detail
  await clickByText(page, 'View Itinerary');
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'dark_v2_itinerary_detail.png')
  });
  console.log('Saved dark_v2_itinerary_detail.png');

  // Screenshot 7: Mobile viewport
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });
  await mobilePage.evaluateOnNewDocument(() => {
    localStorage.setItem('tripverse_theme', 'dark');
    localStorage.setItem('tripverse_onboarding_completed', 'true');
    localStorage.setItem('tripverse_has_visited', 'true');
  });
  await mobilePage.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  await mobilePage.screenshot({
    path: path.join(ARTIFACTS_DIR, 'dark_v2_mobile.png')
  });
  console.log('Saved dark_v2_mobile.png');

  // Mobile Itinerary tab
  await clickByText(mobilePage, 'Itinerary');
  await new Promise(r => setTimeout(r, 800));
  await mobilePage.screenshot({
    path: path.join(ARTIFACTS_DIR, 'dark_v2_mobile_itinerary.png')
  });
  console.log('Saved dark_v2_mobile_itinerary.png');

  await browser.close();
  console.log('All dark mode test screenshots captured!');
}

capture().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
