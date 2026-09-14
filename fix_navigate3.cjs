const fs = require('fs');
let content = fs.readFileSync('src/components/CartDrawer.tsx', 'utf-8');

const target = `export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  paymentMethod,
  onSetPaymentMethod,
  onCheckout,
  onAddToCart
}: CartDrawerProps) {
  if (!isOpen) return null;`;

const replacement = `export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  paymentMethod,
  onSetPaymentMethod,
  onCheckout,
  onAddToCart
}: CartDrawerProps) {
  const navigate = useNavigate();
  if (!isOpen) return null;`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/CartDrawer.tsx', content);
