const fs = require('fs');
let content = fs.readFileSync('src/components/CartDrawer.tsx', 'utf-8');

// Replace minus button
const minusOld = `                    <button
                      onClick={() => onUpdateQuantity(item.id, item.selectedWeight, -1)}
                      className="w-6 h-6 bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] flex items-center justify-center rounded-lg hover:bg-[var(--color-gold,#B8935F)] hover:text-white transition-all active:scale-90 shrink-0 shadow-xs cursor-pointer border border-[var(--color-gold,#B8935F)]/30"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={11} />
                    </button>`;
const minusNew = `                    <button
                      onClick={() => onUpdateQuantity(item.id, item.selectedWeight, -1)}
                      className="w-8 h-8 bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] flex items-center justify-center rounded-lg hover:bg-[var(--color-gold,#B8935F)] hover:text-white transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer border border-[var(--color-gold,#B8935F)]/30"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>`;

content = content.replace(minusOld, minusNew);

// Replace plus button
const plusOld = `                    <button
                      onClick={() => onUpdateQuantity(item.id, item.selectedWeight, 1)}
                      className="w-6 h-6 bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] flex items-center justify-center rounded-lg hover:bg-[var(--color-gold,#B8935F)] hover:text-white transition-all active:scale-90 shrink-0 shadow-xs cursor-pointer border border-[var(--color-gold,#B8935F)]/30"
                      aria-label="Increase quantity"
                    >
                      <Plus size={11} />
                    </button>`;
const plusNew = `                    <button
                      onClick={() => onUpdateQuantity(item.id, item.selectedWeight, 1)}
                      className="w-8 h-8 bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] flex items-center justify-center rounded-lg hover:bg-[var(--color-gold,#B8935F)] hover:text-white transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer border border-[var(--color-gold,#B8935F)]/30"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>`;

content = content.replace(plusOld, plusNew);

fs.writeFileSync('src/components/CartDrawer.tsx', content);
