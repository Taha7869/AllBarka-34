const fs = require('fs');
let content = fs.readFileSync('src/layouts/RootLayout.tsx', 'utf-8');

// replace <BackToTop />
content = content.replace(/<BackToTop \/>/g, '<BackToTop hide={isAnyModalOrDrawerOpen} />');

// replace AIConcierge block
content = content.replace(/<div className="hidden sm:block">\s*<AIConcierge \/>\s*<\/div>/g, '<AIConcierge hide={isAnyModalOrDrawerOpen} />');

fs.writeFileSync('src/layouts/RootLayout.tsx', content);
