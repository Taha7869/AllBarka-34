const fs = require('fs');
let content = fs.readFileSync('src/pages/InfoPage.tsx', 'utf-8');

const regex = /export type InfoPageTab =[\s\S]*?;/;

const newTypes = `export type InfoPageTab = 
  | 'our-story'
  | 'sourcing-policy'
  | 'orchard-provenance'
  | 'lahore-boutique'
  | 'blog-nutrition'
  | 'hand-sorting'
  | 'vacuum-sealing'
  | 'freshness-guarantee'
  | 'shipping'
  | 'contact';`;

content = content.replace(regex, newTypes);

fs.writeFileSync('src/pages/InfoPage.tsx', content);
