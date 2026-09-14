const fs = require('fs');

let content = fs.readFileSync('src/components/CartDrawer.tsx', 'utf-8');

// Replace empty cart button logic
const oldEmptyBtn = `<button
                type="button"
                onClick={onClose}
                className="mt-2 px-7 py-3 rounded-full bg-[var(--color-gold,#B8935F)] hover:bg-[#A67C48] text-white text-[11px] font-sans font-bold uppercase tracking-[0.2em] transition-all duration-300 shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >`;
const newEmptyBtn = `<button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/shop');
                }}
                className="mt-2 px-7 py-3 rounded-full bg-[#B8935F] hover:bg-[#A67C48] text-[#FFFFFF] text-[11px] font-sans font-bold uppercase tracking-[0.2em] transition-all duration-300 shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-[#B8935F]"
              >
                <ShoppingBag size={14} />
                <span>Browse Selections</span>`;

content = content.replace(oldEmptyBtn + `\n                Browse Selections`, newEmptyBtn);

// Now add the browse more link at the bottom, just below checkout button
const checkoutBtnStr = `              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/checkout');
                }}
                className="w-full py-4 rounded-xl bg-[var(--color-ink,#1A1A1A)] hover:bg-[var(--color-gold,#B8935F)] text-white hover:text-[var(--color-ink,#1A1A1A)] font-sans font-bold text-xs uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck size={16} />
                <span>Secure Checkout</span>
              </button>`;

const browseMoreStr = `\n              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/shop');
                }}
                className="w-full text-center text-[11px] font-bold font-sans text-[#B8935F] hover:underline pt-2 cursor-pointer"
              >
                ← Browse More Items from Boutique
              </button>`;

content = content.replace(checkoutBtnStr, checkoutBtnStr + browseMoreStr);

// Ensure useNavigate is imported if not already
if (!content.includes('import { useNavigate }')) {
  content = content.replace(/import { motion } from 'motion\/react';/, "import { useNavigate } from 'react-router-dom';\nimport { motion } from 'motion/react';");
}

fs.writeFileSync('src/components/CartDrawer.tsx', content);
