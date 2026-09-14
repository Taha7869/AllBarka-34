const fs = require('fs');
let content = fs.readFileSync('src/components/AIConcierge.tsx', 'utf-8');
content = content.replace(/export default function AIConcierge\(\{\s*hasCartBar = false\s*\}\s*:\s*AIConciergeProps\)\s*\{/, 
  'export default function AIConcierge({ hasCartBar = false, hide = false, onOpenChange }: AIConciergeProps) {');
// Wait, is 'hide' even in the interface?
content = content.replace(/interface AIConciergeProps \{/, 'interface AIConciergeProps {\n  hide?: boolean;');
fs.writeFileSync('src/components/AIConcierge.tsx', content);
