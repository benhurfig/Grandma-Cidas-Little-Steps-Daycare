import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteConfig } from '../config/site.config.mjs';
import { en } from '../content/en.mjs';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

async function fixture(action) {
 const base=await mkdtemp(path.join(os.tmpdir(),'mategrowth-qa-'));
 try {
  for(const folder of ['src','tools','content','config'])await cp(path.join(source,folder),path.join(base,folder),{recursive:true});
  await writeFile(path.join(base,'package.json'),'{"type":"module"}');
  const config=structuredClone(siteConfig), content=structuredClone(en);
  const run=(script,env={})=>spawnSync(process.execPath,[script],{cwd:base,encoding:'utf8',env:{...process.env,SITE_MODE:'',...env}});
  const save=async()=>writeFile(path.join(base,'config/site.config.mjs'),'export const siteConfig='+JSON.stringify(config)+';');
  await action({base,config,content,run,save});
 } finally { await rm(base,{recursive:true,force:true}); }
}
function localCopy(){return {title:'Visiting from Sample District',description:'This synthetic local page provides reviewed fictional QA content solely to exercise the build and metadata checks; it is not business information.',intro:'Families from Sample District can review this fictional test page before continuing to the demo contact section.',sections:[{heading:'A distinct local context',body:'This paragraph is synthetic QA content. It exercises visible sections in the generated local page rather than putting the only descriptive text in metadata. The placeholder makes no real claims about childcare, routes, transport, availability or businesses.'},{heading:'Prepare your questions',body:'This second paragraph exists to check structure and navigation in a repeatable build. The test verifies that the shared theme, bulletin, translated route mapping and final action are all rendered consistently. It is not intended for any published website.'}]};}

test('multilingual local pages use the shared theme, linked routes and metadata',()=>fixture(async({base,config,run,save})=>{
 config.locales.enabled=['en','pt'];config.locales.labels.pt='Português (QA fixture)';
 // Synthetic route fixture, NOT a reviewed Portuguese translation.
 await writeFile(path.join(base,'content/pt.mjs'),'import {en} from "./en.mjs"; export default {...en,dateLocale:"pt-BR"};');
 config.theme.accent='#654098';config.localSeo.enabled=true;
 config.localSeo.locations=[{approved:true,slug:'sample-district',city:'Sample District',state:'ST',contentByLocale:{en:localCopy(),pt:localCopy()}}];
 await save();const built=run('src/build.mjs');assert.equal(built.status,0,built.stderr);
 const checked=run('tools/check.mjs');assert.equal(checked.status,0,checked.stderr);
 const html=await readFile(path.join(base,'public/pt/locations/sample-district/index.html'),'utf8');
 assert.ok(html.includes('--accent:#654098'));
 assert.ok(html.includes('A distinct local context'));
 assert.ok(html.includes('hreflang="x-default"'));
 assert.ok(html.includes('"local":"/locations/sample-district/"'));
 assert.ok((await readFile(path.join(base,'public/index.html'),'utf8')).includes('href="/locations/sample-district/"'));
}));
test('checker rejects one bad CTA even if another CTA is correct',()=>fixture(async({base,run})=>{
 assert.equal(run('src/build.mjs').status,0);
 const file=path.join(base,'public/index.html');
 await writeFile(file,(await readFile(file,'utf8')).replace('href="#contact" data-analytics="cta_click"','href="/about/" data-analytics="cta_click"'));
 const checked=run('tools/check.mjs');assert.notEqual(checked.status,0);assert.match(checked.stderr,/each scroll CTA/);
}));
test('checker verifies hreflang destinations and sitemap parity',()=>fixture(async({base,run})=>{
 assert.equal(run('src/build.mjs').status,0);
 const file=path.join(base,'public/index.html');
 await writeFile(file,(await readFile(file,'utf8')).replace('hreflang="en" href="https://daycare.example/"','hreflang="en" href="https://daycare.example/missing/"'));
 const checked=run('tools/check.mjs');assert.notEqual(checked.status,0);assert.match(checked.stderr,/hreflang points to missing/);
}));
test('unknown SITE_MODE is rejected before any output is built',()=>fixture(async({run})=>{
 const built=run('src/build.mjs',{SITE_MODE:'prod'});assert.notEqual(built.status,0);assert.match(built.stderr,/SITE_MODE/);
}));
test('complete synthetic production fixture builds while the shipped demo stays blocked',()=>fixture(async({base,config,content,run,save})=>{
 assert.notEqual(run('src/build.mjs',{SITE_MODE:'production'}).status,0);
 config.mode='production';Object.assign(config.identity,{name:'Synthetic QA Fixture',siteUrl:'https://qa-template.example.com',city:'Test City',state:'ST',country:'US',timezone:'America/New_York',taglineByLocale:{en:'Synthetic QA content only.'}});
 Object.assign(config.links,{smartMateRequestUrl:'https://requests.example.com/family-request/',companySlug:'synthetic-qa-only',phone:'+12025550101'});
 content.status='approved'; // Test-only flag, not a claim of reviewed client copy.
 content.common.contactIntro='Synthetic QA contact introduction.';
 content.common.requestDescription='Continue to the synthetic external test destination.';
 for(const page of Object.values(content.pages)){page.intro='Synthetic QA page introduction.';page.sections=page.sections.map((section,index)=>({heading:`Section ${index+1}`,body:'Synthetic reviewed fixture text for testing only.'}));}
 await writeFile(path.join(base,'content/en.mjs'),'export const en='+JSON.stringify(content)+';');
 await mkdir(path.join(base,'assets'),{recursive:true});
 await writeFile(path.join(base,'assets/test.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#dce8e6"/></svg>');
 const media={src:'/assets/test.svg',width:800,height:600,altByLocale:{en:'Synthetic QA image'}};
 config.media.hero={desktop:media,mobile:media};config.media.indoor=media;config.media.outdoor=media;
 await save();const built=run('src/build.mjs');assert.equal(built.status,0,built.stderr);
 const checked=run('tools/check.mjs');assert.equal(checked.status,0,checked.stderr);
 assert.ok((await readFile(path.join(base,'public/index.html'),'utf8')).includes('content="index,follow"'));
}));
