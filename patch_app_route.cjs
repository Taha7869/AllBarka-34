const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

if (!content.includes('<Route path="faq" element={<FAQPage />} />')) {
    content = content.replace(/<Route path="policies\/:slug" element=\{<PoliciesPageRoute \/>\} \/>/, 
    '<Route path="policies/:slug" element={<PoliciesPageRoute />} />\n          <Route path="faq" element={<FAQPage />} />');
}
fs.writeFileSync('src/App.tsx', content);
