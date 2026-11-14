import puppeteer from 'puppeteer-core';
import fs from 'fs';

const chromePaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium'
];

let executablePath = chromePaths.find(p => fs.existsSync(p));

async function run() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('tripverse_onboarding_completed', 'true');
  });

  console.log('Navigating to https://trip-verse.com/#home ...');
  await page.goto('https://trip-verse.com/#home', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Dismiss any modal
  await page.evaluate(() => {
    const skip = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Skip'));
    if (skip) skip.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const outPath = '/Users/ms/.gemini/antigravity/brain/a8899a96-22c7-445a-abb8-4b193dcde446/concode_welcome_widget_live.png';
  await page.screenshot({ path: outPath });
  console.log('Saved welcome widget screenshot to', outPath);

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
