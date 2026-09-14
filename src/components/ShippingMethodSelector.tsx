import React from 'react';
import { ShippingMethodId } from '../types';
import { Truck, Zap } from 'lucide-react';
import { STORE_CONFIG } from '../config/store';

export const SHIPPING_METHODS = [
  {
    id: 'standard' as ShippingMethodId,
    title: 'Standard Delivery',
    price: STORE_CONFIG.shipping.standardRate,
    time: '2-3 Days',
    icon: Truck,
    description: 'Reliable delivery across Lahore.'
  },
  {
    id: 'express' as ShippingMethodId,
    title: 'Express Same-Day',
    price: STORE_CONFIG.shipping.expressRate,
    time: 'Within 12 Hours',
    icon: Zap,
    description: 'Priority courier dispatch.'
  }
];

export function calculateShippingFee(methodId: ShippingMethodId, subtotal: number): number {
  if (methodId === 'standard' && subtotal >= STORE_CONFIG.shipping.freeThreshold) {
    return 0;
  }
  const method = SHIPPING_METHODS.find(m => m.id === methodId);
  return method ? method.price : STORE_CONFIG.shipping.standardRate;
}

interface Props {
  selected: ShippingMethodId;
  onSelect: (id: ShippingMethodId) => void;
  subtotal: number;
}

export default function ShippingMethodSelector({ selected, onSelect, subtotal }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      {SHIPPING_METHODS.map((method) => {
        const Icon = method.icon;
        const isSelected = selected === method.id;
        const isFree = method.id === 'standard' && subtotal >= STORE_CONFIG.shipping.freeThreshold;
        const displayPrice = isFree ? 'Free' : `Rs. ${method.price}`;

        return (
          <button
            key={method.id}
            type="button"
            onClick={() => onSelect(method.id)}
            className={`relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
              isSelected
                ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/5 ring-1 ring-[var(--color-gold)]'
                : 'border-[var(--color-gold)]/30 hover:border-[var(--color-gold)] bg-white'
            }`}
          >
            <div className={`p-2 rounded-full ${isSelected ? 'bg-[var(--color-gold)] text-white' : 'bg-[var(--color-gold)]/10 text-[var(--color-gold)]'}`}>
              <Icon size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black uppercase tracking-wider text-[10px] text-[var(--color-ink)]">{method.title}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isFree ? 'bg-green-100 text-green-700' : 'bg-[var(--color-gold)]/10 text-[var(--color-gold)]'}`}>
                  {displayPrice}
                </span>
              </div>
              <p className="text-[10px] text-[var(--color-ink)]/70 leading-snug">{method.description} ({method.time})</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
