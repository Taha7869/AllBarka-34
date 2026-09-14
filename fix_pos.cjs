const fs = require('fs');

let btt = fs.readFileSync('src/components/BackToTop.tsx', 'utf-8');
btt = btt.replace(/className=\{\`fixed z-30 transition-all duration-300 pb-\[env\(safe-area-inset-bottom\)\] \$\{[^\}]*\}\`\}/g, 
"className={`fixed z-30 transition-all duration-300 pb-[env(safe-area-inset-bottom)] ${hasCartBar ? 'bottom-[148px] sm:bottom-[158px] right-4 sm:right-6' : 'bottom-[88px] sm:bottom-[98px] right-4 sm:right-6'}`}");
fs.writeFileSync('src/components/BackToTop.tsx', btt);

let aic = fs.readFileSync('src/components/AIConcierge.tsx', 'utf-8');
aic = aic.replace(/className=\{\`fixed z-30 transition-all duration-300 pb-\[env\(safe-area-inset-bottom\)\] \$\{[^\}]*\}\`\}/g, 
"className={`fixed z-30 transition-all duration-300 pb-[env(safe-area-inset-bottom)] ${hasCartBar ? 'bottom-[80px] sm:bottom-[90px] right-4 sm:right-6' : 'bottom-5 sm:bottom-6 right-4 sm:right-6'}`}");
fs.writeFileSync('src/components/AIConcierge.tsx', aic);
