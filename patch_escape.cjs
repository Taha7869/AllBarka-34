const fs = require('fs');

function addEscapeKey(filename, isOpenProp, onCloseProp) {
  let content = fs.readFileSync(filename, 'utf-8');
  if (content.includes('Escape')) return; // Already handles it
  
  const effect = `
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && ${isOpenProp}) {
        ${onCloseProp}();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [${isOpenProp}, ${onCloseProp}]);
  `;
  
  // Insert before the first `return (`
  const idx = content.indexOf('return (');
  if (idx !== -1) {
    content = content.substring(0, idx) + effect + content.substring(idx);
    fs.writeFileSync(filename, content);
    console.log("Added Escape to", filename);
  }
}

addEscapeKey('src/components/CartDrawer.tsx', 'isOpen', 'onClose');
addEscapeKey('src/components/CheckoutModal.tsx', 'isOpen', 'onClose');
addEscapeKey('src/components/AuthModal.tsx', 'isOpen', 'onClose');
