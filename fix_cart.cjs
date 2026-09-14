const fs = require('fs');
let content = fs.readFileSync('src/components/CartDrawer.tsx', 'utf-8');

// remove the bad effect
const badEffect = `  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
`;

content = content.replace(badEffect, '');

// insert it correctly before the main component return
const mainReturnStr = `  return (
    <div className="fixed inset-0 z-[200] flex justify-end">`;

content = content.replace(mainReturnStr, badEffect + mainReturnStr);

fs.writeFileSync('src/components/CartDrawer.tsx', content);
