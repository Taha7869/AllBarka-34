const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const importsToAdd = `
import { useParams } from 'react-router-dom';
import type { InfoPageTab } from './pages/InfoPage';
import type { PolicyTab } from './pages/PoliciesPage';

function InfoPageRoute() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <InfoPage
      isOpen={true}
      onClose={() => window.history.back()}
      initialTab={(slug as InfoPageTab) || 'our-story'}
    />
  );
}

function PoliciesPageRoute() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <PoliciesPage
      isOpen={true}
      onClose={() => window.history.back()}
      initialTab={(slug as PolicyTab) || 'shipping'}
    />
  );
}
`;

content = content.replace(/export default function App/, importsToAdd + '\nexport default function App');

content = content.replace(
  /<Route path="pages\/:slug" element=\{<InfoPage isOpen=\{true\} onClose=\{\(\) => window\.history\.back\(\)\} \/>\} \/>/,
  '<Route path="pages/:slug" element={<InfoPageRoute />} />'
);

content = content.replace(
  /<Route path="policies\/:slug" element=\{<PoliciesPage isOpen=\{true\} onClose=\{\(\) => window\.history\.back\(\)\} \/>\} \/>/,
  '<Route path="policies/:slug" element={<PoliciesPageRoute />} />'
);

// Bug 4 fix routing for Contact and Story
content = content.replace(
  /<Route path="story" element=\{<InfoPage isOpen=\{true\} onClose=\{\(\) => window\.history\.back\(\)\} \/>\} \/>/,
  '<Route path="story" element={<InfoPage isOpen={true} onClose={() => window.history.back()} initialTab="our-story" />} />'
);

content = content.replace(
  /<Route path="contact" element=\{<InfoPage isOpen=\{true\} onClose=\{\(\) => window\.history\.back\(\)\} \/>\} \/>/,
  '<Route path="contact" element={<InfoPage isOpen={true} onClose={() => window.history.back()} initialTab="contact" />} />'
);

fs.writeFileSync('src/App.tsx', content);
