const fs = require('fs');
let content = fs.readFileSync('src/components/MobileMenu.tsx', 'utf-8');

const oldLogic = `  const handleLinkClick = (link: string) => {
    onClose();
    if (link === 'Home') navigate('/');
    else if (link === 'Shop' || link === 'Collections') navigate('/shop');
    else if (link === 'Wholesale') { navigate('/shop/wholesale'); }
    else if (link === 'Our Story' || link === 'About') { navigate('/pages/our-story'); }
    else if (link === 'Policies' || link === 'FAQ') { navigate('/policies/shipping'); }
    else { navigate('/shop'); }
  };`;

const newLogic = `  const handleLinkClick = (link: string) => {
    onClose();
    if (link === 'Home') navigate('/');
    else if (link === 'Shop') navigate('/shop');
    else if (link === 'Gift Boxes') navigate('/shop/combos');
    else if (link === 'Contact') navigate('/pages/contact');
    else navigate('/shop');
  };`;

content = content.replace(oldLogic, newLogic);
content = content.replace(/href="https:\/\/www\.instagram\.com\/"/g, 'href="https://wa.me/923160666083"');

fs.writeFileSync('src/components/MobileMenu.tsx', content);
