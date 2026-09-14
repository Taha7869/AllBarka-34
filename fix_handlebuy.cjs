const fs = require('fs');

let content = fs.readFileSync('src/components/ProductCard.tsx', 'utf-8');
content = content.replace(/setAddedToast\(true\);\n\s*setTimeout\(\(\) => setAddedToast\(false\), 1500\);/g, `setAddedToast(true);\n    addToast(product.name + ' added to cart');\n    setTimeout(() => setAddedToast(false), 1500);`);
fs.writeFileSync('src/components/ProductCard.tsx', content);
