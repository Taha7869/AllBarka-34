const fs = require('fs');

let content = fs.readFileSync('src/components/ProductCard.tsx', 'utf-8');
content = content.replace(/import React, \{ useState \} from 'react';/, "import React, { useState } from 'react';\nimport { motion } from 'motion/react';\nimport { useToast } from './ToastManager';");

// Replace top level <div> with <motion.div whileInView...>
content = content.replace(/<div\n\s*className=\{\`group relative bg-\[#FAF9F5\] border border-\[#D4AF37\]\/30 rounded-2xl sm:rounded-3xl flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-\[#D4AF37\]\/50 \$\{/, `<motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={\`group relative bg-[#FAF9F5] border border-[#D4AF37]/30 rounded-2xl sm:rounded-3xl flex flex-col overflow-hidden transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(212,175,106,0.3)] hover:border-[#D4AF37]/50 \${`);
      
content = content.replace(/<\/div>\n\s*\);\n\}/, '</motion.div>\n  );\n}');

// Add toast hook
content = content.replace(/const \[addedToast, setAddedToast\] = useState\(false\);/, "const [addedToast, setAddedToast] = useState(false);\n  const { addToast } = useToast();");

// Replace handleBuy
content = content.replace(/const handleBuy = \(e: React\.MouseEvent\) => \{[\s\S]*?setAddedToast\(true\);\n\s*setTimeout\(\(\) => setAddedToast\(false\), 2000\);\n\s*\};/, `const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product.id, selectedWeight);
    setAddedToast(true);
    addToast(product.name + ' added to cart');
    setTimeout(() => setAddedToast(false), 2000);
  };`);

// Update add to cart button motion
// className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm
content = content.replace(/<button\n\s*type="button"\n\s*onClick=\{handleBuy\}\n\s*className=\{\`w-full/, `<motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleBuy}
            className={\`w-full`);
content = content.replace(/<\/button>\n\s*<\/div>\n\s*<\/div>\n\s*<\/motion.div>/, `</motion.button>\n          </div>\n        </div>\n    </motion.div>`);

fs.writeFileSync('src/components/ProductCard.tsx', content);
