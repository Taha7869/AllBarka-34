const fs = require('fs');
let content = fs.readFileSync('src/pages/InfoPage.tsx', 'utf-8');

// Add 'contact' to InfoPageTab
content = content.replace(/\| 'shipping';/, "| 'shipping'\n  | 'contact';");

// Add 'contact' to PAGES array
const contactPageObj = `
  {
    id: 'contact',
    title: 'Contact the Boutique',
    icon: <MessageCircle size={16} />,
    description: 'Reach out to our premium concierge for custom gifting and orders.',
    sections: [
      {
        heading: 'Visit Our Boutique',
        paragraphs: [
          'AllBarka Dry Fruits Boutique',
          'Neelum Block, Allama Iqbal Town',
          'Lahore, Pakistan'
        ]
      },
      {
        heading: 'Boutique Hours',
        paragraphs: [
          'We are open for tasting and consultation:',
          'Monday - Sunday: 9:00 AM – 9:00 PM'
        ]
      },
      {
        heading: 'Boutique Concierge',
        paragraphs: [
          'For corporate gifting, custom hampers, or immediate assistance, our dedicated WhatsApp concierge is ready to assist.'
        ]
      }
    ],
    cta: {
      label: 'Chat on WhatsApp',
      href: 'https://wa.me/923160666083'
    }
  },`;

// Find where PAGES array starts
const pagesIdx = content.indexOf('const PAGES: PageData[] = [');
if (pagesIdx !== -1) {
  content = content.replace('const PAGES: PageData[] = [', 'const PAGES: PageData[] = [' + contactPageObj);
}
fs.writeFileSync('src/pages/InfoPage.tsx', content);
