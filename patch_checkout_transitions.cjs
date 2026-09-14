const fs = require('fs');

function patch(filename) {
  let content = fs.readFileSync(filename, 'utf-8');
  content = content.replace(/transition=\{\{ duration: 0\.2 \}\}/g, 'transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}');
  
  // also add padding bottom 24px below the form so it's not blocked by anything
  // the form itself is class "flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4 [scrollbar-width:thin]"
  // we can add pb-10 or pb-safe to the form.
  content = content.replace(/className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4 \[scrollbar-width:thin\]"/, 'className="flex-1 overflow-y-auto min-h-0 px-6 py-5 pb-10 space-y-4 [scrollbar-width:thin]"');
  
  fs.writeFileSync(filename, content);
}

patch('src/components/CheckoutModal.tsx');
patch('src/pages/CheckoutPage.tsx');
console.log("Patched checkout transitions and padding.");
