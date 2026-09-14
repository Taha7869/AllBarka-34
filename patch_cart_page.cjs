const fs = require('fs');
let content = fs.readFileSync('src/pages/CartPage.tsx', 'utf-8');

const newContent = `import React, { useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useToast } from '../components/ToastManager';

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems } = useOutletContext<any>();
  const { addToast } = useToast();

  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      addToast("Your box is empty — let's fix that.");
      navigate('/shop', { replace: true });
    } else {
      navigate('/checkout', { replace: true });
    }
  }, [navigate, cartItems, addToast]);

  return null;
}`;

fs.writeFileSync('src/pages/CartPage.tsx', newContent);
