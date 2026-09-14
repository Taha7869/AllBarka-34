const fs = require('fs');
let content = fs.readFileSync('src/pages/CheckoutPage.tsx', 'utf-8');

const emptyState = `
  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-cream,#FAF9F5)] pt-24 pb-12 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-[var(--color-gold,#B8935F)]/20 text-center">
          <div className="w-20 h-20 bg-[var(--color-cream,#FAF9F5)] rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={32} className="text-[var(--color-gold,#B8935F)]" />
          </div>
          <h2 className="text-2xl font-serif font-black text-[var(--color-ink,#1F120F)] mb-3">Your Box is Empty</h2>
          <p className="text-[13px] text-[var(--color-ink,#1F120F)]/70 mb-8 leading-relaxed">
            It looks like you haven't added any luxury items to your box yet. Discover our latest collections.
          </p>
          <button
            onClick={() => navigate('/shop')}
            className="w-full py-3.5 rounded-full bg-[var(--color-ink,#1F120F)] text-white font-bold text-xs uppercase tracking-[0.2em] hover:bg-[var(--color-gold,#B8935F)] transition-colors"
          >
            Browse Collections
          </button>
        </div>
      </div>
    );
  }
`;

content = content.replace(/const navigate = useNavigate\(\);\n\s*const \{ cartItems, setCartItems \} = useOutletContext<any>\(\);\n\s*const isWholesale = false;/, 
`const navigate = useNavigate();\n  const { cartItems, setCartItems } = useOutletContext<any>();\n  const isWholesale = false;\n${emptyState}`);

fs.writeFileSync('src/pages/CheckoutPage.tsx', content);
