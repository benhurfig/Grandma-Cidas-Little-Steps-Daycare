import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteConfig } from '../config/site.config.mjs';
import { analyticsContract } from '../src/analytics-contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicDir=path.join(root,'public');
const errors=[];
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
function attr(tag,key){return decode(tag.match(new RegExp(`(?:^|\\s)${key}="([^"]*)"`))?.[1]||'');}
async function walk(dir){const result=[];for(const item of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())result.push(...await walk(p));else result.push(p);}return result;}
const routeOf=file=>'/' + path.relative(publicDir,file).replaceAll(path.sep,'/').replace(/index\.html$/,'');
async function existsLocal(href,route){
  try {
    const url=new URL(href,new URL(route,siteConfig.identity.siteUrl));
    if(url.origin!==new URL(siteConfig.identity.siteUrl).origin)return true;
    const pathname=decodeURIComponent(url.pathname);
    const target=path.resolve(publicDir,'.'+pathname);
    if(!target.startsWith(publicDir+path.sep)&&target!==publicDir)return false;
    const info=await stat(target).catch(()=>null);
    return info?.isDirectory() ? !!await stat(path.join(target,'index.html')).catch(()=>null) : !!info?.isFile();
  }catch{return false;}
}
try{
 const files=await walk(publicDir),htmlFiles=files.filter(file=>file.endsWith('.html'));
 if(!htmlFiles.length)errors.push('No generated HTML. Run npm run build first.');
 const canonicalSet=new Set(),routeSet=new Set();
 for(const file of htmlFiles){
  const html=await readFile(file,'utf8'), relative=path.relative(publicDir,file), route=routeOf(file),is404=relative==='404.html';
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  if(new Set(ids).size!==ids.length)errors.push(`${relative}: duplicate element IDs`);
  if((html.match(/<h1\b/g)||[]).length!==1)errors.push(`${relative}: exactly one H1 required`);
  if(!/<!doctype html>/i.test(html))errors.push(`${relative}: missing doctype`);
  if(/<iframe\b/i.test(html)||/\/(?:family-request|childcare-smartmate)\//.test(route))errors.push(`${relative}: internal Family Request/iframe is not allowed`);
  if(/analytics_consent=granted|generate_lead|fbq\(['"]track['"],\s*['"]Lead/i.test(html))errors.push(`${relative}: invalid consent/lead marker`);
  if(/<script[^>]+src="https?:/i.test(html))errors.push(`${relative}: external tracking/resources must not load directly from demo HTML`);
  const robots=siteConfig.mode==='demo'?'noindex,nofollow':'index,follow';
  if(!is404&&!html.includes(`name="robots" content="${robots}"`))errors.push(`${relative}: invalid robots policy`);
  if(!is404){
   if((html.match(/id="contact"/g)||[]).length!==1||(html.match(/data-smartmate-request/g)||[]).length!==1)errors.push(`${relative}: exactly one Final CTA and SmartMate action required`);
   const canonicalTags=[...html.matchAll(/<link\b[^>]*\brel="canonical"[^>]*>/g)].map(match=>match[0]);
   const canonical=attr(canonicalTags[0]||'','href'),expected=new URL(route,siteConfig.identity.siteUrl).href;
   if(canonicalTags.length!==1||canonical!==expected||canonicalSet.has(canonical))errors.push(`${relative}: incorrect/duplicate canonical`);
   canonicalSet.add(canonical);routeSet.add(expected);
   const alternates=[...html.matchAll(/<link\b[^>]*\brel="alternate"[^>]*>/g)].map(match=>match[0]);
   for(const code of [...siteConfig.locales.enabled,'x-default'])if(alternates.filter(tag=>attr(tag,'hreflang')===code).length!==1)errors.push(`${relative}: expected one hreflang for ${code}`);
   for(const tag of alternates)if(!await existsLocal(attr(tag,'href'),route))errors.push(`${relative}: hreflang points to missing page`);
   if(/class="hero(?: |")/.test(html)){
    const h1=html.indexOf('<h1'),media=html.indexOf('class="hero-visual'),h2=html.indexOf('<h2');
    if(!(h1>=0&&media>h1&&h2>media))errors.push(`${relative}: Hero DOM must be H1 → media → H2`);
   }
   if(!html.includes('--accent:'+siteConfig.theme.accent))errors.push(`${relative}: configured theme missing`);
  }
  for(const match of html.matchAll(/<a\b[^>]*>/g)){
   const tag=match[0],href=attr(tag,'href');
   if(attr(tag,'data-analytics')==='cta_click'&&href!=='#contact')errors.push(`${relative}: each scroll CTA must point to #contact`);
   if(tag.includes('data-smartmate-request')&&(!/^https:\/\//.test(href)||attr(tag,'data-analytics')!=='final_cta_request'))errors.push(`${relative}: invalid external SmartMate action`);
   if(/^(?:javascript:|data:|\/\/)/i.test(href))errors.push(`${relative}: unsafe link protocol`);
   if(href.startsWith('#')&&!ids.includes(href.slice(1)))errors.push(`${relative}: missing anchor ${href}`);
   if(href&&!/^(?:#|https?:|mailto:|sms:|tel:)/i.test(href)&&!await existsLocal(href,route))errors.push(`${relative}: missing local link ${href}`);
  }
  for(const match of html.matchAll(/<(?:img|source|script|video|track|link)\b[^>]*>/g)){
   const tag=match[0];
   const refs=[attr(tag,'src'),attr(tag,'poster'),...(attr(tag,'srcset')||'').split(',').map(item=>item.trim().split(/\s+/)[0])].filter(Boolean);
   if(attr(tag,'rel')==='stylesheet')refs.push(attr(tag,'href'));
   for(const ref of refs)if(!/^https?:/i.test(ref)&&!await existsLocal(ref,route))errors.push(`${relative}: missing local asset ${ref}`);
   if(tag.startsWith('<img')&&(!/\balt="/.test(tag)||!/^\d+$/.test(attr(tag,'width'))||!/^\d+$/.test(attr(tag,'height'))))errors.push(`${relative}: image needs alt and intrinsic dimensions`);
   if(tag.startsWith('<video')&&(!attr(tag,'poster')||!attr(tag,'width')||!attr(tag,'height')))errors.push(`${relative}: tour requires poster and dimensions`);
  }
  for(const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g))try{JSON.parse(match[1]);}catch{errors.push(`${relative}: invalid JSON-LD`);}
 }
 const sitemap=await readFile(path.join(publicDir,'sitemap.xml'),'utf8');
 const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>decode(match[1]));
 if(urls.length!==new Set(urls).size||urls.length!==routeSet.size||urls.some(url=>!routeSet.has(url)))errors.push('Sitemap does not match canonical index pages.');
 const robots=await readFile(path.join(publicDir,'robots.txt'),'utf8');
 if(siteConfig.mode==='demo'?!robots.includes('Disallow: /'):!robots.includes(`Sitemap: ${new URL('/sitemap.xml',siteConfig.identity.siteUrl)}`))errors.push('robots.txt policy mismatch');
 if(!analyticsContract.final_cta_request||analyticsContract.generate_lead||analyticsContract.Lead)errors.push('Click/lead contract is incorrect.');
 if(errors.length)throw Error(errors.join('\n- '));
 console.log(`CHECK PASS — ${htmlFiles.length} HTML files; links/assets, per-CTA destinations, canonical/hreflang/sitemap, theme, Hero order and no embedded form (${siteConfig.mode}).`);
}catch(error){console.error(`CHECK FAIL\n- ${error.message}`);process.exitCode=1;}
