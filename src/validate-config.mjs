const pageNames = new Set(['home','care','about','dailyLife','ourSpace','transport','faq','privacy']);
const commonKeys = ['contactTitle','contactIntro','request','call','text','email','menu','closeMenu','language','skipToContent','primaryNavigation','faqLabel','learnMore','familyRequestLabel','requestDescription','directions','reviews','videoTour','indoorSpaces','outdoorSpaces','indoorPlaceholder','outdoorPlaceholder','mediaPlaceholder','spaceMediaPlaceholder','bulletin','demo','siteName','areasServed','tourDescription','notFoundTitle','returnHome'];
const isText = value => typeof value === 'string' && value.trim().length > 0;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const safeAssetPath = value => typeof value === 'string' && /^\/assets\/[a-z0-9_./-]+\.(?:avif|webp|png|jpe?g|svg|mp4|webm|vtt)$/i.test(value) && !value.split('/').includes('..');
function httpsURL(value) { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url : null; } catch { return null; } }
export function configuredMedia(config) {
  const media = [];
  if (config.pages.home) media.push(['hero.desktop',config.media.hero?.desktop,true],['hero.mobile',config.media.hero?.mobile,true]);
  if (config.pages.ourSpace) {
    media.push(['indoor space',config.media.indoor,true]);
    if (config.services.outdoorPlay) media.push(['outdoor space',config.media.outdoor,true]);
    if (config.services.videoTour) media.push(['video poster',config.media.tour?.poster,true]);
  }
  if (config.media.logo) media.push(['logo',config.media.logo,false]);
  if (config.media.socialImage) media.push(['social image',config.media.socialImage,false]);
  return media;
}

