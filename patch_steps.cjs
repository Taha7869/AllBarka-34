const fs = require('fs');

function patchFile(filename) {
  const content = fs.readFileSync(filename, 'utf-8');

  // Find the step nav block
  const startStr = '{/* 2. Vertical Multi-Step Process Header */}';
  const endStr = '{/* 3. Form Content';
  
  const startIdx = content.indexOf(startStr);
  const endIdx = content.indexOf(endStr);
  
  if (startIdx !== -1 && endIdx !== -1) {
    const replacement = `{/* 2. Vertical Multi-Step Process Header */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-[var(--color-gold,#B8935F)]/15 bg-white/50 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep('details')}
              className={\`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer \${
                currentStep === 'details'
                  ? 'bg-[#1F120F] text-[#FDFBF7] border-[#B8935F] shadow-xs'
                  : 'bg-white/80 text-[#1F120F]/70 border-[#B8935F]/20 hover:border-[#B8935F]/40'
              }\`}
            >
              <div className={\`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 \${
                currentStep === 'details' ? 'bg-[#B8935F] text-[#1F120F]' : 'bg-[#1F120F]/10 text-[#1F120F]'
              }\`}>
                1
              </div>
              <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider">Details</span>
            </button>

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => { if (validateStep1(true)) setCurrentStep('shipping'); }}
              className={\`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer \${
                currentStep === 'shipping'
                  ? 'bg-[#1F120F] text-[#FDFBF7] border-[#B8935F] shadow-xs'
                  : 'bg-white/80 text-[#1F120F]/70 border-[#B8935F]/20 hover:border-[#B8935F]/40'
              }\`}
            >
              <div className={\`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 \${
                currentStep === 'shipping' ? 'bg-[#B8935F] text-[#1F120F]' : 'bg-[#1F120F]/10 text-[#1F120F]'
              }\`}>
                2
              </div>
              <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider">Shipping</span>
            </button>

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => {
                if (!validateStep1(true)) { setCurrentStep('details'); return; }
                if (!validateStep2(true)) { setCurrentStep('shipping'); return; }
                setCurrentStep('payment');
              }}
              className={\`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer \${
                currentStep === 'payment'
                  ? 'bg-[#1F120F] text-[#FDFBF7] border-[#B8935F] shadow-xs'
                  : 'bg-white/80 text-[#1F120F]/70 border-[#B8935F]/20 hover:border-[#B8935F]/40'
              }\`}
            >
              <div className={\`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 \${
                currentStep === 'payment' ? 'bg-[#B8935F] text-[#1F120F]' : 'bg-[#1F120F]/10 text-[#1F120F]'
              }\`}>
                3
              </div>
              <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider">Review</span>
            </button>
          </div>
        </div>
        
        `;
    
    const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);
    fs.writeFileSync(filename, newContent);
    console.log("Successfully patched", filename);
  } else {
    console.log("Could not find boundaries in", filename);
  }
}

patchFile('src/components/CheckoutModal.tsx');
patchFile('src/pages/CheckoutPage.tsx');
