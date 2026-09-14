const fs = require('fs');
let content = fs.readFileSync('src/components/CartDrawer.tsx', 'utf-8');

if (!content.includes('const navigate = useNavigate();')) {
  // Find the start of CartDrawer component
  content = content.replace(/export default function CartDrawer\(\{[\s\S]*?\}\) \{/, 
    "export default function CartDrawer({ isOpen, onClose, cartItems, onRemoveItem, onUpdateQuantity }: CartDrawerProps) {\n  const navigate = useNavigate();");
}

fs.writeFileSync('src/components/CartDrawer.tsx', content);
