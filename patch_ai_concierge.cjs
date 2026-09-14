const fs = require('fs');
let aic = fs.readFileSync('src/components/AIConcierge.tsx', 'utf-8');

// Replace the return block
// It has: return ( <> {/* Luxury Animated Floating Concierge Widget */} <div className={\`fixed...
const startStr = 'return (\n    <>\n      {/* ── Luxury Animated Floating Concierge Widget ─────────────────── */}';
const targetStr = `return (
    <>
      {/* ── Luxury Animated Floating Concierge Widget ─────────────────── */}
      <AnimatePresence>
        {(!hide && !isOpen) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={\`fixed z-30 transition-all duration-300 pb-[env(safe-area-inset-bottom)] \${
              hasCartBar
                ? 'bottom-3 right-20 sm:bottom-6 sm:right-24'
                : 'bottom-5 right-20 sm:bottom-6 sm:right-24'
            }\`}
          >
            {/* Soft Gold Glowing Pulse Rings */}
            <div className="absolute inset-0 rounded-full bg-[var(--color-gold,#B8935F)]/25 blur-md animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[var(--color-gold,#B8935F)]/40 via-[var(--color-gold-light,#D4B483)]/20 to-transparent blur-sm animate-pulse pointer-events-none" />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative w-[44px] h-[44px] sm:w-14 sm:h-14 rounded-full p-[1.5px] bg-gradient-to-br from-[var(--color-gold-light,#D4B483)] via-[var(--color-gold,#B8935F)] to-[var(--color-gold,#B8935F)] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer group select-none"
              title="AllBarka Luxury AI Concierge"
              aria-label="Open Luxury AI Concierge"
            >
              {/* Inner Core */}
              <div className="w-full h-full rounded-full bg-[var(--color-surface,#FFFFFF)] flex items-center justify-center relative overflow-hidden shadow-sm">
                <div className="absolute inset-[2px] rounded-full border border-[var(--color-gold,#B8935F)]/40 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(184,147,95,0.15),transparent_70%)] pointer-events-none" />
                {/* Monogram Seal Vector with 'AB' and 'AI' */}
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <span className="font-serif font-black text-xs sm:text-sm tracking-tight text-[var(--color-gold,#B8935F)] drop-shadow-xs leading-none group-hover:scale-105 transition-transform">
                    AB
                  </span>
                  <span className="text-[6.5px] font-black uppercase tracking-widest text-[var(--color-ink,#1A1A1A)] leading-none mt-0.5 opacity-90 flex items-center gap-0.5">
                    <Sparkles size={6} className="text-[var(--color-gold,#B8935F)]" />
                    AI
                  </span>
                </div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>`;

// wait, AI Concierge original code had `bottom-20 left-4` etc. We want them on the right, stacked.
// BackToTop is now `bottom-[90px] right-4` / `bottom-[70px] right-4`.
// Let's put AI Concierge at `bottom-5 right-4` when no cart bar, and `bottom-[90px] right-4` when cart bar?
// No, the prompt says "reposition (e.g., AI Concierge bottom-right, Back-to-Top just above it with 12–16px gap)".
// Let's make AI Concierge `bottom-5 sm:bottom-6 right-4 sm:right-6` (or bottom-20 if cart bar).
// And BackToTop will be exactly 14px above it.
// If AI Concierge height is ~56px.
// Then AI Concierge: bottom-5. BackToTop: bottom-[calc(1.25rem+56px+14px)] => bottom-[90px].

const oldWidgetBlockRegex = /<div\s+className=\{\`fixed z-\[100\] transition-all duration-300 \$\{\s*hasCartBar\s*\?\s*'bottom-20 left-4 sm:bottom-6 sm:left-6'\s*:\s*'bottom-5 left-4 sm:bottom-6 sm:left-6'\s*\}\`\}\s*>[\s\S]*?<\/button>\s*<\/div>/;

let match = aic.match(oldWidgetBlockRegex);
if(match) {
  aic = aic.replace(oldWidgetBlockRegex, targetStr.replace('return (\n    <>\n      {/* ── Luxury Animated Floating Concierge Widget ─────────────────── */}\n      ', ''));
  
  // also update the chat window positioning to align right if we moved the button right.
  // className="fixed bottom-22 sm:bottom-24 left-4 sm:left-6 z-[100] ...
  aic = aic.replace(/bottom-22 sm:bottom-24 left-4 sm:left-6 z-\[100\]/g, 'bottom-[80px] sm:bottom-[90px] right-4 sm:right-6 z-50 origin-bottom-right');
  
  // also add a global state update to root layout so AI concierge open state hides cart bar?
  // the prompt said: hide when "any overlay component that exists in the app" is open. AI Concierge chat window IS an overlay!
  
  fs.writeFileSync('src/components/AIConcierge.tsx', aic);
  console.log("AI Concierge patched");
} else {
  console.log("Could not find AI Concierge widget block");
}
