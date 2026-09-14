const fs = require('fs');

let content = fs.readFileSync('src/components/CheckoutModal.tsx', 'utf-8');

// The steps start at: {/* ───────────────── STEP 1: CONTACT & CLIENT DETAILS ───────────────── */}
// And end right before: </form>

const startStr = "{/* ───────────────── STEP 1: CONTACT & CLIENT DETAILS ───────────────── */}";
const endStr = "</form>";

const startIdx = content.indexOf(startStr);
const endIdx = content.lastIndexOf(endStr); // Actually wait, isSubmittingOrder is above.

// Let's replace the whole !isSubmittingOrder block
/*
          {!isSubmittingOrder && (
            <>
              {currentStep === 'details' && (
*/

content = content.replace(/\{!isSubmittingOrder && \(\s*<>/, "{!isSubmittingOrder && (\n            <AnimatePresence mode=\"wait\">");
content = content.replace(/\{currentStep === 'success' && orderSuccessResult && \([\s\S]*?<\/motion.div>\n\s*\)\}\n\s*<\/>\n\s*\)\}\n\s*<\/form>/, match => {
  return match.replace("</>\n          )}\n        </form>", "</AnimatePresence>\n          )}\n        </form>");
});

fs.writeFileSync('src/components/CheckoutModal.tsx', content);

// Also do it for CheckoutPage.tsx
let page = fs.readFileSync('src/pages/CheckoutPage.tsx', 'utf-8');
page = page.replace(/\{!isSubmittingOrder && \(\s*<>/, "{!isSubmittingOrder && (\n            <AnimatePresence mode=\"wait\">");
page = page.replace(/\{currentStep === 'success' && orderSuccessResult && \([\s\S]*?<\/motion.div>\n\s*\)\}\n\s*<\/>\n\s*\)\}\n\s*<\/form>/, match => {
  return match.replace("</>\n          )}\n        </form>", "</AnimatePresence>\n          )}\n        </form>");
});
fs.writeFileSync('src/pages/CheckoutPage.tsx', page);
