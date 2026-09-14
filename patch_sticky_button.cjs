const fs = require('fs');

let content = fs.readFileSync('src/components/StickyCartBottomBar.tsx', 'utf-8');
content = content.replace(/<button\n\s*id="sticky-cart-checkout-btn"/, `<motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              id="sticky-cart-checkout-btn"`);
content = content.replace(/<\/button>\n\s*<\/div>\n\s*<\/motion\.div>/, `</motion.button>\n          </div>\n        </motion.div>`);
fs.writeFileSync('src/components/StickyCartBottomBar.tsx', content);
console.log("Patched StickyCartBottomBar button");
