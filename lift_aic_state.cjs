const fs = require('fs');

// AIConcierge
let aic = fs.readFileSync('src/components/AIConcierge.tsx', 'utf-8');
aic = aic.replace(/export default function AIConcierge\(\{ hasCartBar = false, hide = false \}: AIConciergeProps\) \{/, 'export default function AIConcierge({ hasCartBar = false, hide = false, onOpenChange }: AIConciergeProps) {');
aic = aic.replace(/interface AIConciergeProps \{/, 'interface AIConciergeProps {\n  onOpenChange?: (open: boolean) => void;');
// Watch for isOpen changes and call onOpenChange
const useEffectStr = `
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);
`;
aic = aic.replace(/const messagesEndRef = useRef<HTMLDivElement>\(null\);/, 'const messagesEndRef = useRef<HTMLDivElement>(null);\n' + useEffectStr);
fs.writeFileSync('src/components/AIConcierge.tsx', aic);

// RootLayout
let rl = fs.readFileSync('src/layouts/RootLayout.tsx', 'utf-8');
// Add state
rl = rl.replace(/const \[galleryModalOpen, setGalleryModalOpen\] = useState\(false\);/, 'const [galleryModalOpen, setGalleryModalOpen] = useState(false);\n  const [aiConciergeOpen, setAiConciergeOpen] = useState(false);');

// Include in isAnyModalOrDrawerOpen
rl = rl.replace(/galleryModalOpen;/, 'galleryModalOpen ||\n    aiConciergeOpen;');

// Pass to AIConcierge
rl = rl.replace(/<AIConcierge hide=\{isAnyModalOrDrawerOpen\} \/>/, '<AIConcierge hide={isAnyModalOrDrawerOpen && !aiConciergeOpen} onOpenChange={setAiConciergeOpen} />');

// Wait, if aiConciergeOpen is true, isAnyModalOrDrawerOpen is true.
// If hide={isAnyModalOrDrawerOpen}, then AIConcierge widget hides its own button! But we want it to stay hidden if another overlay is open, and hide its own button if IT is open. Actually, my previous code in AIConcierge already does: `(!hide && !isOpen) && <motion.div>`.
// So if hide is true (due to OTHER modal), button hides. If isOpen is true (itself), button hides.
// Wait, if AIConcierge is open, `isAnyModalOrDrawerOpen` is true. So `hide` will be true. Thus it would hide it. That's fine! But wait, if AIConcierge is open, its own chat window needs to NOT be hidden.
// The `hide` prop only controls the *floating button* in my AIConcierge code! Let's check AIConcierge.
// My AIConcierge code: `(!hide && !isOpen) && ( ... button ... )`.
// The chat window is inside `<AnimatePresence> {isOpen && ( ... chat window ... )} </AnimatePresence>`.
// So the chat window is NOT affected by `hide` prop! This is perfect!
// Let's just pass `hide={isAnyModalOrDrawerOpen && !aiConciergeOpen}` so the button doesn't get a `hide=true` when it's the one opening, though it doesn't matter because `!isOpen` would hide it anyway. Actually, just `hide={isAnyModalOrDrawerOpen}` is fine. Wait, if it sets `aiConciergeOpen` to true, `isAnyModalOrDrawerOpen` becomes true, so `hide` becomes true. The button condition is `!hide && !isOpen`. So it will hide. If we close it, `isOpen` becomes false, `isAnyModalOrDrawerOpen` becomes false, `hide` becomes false. The button reappears. Perfect!

rl = rl.replace(/<AIConcierge hide=\{isAnyModalOrDrawerOpen\}/, '<AIConcierge hide={isAnyModalOrDrawerOpen && !aiConciergeOpen}');
// Just in case, to prevent a flicker when aiConciergeOpen becomes true before isAnyModalOrDrawerOpen does... actually they happen in the same render.

fs.writeFileSync('src/layouts/RootLayout.tsx', rl);
