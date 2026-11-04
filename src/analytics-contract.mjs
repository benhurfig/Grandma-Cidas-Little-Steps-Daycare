/** One registry for event names, triggers, and the only allowed GA4 parameters. */
export const analyticsContract = {
  page_view: { trigger: 'one manual event on each page load after approved consent', params: ['page_type', 'locale'] },
  cta_click: { trigger: 'click on an in-page CTA that scrolls to #contact', params: ['cta_location', 'page_type', 'locale'] },
  contact_options_view: { trigger: 'contact block becomes visible once per page', params: ['page_type', 'locale'] },
  final_cta_request: { trigger: 'click on the final external SmartMate request link', params: ['cta_location', 'page_type', 'locale'] },
  phone_click: { trigger: 'click on configured tel: link', params: ['contact_type', 'page_type', 'locale'] },
  sms_click: { trigger: 'click on configured sms: link', params: ['contact_type', 'page_type', 'locale'] },
  whatsapp_click: { trigger: 'click on configured WhatsApp link', params: ['contact_type', 'page_type', 'locale'] },
  email_click: { trigger: 'click on configured mailto: link', params: ['contact_type', 'page_type', 'locale'] },
  google_maps_click: { trigger: 'click on configured map link', params: ['page_type', 'locale'] },
  google_reviews_click: { trigger: 'click on configured review link', params: ['page_type', 'locale'] },
  social_profile_click: { trigger: 'click on configured social link', params: ['social_network', 'page_type', 'locale'] },
  language_switch: { trigger: 'select an available translated route', params: ['source_locale', 'target_locale', 'page_type'] },
  faq_open: { trigger: 'open a native details/summary FAQ item once per item', params: ['page_type', 'locale'] },
  video_play: { trigger: 'play the configured native video once per element', params: ['page_type', 'locale'] }
};

export const safeParameterValues = {
  cta_location: ['hero', 'content', 'tour', 'final'],
  contact_type: ['phone', 'sms', 'email', 'whatsapp'],
  page_type: ['home', 'care', 'about', 'daily_life', 'our_space', 'transport', 'faq', 'privacy', 'local'],
  social_network: ['facebook', 'instagram', 'youtube', 'other']
};

export function sanitizeEventParams(eventName, input = {}) {
  const definition = analyticsContract[eventName];
  if (!definition) return {};
  const result = {};
  for (const key of definition.params) {
    const raw = input[key];
    if (typeof raw !== 'string' || raw.length > 40) continue;
    const allowed = safeParameterValues[key];
    if (allowed && !allowed.includes(raw)) continue;
    if (!allowed && !/^[a-z0-9_-]+$/i.test(raw)) continue;
    result[key] = raw;
  }
  return result;
}
