import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Gift, 
  Sparkles, 
  Check, 
  Plus, 
  Minus, 
  PackageCheck, 
  ArrowRight, 
  Scale, 
  Layers, 
  PenTool, 
  ShoppingBag 
} from 'lucide-react';
import { PRODUCTS, getProductImage } from '../data/products';

interface CustomHamperBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customHamperItem: {
    id: string;
    name: string;
    selectedWeight: string;
    price: number;
    image: string;
    quantity: number;
  }) => void;
}

interface BoxOption {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  capacity: string;
  image: string;
  badge?: string;
}

const BOX_OPTIONS: BoxOption[] = [
  {
    id: 'box-wood',
    name: 'Sheesham Artisan Wooden Chest',
    subtitle: 'Hand-carved brass latches & polished natural timber grain',
    price: 1800,
    capacity: 'Fits 4 to 6 Gourmet Selections',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
    badge: 'Patron Favorite',
  },
  {
    id: 'box-velvet',
    name: 'Royal Emerald Velvet Coffer',
    subtitle: 'Plush velvet casing embossed with Champagne Gold foil seal',
    price: 1400,
    capacity: 'Fits 3 to 5 Gourmet Selections',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
    badge: 'Luxury Edition',
  },
  {
    id: 'box-tin',
    name: 'Heritage Gold Keepsake Tin',
    subtitle: 'Airtight metallic container with commemorative floral filigree',
    price: 950,
    capacity: 'Fits 3 to 4 Gourmet Selections',
    image: 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=600&q=80',
  },
];

// Curated selection candidates for custom hamper
const DRY_FRUIT_CANDIDATES = [
  { id: 'prod-pista', name: 'Roasted Kerman Pistachios', pricePer200g: 950, origin: 'Kerman' },
  { id: 'prod-kaju', name: 'Jumbo Roasted Cashews', pricePer200g: 880, origin: 'Mangalore' },
  { id: 'prod-badam', name: 'California Nonpareil Almonds', pricePer200g: 750, origin: 'Central Valley' },
  { id: 'prod-walnut', name: 'Wild Skardu Walnut Halves', pricePer200g: 650, origin: 'Gilgit-Baltistan' },
  { id: 'prod-chilgoza', name: 'Royal Waziristan Chilgoza', pricePer200g: 2200, origin: 'South Waziristan' },
  { id: 'prod-apricot', name: 'Sun-Dried Sweet Hunza Apricots', pricePer200g: 450, origin: 'Hunza Valley' },
  { id: 'prod-figs', name: 'Turkish Golden Injeer (Figs)', pricePer200g: 780, origin: 'Aydin' },
  { id: 'prod-kishmish', name: 'Afghan Green Kandahari Raisins', pricePer200g: 420, origin: 'Kandahar' },
];

