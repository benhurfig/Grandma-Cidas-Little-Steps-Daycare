/* Shared browser runtime. No third-party request is made by the demo. */
(() => {
  'use strict';
  const config = window.MG_SITE || {};
  const contract = window.MG_ANALYTICS_CONTRACT || {};
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-navigation');
  const menuLabel = document.querySelector('[data-menu-label]');
  const floatingText = document.querySelector('.floating-text');
  const contact = document.querySelector('[data-contact-options]');
  const baseParams = () => ({ page_type: safePageType(), locale: document.documentElement.lang });

  function refreshBulletins() {
    document.querySelectorAll('[data-bulletin]').forEach(bulletin => {
      const start = Date.parse(bulletin.dataset.validFrom);
      const end = Date.parse(bulletin.dataset.validUntil);
      const now = Date.now();
      bulletin.hidden = true;
      if (!Number.isFinite(start) || !Number.isFinite(end) || now < start || now >= end) return;
      try {
        bulletin.querySelector('[data-bulletin-date]').textContent = new Intl.DateTimeFormat(
          bulletin.dataset.dateLocale,
          { month: 'long', year: 'numeric', timeZone: bulletin.dataset.timezone }
        ).format(new Date(now));
        bulletin.hidden = false;
      } catch { /* Invalid dates remain hidden. */ }
    });
  }
  refreshBulletins();
  if (document.querySelector('[data-bulletin]')) window.setInterval(refreshBulletins, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshBulletins();
  });

  function setMenu(open, returnFocus = false) {
    if (!menuButton || !nav) return;
    menuButton.setAttribute('aria-expanded', String(open));
    nav.dataset.open = String(open);
    const label = open ? menuButton.dataset.closeLabel : menuButton.dataset.openLabel;
    menuButton.setAttribute('aria-label', label || '');
    if (menuLabel) menuLabel.textContent = label || '';
    if (returnFocus) menuButton.focus();
    updateFloatingText();
  }
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav?.dataset.open === 'true') setMenu(false, true);
  });
  nav?.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('click', event => {
    if (nav?.dataset.open === 'true' && !nav.contains(event.target) && !menuButton.contains(event.target)) setMenu(false);
  });
  document.addEventListener('focusin', event => {
    if (nav?.dataset.open === 'true' && !nav.contains(event.target) && !menuButton.contains(event.target)) setMenu(false);
  });
  window.matchMedia?.('(min-width: 901px)').addEventListener('change', event => {
    if (event.matches) setMenu(false);
  });

  // Each actual click is an event; only visibility/FAQ/play use once-per-element.
  let consent = false;
  let gaLoaded = false;
  let initialized = false;
  let loading = null;
  let pageViewQueued = false;
  let contactVisible = false;
  let contactObserver = null;
  const once = new WeakMap();
  const gpcBlocks = () => config.analytics?.respectGlobalPrivacyControl !== false && navigator.globalPrivacyControl === true;
  const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };

  function safePageType() {
    const raw = document.body.dataset.page || 'home';
    const value = ({ dailyLife: 'daily_life', ourSpace: 'our_space' })[raw] || raw;
    return (window.MG_ANALYTICS_ALLOWED_VALUES?.page_type || []).includes(value) ? value : 'home';
  }
  function send(name, input = {}, element = null) {
    if (!config.analytics?.ga4Enabled || !consent || gpcBlocks() || !gaLoaded || typeof window.gtag !== 'function') return false;
    const definition = contract[name];
    if (!definition) return false;
    if (element) {
      let names = once.get(element);
      if (!names) { names = new Set(); once.set(element, names); }
      if (names.has(name)) return false;
      names.add(name);
    }
    const params = {};
    for (const key of definition.params || []) {
      const value = input[key];
      if (typeof value !== 'string' || value.length > 40 || /[^a-z0-9_-]/i.test(value)) continue;
      const allowed = window.MG_ANALYTICS_ALLOWED_VALUES?.[key];
      if (allowed && !allowed.includes(value)) continue;
      params[key] = value;
    }
    window.gtag('event', name, params);
    return true; // Queued to gtag, NOT confirmed by GA4.
  }
  function revokeConsent() {
    consent = false;
    if (initialized && typeof window.gtag === 'function') window.gtag('consent', 'update', { ...denied });
  }
  function sendPageView() {
    if (!pageViewQueued) pageViewQueued = send('page_view', baseParams());
  }
  function sendContactView() {
    if (contactVisible && contact && send('contact_options_view', baseParams(), contact)) contactObserver?.disconnect();
  }
  function enableAnalyticsConsent(allowed) {
    if (allowed !== true || gpcBlocks() || !config.analytics?.ga4Enabled || !/^G-[A-Z0-9]+$/.test(config.analytics.ga4MeasurementId || '')) {
      revokeConsent();
      return Promise.resolve(false);
    }
    const newlyGranted = !consent;
    consent = true;
    if (!initialized) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
      // Consent is declared before configuring the tag.
      window.gtag('consent', 'default', { ...denied });
      window.gtag('js', new Date());
      initialized = true;
    }
    if (newlyGranted) window.gtag('consent', 'update', { ...denied, analytics_storage: 'granted' });
    if (gaLoaded) { sendPageView(); sendContactView(); return Promise.resolve(true); }
    if (loading) return loading;
    window.gtag('config', config.analytics.ga4MeasurementId, {
      send_page_view: false,
      page_location: `${window.location.origin}${window.location.pathname}`,
      page_path: window.location.pathname, page_referrer: '',
      allow_google_signals: false, allow_ad_personalization_signals: false
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.analytics.ga4MeasurementId)}`;
    loading = new Promise(resolve => {
      script.addEventListener('load', () => {
        gaLoaded = true;
        loading = null;
        if (!consent || gpcBlocks()) { revokeConsent(); resolve(false); return; }
        sendPageView(); sendContactView(); resolve(true);
      }, { once: true });
      script.addEventListener('error', () => {
        gaLoaded = false; loading = null; script.remove(); resolve(false);
      }, { once: true });
    });
    document.head.append(script);
    return loading;
  }

  // Attribution goes only to the external request page, never into custom events.
  // Storage is optional: current-page parameters must still work if it is blocked.
  const approvedKeys = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'gclid', 'fbclid']);
  const attributionKeys = new Set((config.attribution?.forwardParameters || []).filter(key => approvedKeys.has(key)));
  function cleanAttribution(input) {
    const result = {};
    if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
    for (const [key, value] of Object.entries(input)) {
      if (attributionKeys.has(key) && typeof value === 'string' && value.length > 0 && value.length <= 160 && /^[a-z0-9._~-]+$/i.test(value)) result[key] = value;
    }
    return result;
  }
  let attribution = {};
  try { attribution = cleanAttribution(JSON.parse(sessionStorage.getItem('mg-attribution') || '{}')); } catch { /* Storage is not required. */ }
  try {
    const current = cleanAttribution(Object.fromEntries(new URL(window.location.href).searchParams));
    // A new acquisition starts a new bundle; do not mix campaigns/click IDs.
    if (['utm_source', 'utm_campaign', 'gclid', 'fbclid'].some(key => current[key])) attribution = current;
    else attribution = { ...attribution, ...current };
  } catch { /* A non-HTTP offline preview can still show the website. */ }
  try { sessionStorage.setItem('mg-attribution', JSON.stringify(attribution)); } catch { /* Use the in-memory bundle. */ }
  document.querySelectorAll('[data-smartmate-request]').forEach(link => {
    try {
      const url = new URL(link.href);
      if (config.links?.companySlug) url.searchParams.set('company', config.links.companySlug);
      for (const [key, value] of Object.entries(attribution)) if (!url.searchParams.has(key)) url.searchParams.set(key, value);
      link.href = url.href;
    } catch { /* Build validation reports invalid URLs; never break navigation. */ }
  });
  document.querySelector('[data-language-picker]')?.addEventListener('change', event => {
    const locale = event.target.value;
    const route = window.MG_LANGUAGE_ROUTES?.[locale]?.[document.body.dataset.page];
    if (!route) return;
    send('language_switch', { source_locale: document.documentElement.lang, target_locale: locale, page_type: safePageType() });
    const target = new URL(route, window.location.href);
    for (const [key, value] of Object.entries(attribution)) target.searchParams.set(key, value);
    window.location.assign(`${target.pathname}${target.search}${target.hash}`);
  });

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-analytics]');
    if (!target) return;
    const name = target.dataset.analytics;
    const params = baseParams();
    if (name === 'cta_click' || name === 'final_cta_request') params.cta_location = target.dataset.analyticsLocation || (name === 'final_cta_request' ? 'final' : 'content');
    if (['phone_click', 'sms_click', 'email_click', 'whatsapp_click'].includes(name)) params.contact_type = target.dataset.analyticsContact;
    if (name === 'social_profile_click') params.social_network = target.dataset.socialNetwork || 'other';
    send(name, params);
  }, true);
  document.querySelectorAll('details[data-faq]').forEach(item => item.addEventListener('toggle', () => {
    if (item.open) send('faq_open', baseParams(), item);
  }));
  document.querySelectorAll('video[data-analytics-video]').forEach(video => video.addEventListener('play', () => send('video_play', baseParams(), video)));
  if (contact && 'IntersectionObserver' in window) {
    contactObserver = new IntersectionObserver(entries => {
      const entry = entries.find(item => item.target === contact);
      if (entry) contactVisible = entry.isIntersecting;
      sendContactView();
    }, { threshold: 0 });
    contactObserver.observe(contact);
  }

  function updateFloatingText() {
    if (!floatingText) return;
    const menuOpen = nav?.dataset.open === 'true';
    floatingText.hidden = menuOpen;
    if (menuOpen) return;
    const rect = floatingText.getBoundingClientRect();
    // Hide only when it actually intersects a main action, not the whole page.
    floatingText.hidden = Array.from(document.querySelectorAll('.hero-actions, .final-cta .button, .contact-card, .site-footer')).some(element => {
      const other = element.getBoundingClientRect();
      return rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top;
    });
  }
  let floatingFrame = null;
  function scheduleFloatingUpdate() {
    if (floatingFrame !== null || !floatingText) return;
    floatingFrame = window.requestAnimationFrame(() => { floatingFrame = null; updateFloatingText(); });
  }
  window.addEventListener('scroll', scheduleFloatingUpdate, { passive: true });
  window.addEventListener('resize', scheduleFloatingUpdate);
  updateFloatingText();
  window.MateGrowthAnalytics = Object.freeze({
    setConsent: enableAnalyticsConsent, revokeConsent,
    status() { return { enabled: !!config.analytics?.ga4Enabled, consent, gpc: gpcBlocks(), loaded: gaLoaded, loading: !!loading, pageViewQueued, receiptConfirmed: false }; }
  });
  // Activate only from a stored explicit choice or the visible controls.
  const choicePanel = document.querySelector('[data-analytics-choice]');
  if (config.analytics?.ga4Enabled && config.analytics.consentGate === 'site-choice' && choicePanel) {
    const storageKey = 'cida-analytics-choice-v1';
    let savedChoice = null;
    try { savedChoice = localStorage.getItem(storageKey); } catch { /* Choice works without storage. */ }
    if (!gpcBlocks()) {
      choicePanel.hidden = savedChoice === 'granted' || savedChoice === 'denied';
      if (savedChoice === 'granted') enableAnalyticsConsent(true);
    }
    document.querySelectorAll('[data-analytics-choice-value]').forEach(button => button.addEventListener('click', () => {
      const granted = button.dataset.analyticsChoiceValue === 'granted';
      try { localStorage.setItem(storageKey, granted ? 'granted' : 'denied'); } catch { /* Current-page choice still applies. */ }
      choicePanel.hidden = true;
      enableAnalyticsConsent(granted);
    }));
    document.querySelector('[data-analytics-preferences]')?.addEventListener('click', () => {
      choicePanel.hidden = false;
      choicePanel.querySelector('button')?.focus();
    });
  }
})();
