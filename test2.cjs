const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR LOG:', msg.text());
    } else {
      // console.log('PAGE LOG:', msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR EXCEPTION:', err.toString());
  });
  
  console.log('Navigating to homepage...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // click random links to trigger error
  console.log('Clicking around...');
  const links = await page.$$('a');
  for (let i = 0; i < Math.min(links.length, 5); i++) {
     try {
       await links[i].click();
       await new Promise(r => setTimeout(r, 1000));
     } catch(e) {}
  }

  await browser.close();
})();
