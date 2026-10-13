import puppeteer from 'puppeteer-core';

async function testGoogleBtn() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  const result = await page.evaluate(async () => {
    const clientId = '472521464151-p64pmj4q5uh9oo9o6nl6hrqaef83tt5t.apps.googleusercontent.com';
    let initOk = false;
    let renderOk = false;
    let tokenClientOk = false;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => console.log('GIS callback:', res)
      });
      initOk = true;
    } catch (e) {
      console.error('id.initialize failed:', e);
    }

    try {
      const container = document.createElement('div');
      container.id = 'test-g-btn';
      document.body.appendChild(container);
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with'
      });
      renderOk = true;
    } catch (e) {
      console.error('id.renderButton failed:', e);
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: (res) => console.log('oauth2 callback:', res)
      });
      tokenClientOk = typeof client?.requestAccessToken === 'function';
    } catch (e) {
      console.error('oauth2.initTokenClient failed:', e);
    }

    return { initOk, renderOk, tokenClientOk };
  });

  console.log('Result:', result);
  await browser.close();
}

testGoogleBtn().catch(console.error);
