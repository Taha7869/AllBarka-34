const fs = require('fs');
let content = fs.readFileSync('src/pages/ShopPage.tsx', 'utf-8');

content = content.replace(/initialCategory=\{category \|\| 'all'\}/, "initialCategory={category === 'wholesale' ? 'all' : (category || 'all')}");

fs.writeFileSync('src/pages/ShopPage.tsx', content);
