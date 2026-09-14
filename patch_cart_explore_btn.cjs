const fs = require('fs');
let content = fs.readFileSync('src/components/CartDrawer.tsx', 'utf-8');

const oldExploreBtn = `<button
                type="button"
                onClick={() => {
                  onClose();
                  setTimeout(() => {
                    const el = document.getElementById('products') || document.getElementById('gourmet-grid');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 90);
                }}
                className="mt-2 px-7 py-3 rounded-full bg-[#B8935F] hover:bg-[#A67C48] text-[#FFFFFF] text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer border border-[#B8935F]"
              >
                Explore Selections
              </button>`;

const newExploreBtn = `<button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/shop');
                }}
                className="mt-2 px-7 py-3 rounded-full bg-[#B8935F] hover:bg-[#A67C48] text-[#FFFFFF] text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer border border-[#B8935F] flex items-center justify-center gap-2"
              >
                <ShoppingBag size={14} />
                <span>Explore Selections</span>
              </button>`;

content = content.replace(oldExploreBtn, newExploreBtn);

fs.writeFileSync('src/components/CartDrawer.tsx', content);
