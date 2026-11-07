import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import MagneticButton from './motion/MagneticButton';

interface CartAddButtonProps {
  productId: string;
  portion: string;
  onAdd: () => void;
  children?: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** Local bag feedback follows a committed quantity increase, never the click alone. */
export default function CartAddButton({ productId, portion, onAdd, children, disabled, className = '', id }: CartAddButtonProps) {
  const { cartItems } = useCart();
  const { t } = useLanguage();
  const key = `${productId}\u0000${portion}`;
  const quantity = cartItems.find(item => item.productId === productId && item.selectedWeight === portion)?.quantity || 0;
  const [attempt, setAttempt] = useState<{ key: string; before: number } | null>(null);
  const [confirmed, setConfirmed] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!attempt) return;
    if (attempt.key === key && quantity > attempt.before) {
      setConfirmed(key);
      timer.current = setTimeout(() => setConfirmed(''), 1400);
    }
    setAttempt(null);
  }, [attempt, key, quantity]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const added = confirmed === key;

  return <MagneticButton
    id={id}
    strength={3}
    disabled={disabled}
    aria-label={t('addToCart')}
    data-confirmed={added}
    className={`boutique-action boutique-add-to-bag ${className}`}
    onClick={event => {
      event.stopPropagation();
      if (disabled) return;
      if (timer.current) clearTimeout(timer.current);
      setConfirmed('');
      setAttempt({ key, before: quantity });
      onAdd();
    }}
  >
    {added ? <Check size={16} aria-hidden="true" /> : <ShoppingBag size={16} aria-hidden="true" />}
    <span dir="auto">{added ? t('addedToCart') : children || t('addToCart')}</span>
  </MagneticButton>;
}
