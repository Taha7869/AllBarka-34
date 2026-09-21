import { CONTACT_CONFIG } from './contacts';

export const STORE_CONFIG = {
  // Automated Orders / n8n WhatsApp (+92 329 9455065)
  automatedOrdersWhatsApp: CONTACT_CONFIG.automatedOrdersWhatsApp.raw,
  automatedOrdersWhatsAppDisplay: CONTACT_CONFIG.automatedOrdersWhatsApp.formatted,
  
  // Human Support / Concierge WhatsApp (+92 316 0666083)
  humanSupportWhatsApp: CONTACT_CONFIG.humanSupportWhatsApp.raw,
  humanSupportWhatsAppDisplay: CONTACT_CONFIG.humanSupportWhatsApp.formatted,
  whatsappNumber: CONTACT_CONFIG.humanSupportWhatsApp.raw,
  whatsappDisplay: CONTACT_CONFIG.humanSupportWhatsApp.formatted,

  // Legacy fallback alias for automated orders
  whatsappBusinessNumber: CONTACT_CONFIG.automatedOrdersWhatsApp.raw,

  // Customer Email
  email: CONTACT_CONFIG.customerEmail,

  currency: 'Rs.',
  companyName: 'AllBarka',
  storeName: 'AllBarka',
  location: 'Lahore, Pakistan',
  social: {
    instagramUrl: 'https://instagram.com/allbarka.pk',
    facebookUrl: 'https://facebook.com/allbarka.pk'
  },
  orderPrefix: 'AB-',
  shipping: {
    standardRate: 150,
    freeThreshold: 3000,
    expressRate: 350
  }
};

