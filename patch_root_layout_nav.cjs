const fs = require('fs');
let content = fs.readFileSync('src/layouts/RootLayout.tsx', 'utf-8');

const correctNav = `if (item === 'Home') navigate('/'); else if (item === 'Shop') navigate('/shop'); else if (item === 'Gift Boxes') navigate('/shop/combos'); else if (item === 'Contact') navigate('/pages/contact'); else navigate('/shop');`;

content = content.replace(/if \(item === 'Home'\) navigate\('\/'\); else if \(item === 'Shop' \|\| item === 'Gift Boxes'\) navigate\('\/shop'\); else navigate\('\/pages\/our-story'\);/g, correctNav);

fs.writeFileSync('src/layouts/RootLayout.tsx', content);
