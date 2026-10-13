import puppeteer from 'puppeteer-core';

async function testGis() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Listen to console
  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  // Evaluate window.google
  const googleStatus = await page.evaluate(() => {
    return {
      hasGoogle: typeof window.google !== 'undefined',
      hasAccounts: typeof window.google?.accounts !== 'undefined',
      hasId: typeof window.google?.accounts?.id !== 'undefined',
      hasOAuth2: typeof window.google?.accounts?.oauth2 !== 'undefined'
    };
  });

  console.log('Google Identity Services status:', googleStatus);
  await browser.close();
}

testGis().catch(console.error);