/** Validate before importing content or emitting any output. Production is fail-closed. */
export function validateConfiguration(config, allContent, isProduction = false) {
  const errors = [];
  for (const key of ['identity','locales','pages','services','media','links','bulletin','localSeo','analytics','attribution','theme']) {
    if (!config?.[key] || typeof config[key] !== 'object' || Array.isArray(config[key])) errors.push(`Missing configuration object: ${key}`);
  }
  if (errors.length) return errors;
  if (!['demo','production'].includes(config.mode)) errors.push('Mode must be demo or production; unknown modes cannot bypass production checks.');
  isProduction = isProduction || config.mode === 'production';
  const locales = config.locales.enabled;
  if (!Array.isArray(locales) || !locales.length) return [...errors,'At least one locale is required.'];
  if (!locales.includes(config.locales.default)) errors.push('Default locale must be enabled.');
  if (new Set(locales).size !== locales.length) errors.push('Locale list contains duplicates.');
  if (locales.some(locale => typeof locale !== 'string' || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale))) errors.push('Locale codes must be valid path-safe BCP 47 tags.');
  if (config.pages.home !== true) errors.push('Home must be enabled so the brand, 404 and navigation have a destination.');
  for (const [key,value] of Object.entries(config.pages)) if (!pageNames.has(key) || typeof value !== 'boolean') errors.push(`Invalid page configuration: ${key}`);
  const siteURL = httpsURL(config.identity.siteUrl);
  if (!siteURL || siteURL.search || siteURL.hash || siteURL.pathname !== '/') errors.push('Site URL must be a valid HTTPS origin with no credentials, path, query or fragment.');
  const requestURL = httpsURL(config.links.smartMateRequestUrl);
  if (!requestURL || requestURL.search || requestURL.hash) errors.push('SmartMate base URL must be HTTPS and must not contain query parameters or a fragment.');
  if (config.links.companySlug && !slugPattern.test(config.links.companySlug)) errors.push('Company slug must be URL-safe.');

  for (const locale of locales) {
    if (!isText(config.locales.labels?.[locale])) errors.push(`Missing display label for enabled locale: ${locale}`);
    const copy = allContent?.[locale];
    if (!copy) { errors.push(`Missing complete content package for enabled locale: ${locale}`); continue; }
    if (!isText(copy.dateLocale)) errors.push(`Locale ${locale} requires an explicit dateLocale.`);
    try { new Intl.DateTimeFormat(copy.dateLocale); } catch { errors.push(`Locale ${locale} has an invalid dateLocale.`); }
    for (const [key,enabled] of Object.entries(config.pages)) {
      if (!enabled) continue;
      const page = copy.pages?.[key];
      if (!page || !['title','h1','h2','intro'].every(field=>isText(page[field])) || !Array.isArray(page.sections) || !page.sections.length) errors.push(`Locale ${locale} has incomplete page content: ${key}`);
      if (Array.isArray(page?.sections) && page.sections.some(section=>!isText(section.heading)||!isText(section.body))) errors.push(`Locale ${locale} has an incomplete section on page: ${key}`);
      if (key === 'ourSpace' && config.services.outdoorPlay && (page?.sections?.length || 0) < 2) errors.push(`Locale ${locale} Our Space needs indoor and outdoor content.`);
      if (!isText(copy.navigation?.[key])) errors.push(`Locale ${locale} is missing navigation label: ${key}`);
    }
    for (const key of commonKeys) if (!isText(copy.common?.[key])) errors.push(`Locale ${locale} is missing shared string: ${key}`);
    // Editorial labels do not block the owner's requested production build.
    // Required fields, media and placeholder validation remain enforced below.
  }
  if (config.pages.transport && !config.services.transportation) errors.push('Transportation page requires the transportation service to be enabled.');
  const programs = config.programs || [];
  const programSlugs = new Set();
  for (const program of programs.filter(item=>item.enabled)) {
    if (!slugPattern.test(program.slug || '') || programSlugs.has(program.slug)) errors.push('Enabled programs require a unique URL-safe slug.');
    programSlugs.add(program.slug);
    if (!config.services[program.service]) errors.push(`Program ${program.slug || '(no slug)'} uses a disabled service.`);
    for (const locale of locales) if (!isText(program.contentByLocale?.[locale]?.title)||!isText(program.contentByLocale?.[locale]?.summary)) errors.push(`Program ${program.slug} is not fully translated in ${locale}.`);
  }
  for (const [name,media,required] of configuredMedia(config)) {
    if (!media && !(isProduction && required)) continue;
    if (!media?.src || !Number.isInteger(media.width) || media.width < 1 || !Number.isInteger(media.height) || media.height < 1) errors.push(`${isProduction ? 'Production' : 'Configured media'} requires configured image dimensions and path for ${name}.`);
    if (media?.src && (!safeAssetPath(media.src)||!/\.(?:avif|webp|png|jpe?g|svg)$/i.test(media.src))) errors.push(`${name} must use a safe local image /assets/ path.`);
    for (const candidate of (media?.srcset || '').split(',').map(item=>item.trim()).filter(Boolean)) {
      const [src,descriptor,...extra] = candidate.split(/\s+/);
      if (!safeAssetPath(src) || !/\.(?:avif|webp|png|jpe?g|svg)$/i.test(src) || extra.length || (descriptor && !/^\d+(?:\.\d+)?[wx]$/.test(descriptor))) errors.push(`${name} has an invalid srcset candidate.`);
    }
    if (isProduction) for (const locale of locales) if (!isText(media?.altByLocale?.[locale])) errors.push(`${name} image needs reviewed alt text in ${locale}.`);
  }
  if (config.services.videoTour) {
    if (!config.pages.ourSpace) errors.push('Video tour requires Our Space to be enabled.');
    if (!config.links.video || !(httpsURL(config.links.video) || (safeAssetPath(config.links.video) && /\.(mp4|webm)$/i.test(config.links.video)))) errors.push('Video tour requires a safe local MP4/WebM asset or an approved HTTPS video URL.');
    const tour = config.media.tour;
    if (!tour?.poster?.src) errors.push('Enabled video tour requires a configured video poster.');
    if (!tour || !Number.isInteger(tour.width) || tour.width < 1 || !Number.isInteger(tour.height) || tour.height < 1) errors.push('Video tour requires valid intrinsic width and height.');
    for (const track of tour?.tracks || []) if (!safeAssetPath(track.src) || !track.src.endsWith('.vtt') || !locales.includes(track.locale) || !isText(track.label)) errors.push('Video captions require a local VTT, enabled locale and label.');
    if (isProduction) for (const locale of locales) if (!isText(tour?.transcriptByLocale?.[locale])) errors.push(`Video tour requires an accessible reviewed description/transcript in ${locale}.`);
  }
  for (const social of config.links.social || []) {
    if (!['facebook','instagram','youtube','other'].includes(social.network)) errors.push('Social links require an approved network identifier.');
    for (const locale of locales) if (!isText(social.labelByLocale?.[locale])) errors.push(`Social link requires a translated label in ${locale}.`);
  }
  for (const link of [config.links.maps,config.links.reviews,...(config.links.social || []).map(item=>item.url)].filter(Boolean)) if (!httpsURL(link)) errors.push('External links must be valid HTTPS URLs without credentials.');
  if (config.bulletin.enabled) {
    try { if (!config.bulletin.timezone) throw Error(); new Intl.DateTimeFormat('en-US',{timeZone:config.bulletin.timezone}); } catch { errors.push('Enabled bulletin requires a valid IANA timezone.'); }
    const start=Date.parse(config.bulletin.validFrom), end=Date.parse(config.bulletin.validUntil);
    if (!Number.isFinite(start)||!Number.isFinite(end)||end<=start||![config.bulletin.validFrom,config.bulletin.validUntil].every(value=>/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value || ''))) errors.push('Bulletin validity requires increasing ISO timestamps with explicit offsets.');
    for (const locale of locales) if (!isText(config.bulletin.contentByLocale?.[locale]?.title)||!isText(config.bulletin.contentByLocale?.[locale]?.message)) errors.push(`Enabled bulletin requires translated title/message in ${locale}.`);
  }
  if (config.localSeo.enabled) {
    const slugs=new Set(), seen=new Map();
    for (const location of config.localSeo.locations || []) {
      if (!location.approved||!slugPattern.test(location.slug || '')||!isText(location.city)||!isText(location.state)) errors.push(`Local SEO location is incomplete or not approved: ${location.slug || '(no slug)'}`);
      if (slugs.has(location.slug)) errors.push(`Duplicate local SEO slug: ${location.slug}`);
      slugs.add(location.slug);
      for (const locale of locales) {
        const copy=location.contentByLocale?.[locale];
        if (!isText(copy?.title)||!isText(copy?.intro)||!isText(copy?.description)||(copy?.description?.length || 0)<120) errors.push(`Local SEO location ${location.slug} needs substantive content in ${locale} (description minimum 120 characters).`);
        const sections=copy?.sections;
        if (!Array.isArray(sections)||sections.length<2||sections.some(item=>!isText(item.heading)||!isText(item.body))||sections.reduce((sum,item)=>sum+(item.body?.length||0),0)<400) errors.push(`Local SEO location ${location.slug} requires at least two reviewed body sections (400 total characters) in ${locale}; metadata alone is not page content.`);
        const normalize=text=>String(text||'').toLowerCase().split(String(location.city).toLowerCase()).join('[city]').replace(/\s+/g,' ').trim();
        for (const [kind,text] of [['intro',copy?.intro],['description',copy?.description],['body',(sections||[]).map(item=>item.body).join(' ')]]) {
          const value=normalize(text), key=`${locale}:${kind}:${value}`;
          if (value && seen.has(key)) errors.push(`Duplicate local-page ${kind} detected: ${location.slug}; replacing the city name is not distinct content.`);
          if (value) seen.set(key,location.slug);
        }
      }
    }
  }
  if (config.localSeo.schemaEnabled) {
    const a=config.identity.address || {};
    if (![config.identity.name,config.identity.siteUrl,config.links.phone,a.streetAddress,a.addressLocality,a.addressRegion,a.postalCode,a.addressCountry].every(isText)) errors.push('LocalBusiness schema requires verified identity, URL, full address, and phone.');
  }
  if (config.analytics.ga4Enabled && !/^G-[A-Z0-9]+$/.test(config.analytics.ga4MeasurementId || '')) errors.push('GA4 enabled without a valid measurement ID.');
  if (config.analytics.ga4Enabled && (!['external-approved-consent-only','site-choice'].includes(config.analytics.consentGate)||config.analytics.respectGlobalPrivacyControl!==true)) errors.push('Enabled GA4 requires consent handling and GPC safeguards.');
  if (config.analytics.pixelEnabled) errors.push('Meta Pixel is intentionally unsupported in this starter; it requires a separate reviewed implementation.');
  if (config.mode==='demo' && config.analytics.ga4Enabled) errors.push('Demo mode cannot enable GA4 tracking.');
  const attribution=new Set(['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','gclid','fbclid']);
  if (!Array.isArray(config.attribution.forwardParameters)||config.attribution.forwardParameters.some(key=>!attribution.has(key))) errors.push('Attribution forwarding contains a non-approved parameter.');
  for (const key of ['ink','accent','leaf','cream','sky']) if (!/^#[0-9a-f]{6}$/i.test(config.theme[key] || '')) errors.push(`Theme color ${key} must be a six-digit hex color.`);
  if (isProduction) {
    if (config.mode!=='production') errors.push('Production build is blocked while mode is demo.');
    if (!isText(config.identity.name)||/goes here|placeholder|demo/i.test(config.identity.name)) errors.push('Production requires a verified daycare name.');
    if (!siteURL||/\.(example|invalid|test)$|localhost$/i.test(siteURL.hostname)) errors.push('Production requires a verified HTTPS site URL.');
    if (![config.identity.timezone,config.identity.city,config.identity.state,config.identity.country].every(isText)) errors.push('Production requires a verified city, state, country and IANA timezone.');
    try { if (!config.identity.timezone) throw Error(); new Intl.DateTimeFormat('en-US',{timeZone:config.identity.timezone}); } catch { errors.push('Production requires a valid IANA timezone.'); }
    if (!config.links.companySlug||!requestURL||/\.(example|invalid|test)$|localhost$/i.test(requestURL.hostname)) errors.push('Production requires the approved SmartMate URL and company slug.');
    if (![config.links.phone,config.links.sms,config.links.email].some(isText)) errors.push('Production requires at least one verified contact method.');
    for (const key of ['phone','sms']) if (config.links[key]&&!/^\+[1-9]\d{7,14}$/.test(config.links[key])) errors.push(`${key} must be verified E.164 format.`);
    if (config.links.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.links.email)) errors.push('Email address is not valid.');
    const strings=[];
    const collect=value=>{ if(typeof value==='string')strings.push(value);else if(Array.isArray(value))value.forEach(collect);else if(value&&typeof value==='object')Object.values(value).forEach(collect); };
    for (const locale of locales) {
      const copy=allContent?.[locale];
      if (!isText(config.identity.taglineByLocale?.[locale])) errors.push(`Production requires owner-approved tagline copy in ${locale}.`);
      collect(config.identity.taglineByLocale?.[locale]);
      if (!copy) continue;
      for (const [key,enabled] of Object.entries(config.pages)) if(enabled)collect(copy.pages?.[key]);
      for (const key of commonKeys.filter(key=>!['demo','siteName','mediaPlaceholder','spaceMediaPlaceholder','indoorPlaceholder','outdoorPlaceholder'].includes(key)))collect(copy.common?.[key]);
      if (config.bulletin.enabled) collect(config.bulletin.contentByLocale?.[locale]);
      for (const program of programs.filter(item=>item.enabled))collect(program.contentByLocale?.[locale]);
      if (config.localSeo.enabled)for(const location of config.localSeo.locations || [])collect(location.contentByLocale?.[locale]);
      if (config.services.videoTour)collect(config.media.tour?.transcriptByLocale?.[locale]);
    }
    if (strings.some(value=>/replace with|goes here|coming soon|add an approved|configured by this daycare|confirm .* before publishing|template and is not legal advice|sample questions|^A warm place to learn, play, and grow\.$/i.test(value))) errors.push('Production content still contains template/sample copy.');
  }
  return errors;
}
