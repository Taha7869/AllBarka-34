const fs = require('fs');

let content = fs.readFileSync('src/layouts/RootLayout.tsx', 'utf-8');
content = content.replace(/import AIConcierge from '\.\.\/components\/AIConcierge';/, "import AIConcierge from '../components/AIConcierge';\nimport ToastManager from '../components/ToastManager';");
content = content.replace(/<ScrollProgressBar \/>/, "<ScrollProgressBar />\n      <ToastManager />");

fs.writeFileSync('src/layouts/RootLayout.tsx', content);
