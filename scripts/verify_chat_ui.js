import puppeteer from 'puppeteer-core';
import fs from 'fs';

const chromePaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium'
];

let executablePath = chromePaths.find(p => fs.existsSync(p));

async function main() {
  if (!executablePath) {
    console.log('No local Chrome binary found');
    return;
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });

  // Set onboarding as completed before navigation
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('tripverse_onboarding_completed', 'true');
  });

  console.log('Navigating to http://localhost:5173/#home ...');
  await page.goto('http://localhost:5173/#home', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Dismiss any modal if open
  await page.evaluate(() => {
    const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Skip Tour') || b.textContent?.includes('Skip'));
    if (skipBtn) skipBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Click ConCode AI button in Navbar
  console.log('Clicking ConCode AI button...');
  await page.evaluate(() => {
    const concodeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('ConCode AI'));
    if (concodeBtn) {
      concodeBtn.click();
    } else {
      console.log('ConCode AI button not found directly, clicking generic AI');
      const anyAi = document.querySelector('button[title*="AI"]');
      if (anyAi) anyAi.click();
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  const inputSelector = 'input[placeholder*="Ask anything"]';
  const hasInput = await page.$(inputSelector);
  console.log('Chat input detected:', !!hasInput);

  if (hasInput) {
    // 1. "Plan a 5-day trip to Dubai"
    console.log('Typing: Plan a 5-day trip to Dubai ...');
    await page.type(inputSelector, 'Plan a 5-day trip to Dubai');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1200));

    // 2. "I have ₹1,00,000"
    console.log('Typing: I have ₹1,00,000 ...');
    await page.type(inputSelector, 'I have ₹1,00,000');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1200));

    // 3. "I like food and architecture"
    console.log('Typing: I like food and architecture ...');
    await page.type(inputSelector, 'I like food and architecture');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot with Structured Itinerary Card
    await page.screenshot({ path: '/Users/ms/.gemini/antigravity-ide/brain/56fb1911-45fc-4746-975b-6d8ea9c745a8/concode_ai_chat_itinerary.png' });
    console.log('Saved screenshot: concode_ai_chat_itinerary.png');

    // 4. "Make Day 3 cheaper"
    console.log('Typing: Make Day 3 cheaper ...');
    await page.type(inputSelector, 'Make Day 3 cheaper');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1500));

    // 5. "What will this trip approximately cost?"
    console.log('Typing: What will this trip approximately cost? ...');
    await page.type(inputSelector, 'What will this trip approximately cost?');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1500));

    // Screenshot with Budget Breakdown Card and Modification Badge
    await page.screenshot({ path: '/Users/ms/.gemini/antigravity-ide/brain/56fb1911-45fc-4746-975b-6d8ea9c745a8/concode_ai_chat_budget.png' });
    console.log('Saved screenshot: concode_ai_chat_budget.png');
  }

  await browser.close();
}

main().catch(console.error);
