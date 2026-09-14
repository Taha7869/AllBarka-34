const fs = require('fs');
let content = fs.readFileSync('src/components/CartDrawer.tsx', 'utf-8');

const target = `export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
}: CartDrawerProps) {`;

const replacement = `export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
}: CartDrawerProps) {
  const navigate = useNavigate();`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/CartDrawer.tsx', content);
