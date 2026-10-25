import { useState } from 'react';
import { MapPin, Trash2, Plus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ADDRESS_BOOK_KEY, readAddresses, type CheckoutCustomer } from '../lib/checkoutPreferences';

export default function AddressBook({ customer, onSelect }: { customer: CheckoutCustomer; onSelect: (value: Partial<CheckoutCustomer>) => void }) {
  const { t } = useLanguage();
  const [addresses, setAddresses] = useState(readAddresses);
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState('');
  const persist = (next: typeof addresses) => {
    try { localStorage.setItem(ADDRESS_BOOK_KEY, JSON.stringify(next)); setAddresses(next); setStatus(t('checkout.addressSaved')); }
    catch { setStatus(t('checkout.storageUnavailable')); }
  };
  const save = () => {
    if (customer.address.trim().length < 8 || !label.trim()) return;
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `address-${Date.now()}`;
    persist([{ id, label: label.trim().slice(0, 40), name: customer.name, phone: customer.phone, address: customer.address, city: customer.city }, ...addresses].slice(0, 5));
    setLabel('');
  };
  return <details className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-text-primary)]">
    <summary className="focus-ring flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold"><MapPin size={16} />{t('checkout.addressBook')}</summary>
    <p className="my-3 text-xs leading-6 text-[var(--color-text-secondary)]">{t('checkout.addressPrivacy')}</p>
    {addresses.map(address => <div key={address.id} className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--color-border)] p-2"><button type="button" onClick={() => onSelect({ name: address.name || customer.name, phone: address.phone || customer.phone, address: address.address, city: address.city })} className="focus-ring min-h-11 min-w-0 flex-1 text-start text-xs"><strong className="block" dir="auto">{address.label}</strong><span className="block truncate text-[var(--color-text-secondary)]" dir="auto">{address.address}, {address.city}</span></button><button type="button" aria-label={`${t('checkout.deleteAddress')}: ${address.label}`} onClick={() => persist(addresses.filter(item => item.id !== address.id))} className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full"><Trash2 size={15} /></button></div>)}
    <label className="block text-xs">{t('checkout.addressLabel')}<input value={label} onChange={event => setLabel(event.target.value)} maxLength={40} placeholder={t('checkout.addressHint')} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base" /></label>
    <button type="button" disabled={customer.address.trim().length < 8 || !label.trim()} onClick={save} className="focus-ring mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-xs font-semibold disabled:opacity-40"><Plus size={15} />{t('checkout.saveAddress')}</button>
    {status && <p role="status" className="mt-3 text-xs">{status}</p>}
  </details>;
}
