const fs = require('fs');
let content = fs.readFileSync('src/components/ErrorBoundary.tsx', 'utf-8');
content = content.replace(/this\.props/g, '(this as any).props');
fs.writeFileSync('src/components/ErrorBoundary.tsx', content);
