const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  let hasError = false;
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR LOG:', msg.text());
      hasError = true;
    }
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR EXCEPTION:', err.toString());
    hasError = true;
  });
  
  await page.goto(`http://localhost:3000/product/afghan-almonds`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  await browser.close();
})();
