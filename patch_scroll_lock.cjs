const fs = require('fs');
let content = fs.readFileSync('src/layouts/RootLayout.tsx', 'utf-8');

const hookStr = `
  useEffect(() => {
    if (isAnyModalOrDrawerOpen) {
      document.body.style.overflow = 'hidden';
      // iOS safari fix
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isAnyModalOrDrawerOpen]);
`;

// Insert after isAnyModalOrDrawerOpen definition
const target = 'galleryModalOpen;';
const idx = content.indexOf(target);
if (idx !== -1) {
  content = content.substring(0, idx + target.length) + hookStr + content.substring(idx + target.length);
  fs.writeFileSync('src/layouts/RootLayout.tsx', content);
  console.log("Patched RootLayout scroll lock");
}
