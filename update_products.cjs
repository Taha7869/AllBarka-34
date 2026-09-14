const fs = require('fs');

let content = fs.readFileSync('src/data/products.ts', 'utf8');

// We will use a regex to match the prices object and insert earnedPoints right after it.
// The prices object looks like: prices: { '250g': 1000, '500g': 2000 },
const updatedContent = content.replace(/prices:\s*({[^}]+})/g, (match, pricesStr) => {
  try {
    // Attempt to parse the prices object
    // It might have keys with quotes or without quotes. We can evaluate it safely.
    const prices = eval(`(${pricesStr})`);
    const earnedPoints = {};
    for (const key in prices) {
      // 5% of price
      earnedPoints[key] = Math.floor(prices[key] * 0.05);
    }
    // format the earnedPoints object back to string
    let epStr = 'earnedPoints: { ';
    for (const key in earnedPoints) {
      epStr += `"${key}": ${earnedPoints[key]}, `;
    }
    epStr += '}';
    return `${match},\n    ${epStr}`;
  } catch (e) {
    console.error(e);
    return match;
  }
});

fs.writeFileSync('src/data/products.ts', updatedContent);
