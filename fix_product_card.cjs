const fs = require('fs');

let content = fs.readFileSync('src/components/ProductCard.tsx', 'utf-8');

// I replaced `<button` with `<motion.button`, but the closing tag was probably mismatched.
// Wait, the error is:
// Unexpected closing "motion.button" tag does not match opening "button" tag
// Unexpected closing "motion.div" tag does not match opening "div" tag

content = content.replace(/<button\n\s*type="button"\n\s*onClick=\{handleBuy\}\n\s*className=\{\`w-full/, `<motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleBuy}
            className={\`w-full`);
            
content = content.replace(/<\/button>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>/, `</motion.button>\n          </div>\n        </div>\n    </motion.div>`);

// Let's just fix it manually with regex.
// Wait, I already ran `patch_product_card.cjs` which modified `<button` to `<motion.button`, and `</button> ... </div>` to `</motion.button> ... </motion.div>`.
// So it seems there is a mismatch. Let's look at the end of the file.

fs.writeFileSync('src/components/ProductCard.tsx.debug', content);

