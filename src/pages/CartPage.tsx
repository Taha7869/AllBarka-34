import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastManager';
import { useCart } from '../contexts/CartContext';

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems } = useCart();
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
}