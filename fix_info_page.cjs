const fs = require('fs');
let content = fs.readFileSync('src/pages/InfoPage.tsx', 'utf-8');

// The incorrect contactPageObj
const incorrectStr = `
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

content = content.replace(incorrectStr, '');

const correctContactObj = `
  {
    id: 'contact',
    category: 'information',
    categoryLabel: 'Get in Touch',
    navTitle: 'Contact',
    badge: 'Concierge',
    headline: 'Boutique Concierge',
    content: "For corporate gifting, custom hampers, or immediate assistance, our dedicated concierge is ready to assist you. Visit our boutique in Lahore or connect with us directly on WhatsApp.",
    highlights: [
      { icon: <MapPin size={18} />, label: "Neelum Block, Allama Iqbal Town, Lahore" },
      { icon: <Clock size={18} />, label: "Open Daily: 9:00 AM – 9:00 PM" },
      { icon: <MessageCircle size={18} />, label: "WhatsApp: 0316-0666083" }
    ],
    bulletList: [
      "Custom gift box curation",
      "Wholesale inquiries",
      "Immediate local delivery support"
    ],
    meta: "Fast response guaranteed"
  },`;

content = content.replace('const PAGES: PageData[] = [', 'const PAGES: PageData[] = [' + correctContactObj);

fs.writeFileSync('src/pages/InfoPage.tsx', content);
