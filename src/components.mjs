const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const attr = esc;
const smsIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9 8.4 8.4 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M8 11h8M8 14h5"/></svg>';

export function routeFor(page, locale, defaultLocale) {
  const base = locale === defaultLocale ? '' : `/${locale}`;
  return page === 'home' ? `${base}/` : `${base}/${page === 'dailyLife' ? 'daily-life' : page === 'ourSpace' ? 'our-space' : page}/`;
}

export function renderHeader({ content, config, page, locale }) {
  const links = Object.entries(content.navigation).filter(([key]) => config.pages[key] === true && key !== 'home' && key !== 'privacy');
  const locales = config.locales.enabled;
  const language = locales.length > 1 ? `<label class="language-picker"><span class="sr-only">${esc(content.common.language)}</span><select data-language-picker aria-label="${attr(content.common.language)}">${locales.map(code => `<option value="${attr(code)}" ${code === locale ? 'selected' : ''}>${esc(config.locales.labels[code])}</option>`).join('')}</select></label>` : '';
  const menuLinks = [ ['home', content.navigation.home], ...links.map(([k, v]) => [k, v]) ].map(([key, label]) => `<a href="${attr(routeFor(key, locale, config.locales.default))}" ${key === page ? 'aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  return `<a class="skip-link" href="#main">${esc(content.common.skipToContent)}</a><header class="site-header"><a class="brand" href="${attr(routeFor('home', locale, config.locales.default))}">${config.media.logo?.src ? `<img class="brand-logo" src="${attr(config.media.logo.src)}" width="${config.media.logo.width}" height="${config.media.logo.height}" alt="">` : `<span class="brand-mark" aria-hidden="true">✿</span>`}<span>${esc(config.identity.name || content.common.siteName)}</span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-navigation" aria-label="${attr(content.common.menu)}" data-open-label="${attr(content.common.menu)}" data-close-label="${attr(content.common.closeMenu)}"><span class="menu-icon" aria-hidden="true">☰</span><span class="sr-only" data-menu-label>${esc(content.common.menu)}</span></button><nav id="primary-navigation" class="primary-navigation" aria-label="${attr(content.common.primaryNavigation)}" data-open="false">${menuLinks}</nav>${language}</header>`;
}

export function renderBulletin(config, content, locale, now = new Date()) {
  const b = config.bulletin;
  const copy = b.contentByLocale?.[locale];
  if (!b.enabled || !copy?.message || !copy?.title) return '';
  const monthYear = new Intl.DateTimeFormat(content.dateLocale || 'en-US', { month: 'long', year: 'numeric', timeZone: b.timezone }).format(now);
  return `<aside class="bulletin" data-bulletin hidden data-valid-from="${attr(b.validFrom)}" data-valid-until="${attr(b.validUntil)}" data-timezone="${attr(b.timezone)}" data-date-locale="${attr(content.dateLocale)}" aria-label="${esc(content.common.bulletin)}"><span class="bulletin-date" data-bulletin-date>${esc(monthYear)}</span><strong>${esc(copy.title)}</strong><p>${esc(copy.message)}</p></aside>`;
}

export function renderFinalCta({ content, config }) {
  const smartmate = new URL(config.links.smartMateRequestUrl);
  if (config.links.companySlug) smartmate.searchParams.set('company', config.links.companySlug);
  return `<section class="final-cta final-cta-simple" id="contact" aria-labelledby="contact-title" data-contact-options><div class="final-copy"><p class="eyebrow">${esc(content.common.familyRequestLabel)}</p><h2 id="contact-title">${esc(content.common.contactTitle)}</h2><p>${esc(content.common.contactIntro)}</p></div><a class="button button-primary" href="${attr(smartmate.href)}" data-smartmate-request data-analytics="final_cta_request" data-analytics-location="final">${esc(content.common.request)} <span aria-hidden="true">→</span></a><p class="contact-note">${esc(content.common.contactNote)}</p><div class="contact-alternatives"><p>${esc(content.common.contactAlternative)}</p><div><a href="sms:${attr(config.links.sms)}" data-analytics="sms_click" data-analytics-contact="sms">SMS</a><span aria-hidden="true">·</span><a href="${attr(config.links.whatsapp)}" target="_blank" rel="noopener noreferrer" data-analytics="whatsapp_click" data-analytics-contact="whatsapp">WhatsApp</a></div></div></section>`;
}

export function renderFooter({ content, config, locale }) {
  const year = new Date().getFullYear();
  const locations = config.localSeo.enabled ? `<nav class="local-area-links" aria-label="${attr(content.common.areasServed)}">${config.localSeo.locations.filter(item=>item.approved).map(item=>`<a href="${attr(localRouteFor(item.slug,locale,config.locales.default))}">${esc(item.city)}</a>`).join('')}</nav>` : '';
  const privacy = config.pages.privacy ? `<a href="${attr(routeFor('privacy', locale, config.locales.default))}">${esc(content.navigation.privacy)}</a>` : '';
  return `<footer class="site-footer"><div class="footer-brand"><span class="brand-mark" aria-hidden="true">✿</span><strong>${esc(config.identity.name || content.common.siteName)}</strong><p>${esc(config.identity.taglineByLocale?.[locale] || '')}</p></div><div class="footer-meta">${locations}${privacy}<span>© ${year} ${esc(config.identity.name || content.common.siteName)}</span></div></footer>`;
}

export function renderFloatingText(config, content) {
  if (!config.links.sms) return '';
  return `<a class="floating-text" href="sms:${attr(config.links.sms)}" aria-label="${attr(content.common.text)}" data-analytics="sms_click" data-analytics-contact="sms"><span aria-hidden="true">${smsIcon}</span><span>${esc(content.common.text)}</span></a>`;
}

export function renderMedia(page, content) {
  if (page === 'ourSpace') return `<div class="hero-media space-illustration" role="img" aria-label="${attr(content.common.outdoorPlaceholder)}"><div class="sun"></div><div class="house"><div class="house-roof"></div><div class="house-window"></div><div class="house-door"></div></div><span class="media-caption">${esc(content.common.spaceMediaPlaceholder)}</span></div>`;
  return `<div class="hero-media learning-illustration" role="img" aria-label="${attr(content.common.mediaPlaceholder)}"><div class="shape shape-one"></div><div class="shape shape-two"></div><div class="shape shape-three"></div><span class="media-caption">${esc(content.common.mediaPlaceholder)}</span></div>`;
}

function renderPicture(media, alt, className, priority = false) {
  if (!media?.src || !Number.isInteger(media.width) || !Number.isInteger(media.height)) return '';
  const srcset = media.srcset ? ` srcset="${attr(media.srcset)}"` : '';
  const sizes = media.sizes ? ` sizes="${attr(media.sizes)}"` : '';
  const loading = priority ? 'eager' : 'lazy';
  return `<img class="${attr(className)}" src="${attr(media.src)}"${srcset}${sizes} width="${media.width}" height="${media.height}" alt="${attr(alt || '')}" loading="${loading}"${priority ? ' fetchpriority="high"' : ''}>`;
}

export function renderConfiguredHeroMedia(config, content, locale, page = 'home') {
  if (page === 'ourSpace') {
    const media=config.services.outdoorPlay ? config.media.outdoor : config.media.indoor;
    if (media?.src) return `<div class="hero-media">${renderPicture(media,media.altByLocale?.[locale],'hero-photo',true)}</div>`;
    return renderMedia(page,content);
  }
  const hero = config.media.hero;
  if (hero?.desktop?.src) {
    const mobile = hero.mobile?.src ? `<source media="(max-width: 640px)" srcset="${attr(hero.mobile.srcset || hero.mobile.src)}" sizes="${attr(hero.mobile.sizes || '100vw')}" width="${hero.mobile.width}" height="${hero.mobile.height}">` : '';
    const alt = hero.desktop.altByLocale?.[locale] || '';
    return `<picture class="hero-media">${mobile}${renderPicture(hero.desktop,alt,'hero-photo',true)}</picture>`;
  }
  return renderMedia('home',content);
}

export function renderSpaceGallery(content, config, locale) {
  const sections = content.pages.ourSpace.sections;
  const tour = config.media.tour || {};
  const transcript = tour.transcriptByLocale?.[locale];
  const video = config.services.videoTour && config.links.video
    ? `<article class="space-card"><video controls playsinline preload="none" width="${tour.width || 1280}" height="${tour.height || 720}" style="--video-ratio:${tour.width || 1280}/${tour.height || 720}" ${tour.poster?.src ? `poster="${attr(tour.poster.src)}"` : ''} data-analytics-video aria-label="${attr(content.common.videoTour)}"><source src="${attr(config.links.video)}">${(tour.tracks || []).filter(track=>track.locale===locale).map(track=>`<track kind="captions" src="${attr(track.src)}" srclang="${attr(track.locale)}" label="${attr(track.label)}" default>`).join('')}</video><h3>${esc(content.common.videoTour)}</h3>${transcript ? `<details><summary>${esc(content.common.tourDescription)}</summary><p>${esc(transcript)}</p></details>` : ''}</article>` : '';
  const indoor = config.media.indoor?.src ? renderPicture(config.media.indoor,config.media.indoor.altByLocale?.[locale],'space-photo') : `<div class="space-placeholder indoor" role="img" aria-label="${attr(content.common.indoorPlaceholder)}"><span>${esc(content.common.indoorSpaces)}</span></div>`;
  const outdoor = config.media.outdoor?.src ? renderPicture(config.media.outdoor,config.media.outdoor.altByLocale?.[locale],'space-photo') : `<div class="space-placeholder outdoor" role="img" aria-label="${attr(content.common.outdoorPlaceholder)}"><span>${esc(content.common.outdoorSpaces)}</span></div>`;
  const outdoorCard = config.services.outdoorPlay ? `<article class="space-card">${outdoor}<h3>${esc(sections[1]?.heading || content.common.outdoorSpaces)}</h3><p>${esc(sections[1]?.body || '')}</p></article>` : '';
  return `<section class="space-gallery" aria-label="${esc(content.navigation.ourSpace)}"><article class="space-card">${indoor}<h3>${esc(sections[0]?.heading || content.common.indoorSpaces)}</h3><p>${esc(sections[0]?.body || '')}</p></article>${outdoorCard}${video}</section>`;
}

export function localRouteFor(slug, locale, defaultLocale) {
  return `${locale === defaultLocale ? '' : `/${locale}`}/locations/${slug}/`;
}
export { esc };
