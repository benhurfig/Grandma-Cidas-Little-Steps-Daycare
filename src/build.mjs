import {renderPage} from './presentation.mjs';
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteConfig } from '../config/site.config.mjs';
import { renderBulletin, renderFinalCta, renderFloatingText, renderFooter, renderHeader, renderConfiguredHeroMedia, renderSpaceGallery, routeFor, localRouteFor, esc } from './components.mjs';
import { analyticsContract, safeParameterValues } from './analytics-contract.mjs';
import { validateConfiguration, configuredMedia, safeAssetPath } from './validate-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public');
if (process.env.SITE_MODE && !['demo','production'].includes(process.env.SITE_MODE)) throw new Error('SITE_MODE must be demo or production.');
if (process.env.SITE_MODE) siteConfig.mode = process.env.SITE_MODE;
const measurementId = process.env.GA4_MEASUREMENT_ID?.trim();
if (measurementId) {
  siteConfig.analytics.ga4MeasurementId = measurementId;
  siteConfig.analytics.ga4Enabled = true;
}
if (!Array.isArray(siteConfig.locales?.enabled) || siteConfig.locales.enabled.some(locale=>typeof locale!== 'string' || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale))) throw new Error('Invalid locale configuration before content import.');
const production = process.env.SITE_MODE === 'production' || siteConfig.mode === 'production';
const contentByLocale = Object.fromEntries(await Promise.all(siteConfig.locales.enabled.map(async locale => {
  try {
    const module = await import(`../content/${locale}.mjs`);
    return [locale, module[locale] || module.default];
  } catch {
    return [locale, null];
  }
})));

function pageHtml(...args) { return renderPage(...args); }

async function copyAssets() {
  await mkdir(path.join(out,'assets'), {recursive:true});
  await cp(path.join(root,'assets'),path.join(out,'assets'),{recursive:true,force:true}).catch(error=>{if(error.code!=='ENOENT') throw error;});
  await writeFile(path.join(out,'assets','styles.css'), await readFile(path.join(root,'src','styles.css')));
  await writeFile(path.join(out,'assets','main.js'), await readFile(path.join(root,'src','main.js')));
  await writeFile(path.join(out,'assets','analytics-contract.json'), JSON.stringify(analyticsContract,null,2));
}

const errors = validateConfiguration(siteConfig, contentByLocale, production);
// Check configured local assets even in demo; absent optional assets are allowed.
for (const [, media] of configuredMedia(siteConfig)) {
  if (!media) continue;
  const candidates=[media.src,...(media.srcset||'').split(',').map(item=>item.trim().split(/\s+/)[0])].filter(Boolean);
  for (const src of candidates) {
    if (!safeAssetPath(src)) { errors.push(`Configured image is not a safe local asset path: ${src}`); continue; }
    try { await access(path.join(root,src.slice(1))); } catch { errors.push(`Configured image asset is missing: ${src}`); }
  }
}
if (siteConfig.services.videoTour) {
  for (const src of [siteConfig.links.video,...(siteConfig.media.tour?.tracks || []).map(track=>track.src)].filter(src=>src?.startsWith('/'))) {
    if (!safeAssetPath(src)) { errors.push(`Unsafe media asset: ${src}`); continue; }
    try { await access(path.join(root,src.slice(1))); } catch { errors.push(`Configured video/caption asset is missing: ${src}`); }
  }
}
if (errors.length) { console.error('Configuration validation failed:\n- '+errors.join('\n- ')); process.exit(1); }
await rm(out, { recursive:true, force:true });
await mkdir(out,{recursive:true});
await copyAssets();
const routes = [];
for (const locale of siteConfig.locales.enabled) {
  const content = contentByLocale[locale];
  for (const [pageKey, enabled] of Object.entries(siteConfig.pages)) {
    if (!enabled || !content.pages[pageKey]) continue;
    const route = routeFor(pageKey, locale, siteConfig.locales.default);
    const dir = path.join(out, route.replace(/^\//,'') );
    await mkdir(dir,{recursive:true});
    await writeFile(path.join(dir,'index.html'),pageHtml(pageKey,locale,siteConfig,content,contentByLocale,new Date().toISOString()));
    routes.push(new URL(route,siteConfig.identity.siteUrl).href);
  }
  if (siteConfig.localSeo.enabled) for (const location of siteConfig.localSeo.locations) {
    if (!location.approved) continue;
    const localePrefix = locale === siteConfig.locales.default ? '' : `/${locale}`;
    const route = `${localePrefix}/locations/${location.slug}/`;
    const dir=path.join(out,route.replace(/^\//,'')); await mkdir(dir,{recursive:true});
    const html=pageHtml('local',locale,siteConfig,content,contentByLocale,new Date().toISOString(),location);
    await writeFile(path.join(dir,'index.html'),html); routes.push(new URL(route,siteConfig.identity.siteUrl).href);
  }
}
const errorCopy = contentByLocale[siteConfig.locales.default].common;
await writeFile(path.join(out,'404.html'),`<!doctype html><html lang="${esc(siteConfig.locales.default)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(errorCopy.notFoundTitle)}</title><link rel="stylesheet" href="/assets/styles.css"></head><body><main id="main"><h1>${esc(errorCopy.notFoundTitle)}</h1><a href="/">${esc(errorCopy.returnHome)}</a></main></body></html>`);
await writeFile(path.join(out,'robots.txt'),siteConfig.mode === 'demo' ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap.xml',siteConfig.identity.siteUrl).href}\n`);
await writeFile(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(url=>`<url><loc>${esc(url)}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${routes.length} routes into public/ (${siteConfig.mode}${production ? ', production' : ''}).`);
