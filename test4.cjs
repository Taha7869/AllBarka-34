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
  
  await page.goto(`http://localhost:3000/`, { waitUntil: 'networkidle0' });
  
  // click cart button
  console.log('Clicking cart');
  await page.evaluate(() => { document.querySelector('#header-cart-btn')?.click() });
  await new Promise(r => setTimeout(r, 1000));
  
  // close cart
  await page.evaluate(() => { document.querySelector('.lucide-x')?.parentElement?.click() });
  
  console.log('Clicking patron lounge');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pBtn = btns.find(b => b.textContent.includes('Patron Login') || b.textContent.includes('VIP Patron'));
    if (pBtn) pBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  await browser.close();
  if (hasError) process.exit(1);
})();
