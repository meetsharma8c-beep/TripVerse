import puppeteer from 'puppeteer-core';

async function clickByText(page, text) {
  return await page.evaluate((targetText) => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes(targetText));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, text);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  console.log('Navigating to http://127.0.0.1:5173/');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

  // 1. Home Screenshot
  await page.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_home.png'
  });
  console.log('1. Saved tripverse_home.png');

  // 2. Click "Open Itinerary"
  const clickedItinerary = await clickByText(page, 'Open Itinerary');
  console.log('Clicked Open Itinerary:', clickedItinerary);
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_itinerary.png'
  });
  console.log('2. Saved tripverse_itinerary.png');

  // 3. Click Smart Route Map Tab
  const clickedRoute = await clickByText(page, 'Smart Route Map');
  console.log('Clicked Smart Route Map:', clickedRoute);
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_route_map.png'
  });
  console.log('3. Saved tripverse_route_map.png');

  // 4. Click Break Stops Tab
  const clickedBreakStops = await clickByText(page, 'Break Stops');
  console.log('Clicked Break Stops:', clickedBreakStops);
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_breakstops.png'
  });
  console.log('4. Saved tripverse_breakstops.png');

  // 5. Click Budget Optimizer Tab
  const clickedBudget = await clickByText(page, 'Budget Optimizer');
  console.log('Clicked Budget Optimizer:', clickedBudget);
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_budget_optimizer.png'
  });
  console.log('5. Saved tripverse_budget_optimizer.png');

  // 6. Click AI Assistant
  const clickedAI = await clickByText(page, 'AI Assistant');
  console.log('Clicked AI Assistant:', clickedAI);
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_ai_assistant.png'
  });
  console.log('6. Saved tripverse_ai_assistant.png');

  // 7. Go back Home and open Planner Wizard
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  const clickedPlan = await clickByText(page, 'Plan My Trip');
  console.log('Clicked Plan My Trip:', clickedPlan);
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({
    path: '/Users/ms/.gemini/antigravity-ide/brain/f7b178e8-6ea8-48d0-b47d-0901b363dc7b/tripverse_planner_wizard.png'
  });
  console.log('7. Saved tripverse_planner_wizard.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch(console.error);
