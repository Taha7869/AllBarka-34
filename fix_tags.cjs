const fs = require('fs');

let content = fs.readFileSync('src/components/ProductCard.tsx', 'utf-8');

// Replace the `<button` opening tag for the handleBuy button
content = content.replace(/<button\n\s*type="button"\n\s*onClick=\{handleBuy\}\n\s*className=\{\`px-4/, `<motion.button\n            whileHover={{ scale: 1.02 }}\n            whileTap={{ scale: 0.97 }}\n            type="button"\n            onClick={handleBuy}\n            className={\`px-4`);

// Check if the opening div is actually motion.div
if (!content.includes('<motion.div\n      initial={{ opacity: 0')) {
  // It probably failed before too! Let's check how the root tag looks.
  content = content.replace(/<div\n\s*className=\{\`group relative bg-\[#FAF9F5\] border border-\[#D4AF37\]\/30/, `<motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={\`group relative bg-[#FAF9F5] border border-[#D4AF37]/30`);
}

fs.writeFileSync('src/components/ProductCard.tsx', content);
