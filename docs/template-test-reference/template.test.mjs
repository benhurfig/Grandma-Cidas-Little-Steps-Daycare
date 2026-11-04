import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsContract, sanitizeEventParams } from '../src/analytics-contract.mjs';
import { siteConfig } from '../config/site.config.mjs';
import { en } from '../content/en.mjs';
import { validateConfiguration } from '../src/validate-config.mjs';

test('default demo configuration has a complete enabled locale',()=>assert.deepEqual(validateConfiguration(siteConfig,{en},false),[]));
test('an enabled locale without full copy blocks build',()=>{
  const errors=validateConfiguration({...siteConfig,locales:{default:'en',enabled:['en','pt'],labels:{en:'English',pt:'Português'}}},{en},false);
  assert.ok(errors.some(e=>e.includes('Missing complete content package for enabled locale: pt')));
});
test('optional transportation page requires the service to be enabled',()=>{
  const errors=validateConfiguration({...siteConfig,pages:{...siteConfig.pages,transport:true}}, {en}, false);
  assert.ok(errors.some(e=>e.includes('Transportation page requires')));
});
test('local SEO rejects generic or duplicate thin city pages',()=>{
  const city={approved:true,slug:'sample-city',city:'Sample',state:'ST',contentByLocale:{en:{title:'Daycare in Sample',description:'short',intro:'Same generic intro'}}};
  const errors=validateConfiguration({...siteConfig,localSeo:{enabled:true,locations:[city]}},{en},false);
  assert.ok(errors.some(e=>e.includes('minimum 120')));
});
test('production mode blocks unapproved demo copy and missing brand details',()=>{
  const errors=validateConfiguration(siteConfig,{en},true);
  assert.ok(errors.some(e=>e.includes('mode is demo')));
  assert.ok(errors.some(e=>e.includes('Locale en must be marked approved')));
  assert.ok(errors.some(e=>e.includes('hero.desktop')));
});
test('click contract never defines completed lead events',()=>{
  assert.ok(analyticsContract.final_cta_request);
  assert.equal(analyticsContract.generate_lead,undefined);
  assert.equal(analyticsContract.Lead,undefined);
});
test('event sanitizer drops URL, personal data, and unknown parameters',()=>{
  assert.deepEqual(sanitizeEventParams('final_cta_request',{cta_location:'final',locale:'en',page_type:'home',link_url:'https://x/?email=a@b.com',email:'parent@example.com'}),{cta_location:'final',page_type:'home',locale:'en'});
});


test('unknown modes cannot bypass production validation',()=>{
  const errors=validateConfiguration({...siteConfig,mode:'prod'},{en},false);
  assert.ok(errors.some(error=>error.includes('Mode must')));
});
test('missing production translations return errors rather than crashing',()=>{
  const config=structuredClone(siteConfig);config.mode='production';config.locales.enabled.push('pt');config.locales.labels.pt='Português';
  assert.doesNotThrow(()=>validateConfiguration(config,{en},true));
  assert.ok(validateConfiguration(config,{en},true).some(error=>error.includes('Missing complete content')));
});
test('home cannot be disabled while global navigation points to it',()=>{
  assert.ok(validateConfiguration({...siteConfig,pages:{...siteConfig.pages,home:false}},{en}).some(error=>error.includes('Home must')));
});
test('URL checks reject credentials and non-origin site URLs',()=>{
  const config=structuredClone(siteConfig);config.identity.siteUrl='https://user:password@daycare.example/path';
  assert.ok(validateConfiguration(config,{en}).some(error=>error.includes('Site URL')));
});
test('program slugs must be unique',()=>{
  const config=structuredClone(siteConfig);config.services.infantCare=true;
  const program={enabled:true,slug:'infant',service:'infantCare',contentByLocale:{en:{title:'Care',summary:'Reviewed text'}}};
  config.programs=[program,program];
  assert.ok(validateConfiguration(config,{en}).some(error=>error.includes('unique URL-safe slug')));
});
test('video requires an accessible production description and poster',()=>{
  const config=structuredClone(siteConfig);config.services.videoTour=true;config.links.video='/assets/tour.mp4';
  const errors=validateConfiguration(config,{en},true);
  assert.ok(errors.some(error=>error.includes('video poster')));
  assert.ok(errors.some(error=>error.includes('description/transcript')));
});
test('local SEO needs visible sections, not just a long meta description',()=>{
  const config=structuredClone(siteConfig);config.localSeo.enabled=true;
  config.localSeo.locations=[{approved:true,slug:'sample',city:'Sample',state:'ST',contentByLocale:{en:{title:'Sample',description:'x'.repeat(140),intro:'Sample welcome'}}}];
  assert.ok(validateConfiguration(config,{en}).some(error=>error.includes('two reviewed body sections')));
});
test('configured images must use local safe paths even in demo',()=>{
  const config=structuredClone(siteConfig);config.media.logo={src:'/assets/../logo.svg',width:100,height:100};
  assert.ok(validateConfiguration(config,{en}).some(error=>error.includes('safe local image')));
});
