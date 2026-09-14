const fs = require('fs');
let content = fs.readFileSync('src/components/StickyCartBottomBar.tsx', 'utf-8');

// Ensure useLocation is imported
if (!content.includes('useLocation')) {
  content = content.replace(/import { useNavigate } from 'react-router-dom';/, "import { useNavigate, useLocation } from 'react-router-dom';");
}

const hideLogicOld = `const isVisible = totalCount > 0 && !hide;`;
const hideLogicNew = `const location = useLocation();
  const isCheckoutOrCartPage = location.pathname === '/checkout' || location.pathname === '/cart';
  const isVisible = totalCount > 0 && !hide && !isCheckoutOrCartPage;`;

content = content.replace(hideLogicOld, hideLogicNew);

fs.writeFileSync('src/components/StickyCartBottomBar.tsx', content);
