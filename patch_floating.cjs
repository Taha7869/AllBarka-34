const fs = require('fs');

// BackToTop
let btt = fs.readFileSync('src/components/BackToTop.tsx', 'utf-8');
btt = btt.replace(/export interface BackToTopProps \{/, 'export interface BackToTopProps {\n  hide?: boolean;');
btt = btt.replace(/hasCartBar = false,/, 'hasCartBar = false,\n  hide = false,');

// Adjust positioning
// We want AI Concierge at bottom-right. Back-to-Top above it.
// AI Concierge base: bottom-5 right-4. Height is ~56px.
// So BackToTop base: bottom-[80px] right-4.
// If hasCartBar: AI Concierge bottom-20 right-4. BackToTop bottom-[140px] right-4.
// Wait, we are hiding them when cart bar is active anyway? No, cart bar is shown always unless hide is true.
// StickyCartBottomBar takes bottom-3 sm:bottom-5. It is max-w-xl mx-auto, so it sits in the middle.
// Floating buttons sit on the sides.
// In StickyCartBottomBar, the bar is at bottom-3 sm:bottom-5.
// So AI Concierge should be bottom-24 right-4 when cart bar is there? 
// No, the prompt says "stack them vertically... AI Concierge bottom-right, Back-to-Top just above it".
// Let's use Tailwind arbitrary values to add env(safe-area-inset-bottom).

btt = btt.replace(/className={\`fixed z-40 transition-all duration-300 \$\{([\s\S]*?)\}\`}/, 'className={`fixed z-30 transition-all duration-300 pb-[env(safe-area-inset-bottom)] ${hasCartBar ? \'bottom-[90px] sm:bottom-[100px] right-4 sm:right-6\' : \'bottom-[70px] sm:bottom-[80px] right-4 sm:right-6\'}`}');
btt = btt.replace(/<AnimatePresence>([\s\S]*?)<\/AnimatePresence>/, '<AnimatePresence>\n      {isVisible && !hide && (\n        <motion.div\n          initial={{ opacity: 0, scale: 0.8, y: 20 }}\n          animate={{ opacity: 1, scale: 1, y: 0 }}\n          exit={{ opacity: 0, scale: 0.8, y: 20 }}\n          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}\n          className={`fixed z-30 transition-all duration-300 pb-[env(safe-area-inset-bottom)] ${hasCartBar ? \'bottom-[90px] sm:bottom-[100px] right-4 sm:right-6\' : \'bottom-[70px] sm:bottom-[80px] right-4 sm:right-6\'}`}\n        >\n          <button\n            id="back-to-top-btn"\n            type="button"\n            onClick={scrollToTop}\n            className="group w-[44px] h-[44px] sm:w-11 sm:h-11 rounded-full bg-[var(--color-surface,#FDFBF7)] text-[var(--color-ink,#1F120F)] flex items-center justify-center shadow-[0_4px_16px_rgba(31,18,15,0.15)] border border-[var(--color-gold,#B8935F)]/60 hover:border-[var(--color-gold,#B8935F)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"\n            aria-label="Scroll to top"\n          >\n            <ChevronUp size={22} className="group-hover:-translate-y-0.5 transition-transform duration-300" />\n          </button>\n        </motion.div>\n      )}\n    </AnimatePresence>');

fs.writeFileSync('src/components/BackToTop.tsx', btt);

// AIConcierge
let aic = fs.readFileSync('src/components/AIConcierge.tsx', 'utf-8');
aic = aic.replace(/interface AIConciergeProps \{/, 'interface AIConciergeProps {\n  hide?: boolean;');
aic = aic.replace(/export default function AIConcierge\(\{ hasCartBar = false \}: AIConciergeProps\) \{/, 'export default function AIConcierge({ hasCartBar = false, hide = false }: AIConciergeProps) {');

// We need to return null early if hide is true, or better wrap in AnimatePresence or just conditionally render the floating button.
// Actually, it has `<AnimatePresence>` for the floating widget. Wait, it's just `div className="fixed..."` for the button.
// Let's replace the outer return of AIConcierge.
// It returns `<> <div fixed...> ... </div> <AnimatePresence> modal </AnimatePresence> </>`
// If `hide` is true, we should hide the button, but if it's open, should we close it? 
// If another modal opens, AI Concierge button should disappear.
// If AI Concierge is open itself, `hide` shouldn't break it? No, if AI Concierge is open, `isAnyModalOrDrawerOpen` might be true if we added it, but we didn't add it to RootLayout's check. 
// Wait, RootLayout's `isAnyModalOrDrawerOpen` doesn't include `AIConcierge` because its state is internal. So AI Concierge button disappears only when OTHER modals are open. That's fine! But if AI Concierge modal is open, and we don't hide the button, the button stays. The prompt says "no floating element is ever visible while ANY modal/drawer is open". So if AI Concierge modal is open, the button should disappear too.
// Wait, AIConcierge button *is* the trigger. If it's open, the button is replaced by an 'X'?
// Let's check AIConcierge.tsx.
