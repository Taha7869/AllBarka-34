const fs = require('fs');

let content = fs.readFileSync('src/layouts/RootLayout.tsx', 'utf-8');

const outletStr = "<Outlet context={{ cartItems, setCartItems, handleAddToCart, setCartOpen, setSelectedQuickViewProduct }} />";

// We need location.pathname as the key for AnimatePresence.
// RootLayout already has const location = useLocation();? Yes, let's check.
// If not, we can import it. It's imported on line 2.

const wrappedOutlet = `
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col items-center"
          >
            ${outletStr}
          </motion.div>
        </AnimatePresence>
`;

if(content.includes('const location = useLocation();')) {
  content = content.replace(outletStr, wrappedOutlet);
  fs.writeFileSync('src/layouts/RootLayout.tsx', content);
  console.log("Outlet patched");
} else {
  // need to add const location = useLocation();
  content = content.replace(/export default function RootLayout\(\) \{/, "export default function RootLayout() {\n  const location = useLocation();");
  content = content.replace(outletStr, wrappedOutlet);
  fs.writeFileSync('src/layouts/RootLayout.tsx', content);
  console.log("Outlet patched (added location)");
}
