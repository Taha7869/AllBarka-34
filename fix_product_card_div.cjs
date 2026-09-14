const fs = require('fs');

let content = fs.readFileSync('src/components/ProductCard.tsx', 'utf-8');

content = content.replace(/<div\n\s*onClick=\{\(\) => onQuickView && onQuickView\(product\)\}\n\s*className="group\/card/, `<motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onQuickView && onQuickView(product)}
      className="group/card`);
      
fs.writeFileSync('src/components/ProductCard.tsx', content);
console.log("Patched div to motion.div");