export default function CustomHamperBuilderModal({
  isOpen,
  onClose,
  onAddToCart,
}: CustomHamperBuilderModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBox, setSelectedBox] = useState<BoxOption>(BOX_OPTIONS[0]);
  const [selectedItems, setSelectedItems] = useState<string[]>(['prod-pista', 'prod-badam', 'prod-kaju']);
  const [customNote, setCustomNote] = useState('With warmest regards & sincere wishes.');
  const [recipientName, setRecipientName] = useState('');
  const [addedSuccess, setAddedSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleItem = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      if (selectedItems.length <= 3) {
        return; // Minimum 3 items required
      }
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    } else {
      if (selectedItems.length >= 6) {
        return; // Maximum 6 items allowed
      }
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const calculateTotalPrice = () => {
    const boxCost = selectedBox.price;
    const itemsCost = selectedItems.reduce((acc, id) => {
      const item = DRY_FRUIT_CANDIDATES.find((c) => c.id === id);
      return acc + (item ? item.pricePer200g : 0);
    }, 0);
    return boxCost + itemsCost;
  };

  const totalPrice = calculateTotalPrice();

  const handleFinishAndAdd = () => {
    const selectedNames = selectedItems
      .map((id) => DRY_FRUIT_CANDIDATES.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    const hamperItem = {
      id: `custom-hamper-${Date.now()}`,
      name: `Custom ${selectedBox.name}`,
      selectedWeight: `${selectedItems.length}x 200g Selections (${selectedNames})`,
      price: totalPrice,
      image: selectedBox.image,
      quantity: 1,
    };

    onAddToCart(hamperItem);
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-3 sm:p-4 select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="relative bg-[#FFFCF7] dark:bg-[#151B19] rounded-[28px] sm:rounded-[36px] w-full max-w-3xl overflow-hidden shadow-2xl border border-[#C7982F]/35 z-10 flex flex-col max-h-[92vh] text-[#29231D] dark:text-[#F6F1EA]"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[#29231D]/10 dark:border-[#F6F1EA]/10 flex items-center justify-between bg-[#F6F1EA]/60 dark:bg-[#0E1513]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#C7982F]/20 text-[#806326] dark:text-[#E4C783] flex items-center justify-center">
              <Gift size={16} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg leading-tight">
                Custom Luxury Hamper Builder
              </h3>
              <p className="text-[10px] sm:text-xs text-[#635B52] dark:text-[#A8A199]">
                Curate a bespoke gift chest with hand-sorted orchard harvests
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/80 dark:bg-white/10 hover:bg-white text-[#29231D] dark:text-[#F6F1EA] border border-[#29231D]/10 transition-colors cursor-pointer"
            aria-label="Close Hamper Builder"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step Tabs */}
        <div className="grid grid-cols-3 border-b border-[#29231D]/10 dark:border-[#F6F1EA]/10 bg-[#FFFCF7] dark:bg-[#1A201E] text-center text-xs font-serif font-bold shrink-0">
          <button
            onClick={() => setStep(1)}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              step === 1
                ? 'border-[#C7982F] text-[#806326] dark:text-[#E4C783] bg-[#C7982F]/5'
                : 'border-transparent text-[#635B52] dark:text-[#A8A199]'
            }`}
          >
            <span>1. Choose Coffer</span>
          </button>
          <button
            onClick={() => setStep(2)}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              step === 2
                ? 'border-[#C7982F] text-[#806326] dark:text-[#E4C783] bg-[#C7982F]/5'
                : 'border-transparent text-[#635B52] dark:text-[#A8A199]'
            }`}
          >
            <span>2. Select Harvests ({selectedItems.length}/6)</span>
          </button>
          <button
            onClick={() => setStep(3)}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              step === 3
                ? 'border-[#C7982F] text-[#806326] dark:text-[#E4C783] bg-[#C7982F]/5'
                : 'border-transparent text-[#635B52] dark:text-[#A8A199]'
            }`}
          >
            <span>3. Personalized Card</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: BOX SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-left">
                <h4 className="text-sm font-serif font-bold">Select Your Packaging Style</h4>
                <p className="text-xs text-[#635B52] dark:text-[#A8A199]">
                  Each luxury box is lined with protective food-grade barrier cushioning.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {BOX_OPTIONS.map((box) => {
                  const isSelected = selectedBox.id === box.id;
                  return (
                    <div
                      key={box.id}
                      onClick={() => setSelectedBox(box)}
                      className={`relative rounded-2xl border p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-[#C7982F] bg-[#C7982F]/10 dark:bg-[#C7982F]/15 ring-2 ring-[#C7982F]/50 shadow-md'
                          : 'border-[#29231D]/10 dark:border-[#F6F1EA]/10 bg-white/60 dark:bg-white/5 hover:border-[#C7982F]/60'
                      }`}
                    >
                      {box.badge && (
                        <span className="absolute top-2 right-2 bg-[#042821] text-[#E4C783] text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                          {box.badge}
                        </span>
                      )}

                      <div className="aspect-video w-full rounded-xl overflow-hidden mb-2 bg-[#F6F1EA] dark:bg-black/20">
                        <img
                          src={box.image}
                          alt={box.name}
                          width={640}
                          height={360}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <p className="text-[8px] italic text-[#635B52]/70 dark:text-[#A8A199]/70 text-left mb-2 leading-tight">
                        Reference image — actual packaging may vary slightly.
                      </p>

                      <div className="space-y-1 text-left">
                        <h5 className="font-serif font-bold text-xs sm:text-sm">{box.name}</h5>
                        <p className="text-[10px] text-[#635B52] dark:text-[#A8A199] leading-snug">
                          {box.subtitle}
                        </p>
                        <p className="text-[10px] font-semibold text-[#806326] dark:text-[#E4C783]">
                          {box.capacity}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#29231D]/10 dark:border-[#F6F1EA]/10 mt-3 flex items-center justify-between">
                        <span className="font-serif font-bold text-xs sm:text-sm text-[#806326] dark:text-[#E4C783]">
                          Rs. {box.price.toLocaleString()}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-[#C7982F] border-[#C7982F] text-white'
                              : 'border-[#29231D]/30 dark:border-[#F6F1EA]/30'
                          }`}
                        >
                          {isSelected && <Check size={12} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: DRY FRUITS SELECTION */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-left">
                <div>
                  <h4 className="text-sm font-serif font-bold">Pick 3 to 6 Signature Harvests</h4>
                  <p className="text-xs text-[#635B52] dark:text-[#A8A199]">
                    Each portion is vacuum-sealed in a 200g gold-foil preserve pouch.
                  </p>
                </div>
                <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-[#042821] text-[#E4C783]">
                  {selectedItems.length} of 6 Selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DRY_FRUIT_CANDIDATES.map((item) => {
                  const isSelected = selectedItems.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-[#C7982F] bg-[#C7982F]/10 dark:bg-[#C7982F]/15 shadow-sm'
                          : 'border-[#29231D]/10 dark:border-[#F6F1EA]/10 bg-white/60 dark:bg-white/5 hover:border-[#C7982F]/40'
                      }`}
                    >
                      <div className="text-left space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif font-bold text-xs">{item.name}</span>
                        </div>
                        <p className="text-[10px] text-[#635B52] dark:text-[#A8A199]">
                          Origin: {item.origin} · 200g Sealed
                        </p>
                        <span className="text-[11px] font-bold text-[#806326] dark:text-[#E4C783]">
                          Rs. {item.pricePer200g.toLocaleString()}
                        </span>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-[#042821] dark:bg-[#0E4A3B] border-[#042821] text-[#E4C783]'
                            : 'border-[#29231D]/30 dark:border-[#F6F1EA]/30 text-transparent'
                        }`}
                      >
                        <Check size={13} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: PERSONALIZED GREETING CARD */}
          {step === 3 && (
            <div className="space-y-5 text-left">
              <div>
                <h4 className="text-sm font-serif font-bold">Complimentary Calligraphy Greeting Card</h4>
                <p className="text-xs text-[#635B52] dark:text-[#A8A199]">
                  Inscribed on textured ivory cardstock with embossed AllBarka wax seal.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#635B52] dark:text-[#A8A199] uppercase tracking-wider block mb-1">
                    Recipient Name / Title
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Honorable Uncle & Family / M. Bilal"
                    className="w-full bg-white dark:bg-black/20 border border-[#29231D]/15 dark:border-[#F6F1EA]/15 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#C7982F]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#635B52] dark:text-[#A8A199] uppercase tracking-wider block mb-1">
                    Personalized Gift Message
                  </label>
                  <textarea
                    rows={3}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Write your wishes or celebration note here..."
                    className="w-full bg-white dark:bg-black/20 border border-[#29231D]/15 dark:border-[#F6F1EA]/15 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#C7982F] resize-none"
                  />
                </div>
              </div>

              {/* Box Preview Summary */}
              <div className="p-4 rounded-2xl bg-[#042821] text-[#EDE8DE] border border-[#D4AF37]/30 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-serif font-bold text-[#E4C783]">Hamper Configuration Summary</span>
                  <span className="text-[10px] font-mono text-white/70">Ready for Dispatch</span>
                </div>
                <p>
                  <strong>Box Style:</strong> {selectedBox.name} (Rs. {selectedBox.price.toLocaleString()})
                </p>
                <p>
                  <strong>Dry Fruits ({selectedItems.length}):</strong>{' '}
                  {selectedItems
                    .map((id) => DRY_FRUIT_CANDIDATES.find((c) => c.id === id)?.name)
                    .join(', ')}
                </p>
                {recipientName && (
                  <p>
                    <strong>Presented to:</strong> {recipientName}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#29231D]/10 dark:border-[#F6F1EA]/10 bg-[#FFFCF7] dark:bg-[#1A201E] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-left w-full sm:w-auto">
            <span className="text-[9.5px] uppercase tracking-widest text-[#635B52] dark:text-[#A8A199] block">
              Estimated Total Investment
            </span>
            <span className="text-xl sm:text-2xl font-serif font-bold text-[#806326] dark:text-[#E4C783]">
              Rs. {totalPrice.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="px-4 py-2.5 rounded-full border border-[#29231D]/20 dark:border-[#F6F1EA]/20 text-xs font-bold uppercase tracking-wider hover:bg-black/5 cursor-pointer"
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-full bg-[#042821] hover:bg-[#03201A] dark:bg-[#0E4A3B] text-[#FFFCF7] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-[#C7982F]/40"
              >
                <span>Continue</span>
                <ArrowRight size={14} className="text-[#C7982F]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishAndAdd}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-full bg-[#C7982F] hover:bg-[#B38926] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all"
              >
                {addedSuccess ? (
                  <>
                    <Check size={16} />
                    <span>Hamper Added!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} />
                    <span>Add Custom Hamper to Bag</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
