const fs = require('fs');
let content = fs.readFileSync('src/data/products.ts', 'utf8');
content = content.replace(/category:\s*'organics'/g, "category: 'essentials'");
content = content.replace(/category:\s*'(snacks|seeds)'/g, "category: 'snacks-seeds'");
content = content.replace(/category:\s*'combos'/g, "category: 'deals'");
fs.writeFileSync('src/data/products.ts', content);
