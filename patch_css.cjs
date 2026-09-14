const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf-8');

// Replace everything up to the animations
// But it's easier to just strip the old top and prepend the new one.
// The old one has:
// @import url('...Cormorant...')
// @import "tailwindcss";
// @theme { ... }
// @layer base { html {...} body {...} h1... }

const cssToPrepend = `@import "tailwindcss";

@theme {
  --font-serif: "Playfair Display", Georgia, serif;
  --font-sans: "Satoshi", -apple-system, sans-serif;
  
  --color-base: #FAF9F5;
  --color-surface: #FFFFFF;
  --color-ink: #191917;
  --color-ink-muted: rgba(25, 25, 23, 0.65);
  --color-ink-faint: rgba(25, 25, 23, 0.3);
  --color-gold: #D4AF37;
  --color-gold-muted: #B8935F;
  --color-emerald-dark: #0A2518;
}

:root {
  --font-serif: "Playfair Display", Georgia, serif;
  --font-sans: "Satoshi", -apple-system, sans-serif;
}

body {
  background-color: #FAF9F5;
  color: #191917;
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-serif);
  font-weight: 400;
  letter-spacing: -0.01em;
  color: #191917;
}

/* Signature Dashed Hairline */
.rule-dashed {
  border-top: 1px dashed rgba(25, 25, 23, 0.2);
}

.rule-dashed-gold {
  border-top: 1px dashed rgba(212, 175, 55, 0.35);
}
`;

// we need to remove the first @import url(...), @import "tailwindcss", @theme block, and @layer base {} block 
// since we are redefining them.

// Let's just find where `.luxury-shadow` starts and keep everything from there.
const splitIndex = content.indexOf('.luxury-shadow');
if (splitIndex !== -1) {
  content = cssToPrepend + '\n' + content.substring(splitIndex);
}

fs.writeFileSync('src/index.css', content);
