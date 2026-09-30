/**
 * AllBarka Business Contacts — Single Source of Truth
 */

export const CONTACT_CONFIG = {
  // Automated Orders & n8n Integration WhatsApp (Order Placement / Cart Checkout)
  automatedOrdersWhatsApp: {
    raw: '923299455065',
    formatted: '+92 329 9455065',
  },

  // Human Support & Concierge WhatsApp (Customer Service / Inquiries / Custom Hampers)
  humanSupportWhatsApp: {
    raw: '923160666083',
    formatted: '+92 316 0666083',
  },

  // Official Customer-Facing Email
  customerEmail: 'allbarkalahore@gmail.com',

  // Store Physical Location Details
  boutiqueAddress: 'DHA Phase 6 & Gulberg III, Lahore, Pakistan',
};

/**
 * Builds a WhatsApp link for automated order placement (Targets +92 329 9455065)
 */
export function buildAutomatedOrderWhatsAppUrl(textMessage?: string): string {
  const number = CONTACT_CONFIG.automatedOrdersWhatsApp.raw;
  if (!textMessage) return `https://wa.me/${number}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(textMessage)}`;
}

/**
 * Builds a WhatsApp link for human customer support / concierge (Targets +92 316 0666083)
 */
export function buildHumanSupportWhatsAppUrl(textMessage?: string): string {
  const number = CONTACT_CONFIG.humanSupportWhatsApp.raw;
  if (!textMessage) return `https://wa.me/${number}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(textMessage)}`;
}

/**
 * Auth support WhatsApp URL — shown when phone auth is rate-limited or quota-exceeded.
 * Never change this URL without explicit instruction.
 */
export const WHATSAPP_SUPPORT_URL =
  "https://wa.me/92316066083?text=" +
  encodeURIComponent("Assalam o Alaikum! Mujhe AllBarka se madad chahiye.");

/**
 * Builds a mailto link for customer email inquiries
 */
export function buildCustomerEmailUrl(subject?: string, body?: string): string {
  const email = CONTACT_CONFIG.customerEmail;
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const query = params.toString();
  return `mailto:${email}${query ? `?${query}` : ''}`;
}
