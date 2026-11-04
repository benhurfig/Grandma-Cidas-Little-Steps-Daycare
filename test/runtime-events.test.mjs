import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { analyticsContract, safeParameterValues } from '../src/analytics-contract.mjs';

const runtime = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

function createRuntime({ gpc = false, initialQuery = '?utm_source=demo&utm_campaign=sample&analytics_consent=granted', deferredLoad = false, withLanguagePicker = false, storageBlocked = false, saved = {}, withChoice = false, savedChoice = null } = {}) {
  const calls=[]; const listeners={}; const scripts=[];
  const requestLink={href:'https://smartmate.example/family-request/',dataset:{},closest(){return this;}};
  const contact={};
  const choicePanel={hidden:true,querySelector(){return {focus(){}};}};
  const choiceButtons=['granted','denied'].map(value=>({dataset:{analyticsChoiceValue:value},addEventListener(name,cb){listeners[`choice:${value}`]=cb;}}));
  const preferences={addEventListener(name,cb){listeners['preferences:click']=cb;}};
  class Observer { constructor(callback){this.callback=callback;this.disconnected=false;} observe(target){this.callback([{target,isIntersecting:true}]);} disconnect(){this.disconnected=true;} }
  const button={dataset:{openLabel:'Menu',closeLabel:'Close menu'},attrs:{'aria-label':'Menu'},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},addEventListener(name,cb){listeners[`button:${name}`]=cb;},focus(){}};
  const nav={dataset:{open:'false'},addEventListener(name,cb){listeners[`nav:${name}`]=cb;}};
  const document={
    documentElement:{lang:'en'},body:{dataset:{page:'home'}},head:{append(script){scripts.push(script);if(!deferredLoad)queueMicrotask(()=>{script.events.load?.();});}},
    querySelector(selector){return ({'.menu-toggle':button,'#primary-navigation':nav,'[data-menu-label]':{textContent:'Menu'},'[data-language-picker]':withLanguagePicker?{addEventListener(name,cb){listeners[`language:${name}`]=cb;}}:null,'[data-contact-options]':contact,'[data-analytics-choice]':withChoice?choicePanel:null,'[data-analytics-preferences]':withChoice?preferences:null})[selector]??null;},
    querySelectorAll(selector){return selector==='[data-smartmate-request]'?[requestLink]:selector==='[data-analytics-choice-value]'?choiceButtons:[];},
    createElement(){return {events:{},remove(){},addEventListener(name,cb){this.events[name]=cb;}};},
    addEventListener(name,cb){listeners[`document:${name}`]=cb;}
  };
  const store=new Map([['mg-attribution',JSON.stringify(saved)]]);
  const window={
    addEventListener(){},
    MG_LANGUAGE_ROUTES:{pt:{home:'/pt/'}},
    MG_SITE:{analytics:{ga4Enabled:true,ga4MeasurementId:'G-TEST',consentGate:withChoice?'site-choice':'external-approved-consent-only'},attribution:{forwardParameters:['utm_source','utm_campaign']},links:{companySlug:'demo-company'}},
    MG_ANALYTICS_CONTRACT:analyticsContract,
    MG_ANALYTICS_ALLOWED_VALUES:safeParameterValues,
    location:{href:`https://daycare.example/${initialQuery}`,origin:'https://daycare.example',pathname:'/',assign(url){this.assigned=url;}},
    gtag(...args){calls.push(args);},
  };
  window.IntersectionObserver=Observer;
  const choices=new Map(savedChoice?[['cida-analytics-choice-v1',savedChoice]]:[]);
  const context={window,document,navigator:{globalPrivacyControl:gpc},localStorage:{getItem:key=>choices.get(key)||null,setItem:(key,value)=>choices.set(key,value)},sessionStorage:{getItem:key=>{if(storageBlocked)throw Error('blocked');return store.get(key)||null;},setItem:(key,value)=>{if(storageBlocked)throw Error('blocked');store.set(key,value);}},IntersectionObserver:Observer,URL,WeakMap,Set,Promise,Date,encodeURIComponent,console};
  vm.runInNewContext(runtime,context);
  return {window,document,listeners,calls,scripts,requestLink,store,choicePanel,choices};
}

test('no analytics script or event fires until explicit consent', async()=>{
  const env=createRuntime();
  await env.window.MateGrowthAnalytics.setConsent(false);
  env.listeners['document:click']({target:{closest:()=>env.requestLink}});
  assert.equal(env.scripts.length,0);
  assert.equal(env.calls.length,0);
});

test('accepted consent loads one configured GA script and sends one page_view', async()=>{
  const env=createRuntime();
  await env.window.MateGrowthAnalytics.setConsent(true);
  assert.equal(env.scripts.length,1);
  assert.equal(env.calls.filter(call=>call[0]==='event'&&call[1]==='page_view').length,1);
  assert.equal(env.calls.some(call=>call[0]==='config'&&call[2]?.send_page_view===false),true);
  const gaConfig=env.calls.find(call=>call[0]==='config')[2];
  assert.equal(gaConfig.page_location,'https://daycare.example/');
  assert.equal(gaConfig.page_referrer,'');
  assert.equal(env.calls.some(call=>call[0]==='consent'&&call[1]==='update'&&call[2]?.analytics_storage==='granted'),true);
});

test('separate final request clicks are both measured and only approved attribution reaches SmartMate', async()=>{
  const env=createRuntime();
  await env.window.MateGrowthAnalytics.setConsent(true);
  const clickable={...env.requestLink,dataset:{analytics:'final_cta_request',analyticsLocation:'final'}};
  const click={target:{closest:selector=>selector==='[data-analytics]'?clickable:null}};
  env.listeners['document:click'](click); env.listeners['document:click'](click);
  assert.equal(env.calls.filter(call=>call[0]==='event'&&call[1]==='final_cta_request').length,2);
  const destination=new URL(env.requestLink.href);
  assert.equal(destination.searchParams.get('company'),'demo-company');
  assert.equal(destination.searchParams.get('utm_source'),'demo');
  assert.equal(destination.searchParams.get('utm_campaign'),'sample');
  assert.equal(destination.searchParams.has('analytics_consent'),false);
  const event=env.calls.find(call=>call[0]==='event'&&call[1]==='final_cta_request');
  assert.equal(JSON.stringify(event[2]).includes('smartmate.example'),false);
  assert.equal(env.calls.filter(call=>call[0]==='event'&&call[1]==='contact_options_view').length,1);
});

test('GPC blocks analytics activation', async()=>{
  const env=createRuntime({gpc:true});
  assert.equal(await env.window.MateGrowthAnalytics.setConsent(true),false);
  assert.equal(env.scripts.length,0);
  assert.equal(env.calls.length,0);
});


test('concurrent consent grants share exactly one pending GA load', async()=>{
  const env=createRuntime({deferredLoad:true});
  const first=env.window.MateGrowthAnalytics.setConsent(true);
  const second=env.window.MateGrowthAnalytics.setConsent(true);
  assert.equal(env.scripts.length,1);
  env.scripts[0].events.load();
  assert.deepEqual(await Promise.all([first,second]),[true,true]);
  assert.equal(env.calls.filter(call=>call[0]==='event'&&call[1]==='page_view').length,1);
});
test('setConsent(false) revokes even while the script is loading', async()=>{
  const env=createRuntime({deferredLoad:true});
  const pending=env.window.MateGrowthAnalytics.setConsent(true);
  await env.window.MateGrowthAnalytics.setConsent(false);
  env.scripts[0].events.load();
  assert.equal(await pending,false);
  assert.equal(env.calls.filter(call=>call[0]==='event').length,0);
  assert.equal(env.calls.filter(call=>call[0]==='consent').at(-1)[2].analytics_storage,'denied');
});
test('regrant after revocation updates GA consent without duplicate page_view', async()=>{
  const env=createRuntime();
  await env.window.MateGrowthAnalytics.setConsent(true);
  await env.window.MateGrowthAnalytics.setConsent(false);
  await env.window.MateGrowthAnalytics.setConsent(true);
  assert.equal(env.calls.filter(call=>call[0]==='consent').at(-1)[2].analytics_storage,'granted');
  assert.equal(env.scripts.length,1);
  assert.equal(env.calls.filter(call=>call[0]==='event'&&call[1]==='page_view').length,1);
  assert.equal(env.window.MateGrowthAnalytics.status().receiptConfirmed,false);
});
test('blocked storage still forwards current valid attribution',()=>{
  const env=createRuntime({storageBlocked:true});
  assert.equal(new URL(env.requestLink.href).searchParams.get('utm_campaign'),'sample');
});
test('unsafe stored attribution is revalidated and removed',()=>{
  const env=createRuntime({initialQuery:'',saved:{utm_campaign:'person@example.com',utm_source:'safe',analytics_consent:'granted'}});
  const url=new URL(env.requestLink.href);
  assert.equal(url.searchParams.get('utm_source'),'safe');
  assert.equal(url.searchParams.has('utm_campaign'),false);
  assert.equal(url.searchParams.has('analytics_consent'),false);
});
test('a new acquisition replaces the prior campaign bundle',()=>{
  const env=createRuntime({initialQuery:'?utm_source=new',saved:{utm_source:'old',utm_campaign:'old_campaign'}});
  const url=new URL(env.requestLink.href);
  assert.equal(url.searchParams.get('utm_source'),'new');
  assert.equal(url.searchParams.has('utm_campaign'),false);
});
test('failed GA script can retry without claiming receipt',async()=>{
  const env=createRuntime({deferredLoad:true});
  const first=env.window.MateGrowthAnalytics.setConsent(true);
  env.scripts[0].events.error();
  assert.equal(await first,false);
  const second=env.window.MateGrowthAnalytics.setConsent(true);
  env.scripts[1].events.load();
  assert.equal(await second,true);
  assert.equal(env.window.MateGrowthAnalytics.status().receiptConfirmed,false);
});

test('language switch preserves safe attribution even without storage',()=>{
  const env=createRuntime({withLanguagePicker:true,storageBlocked:true});
  env.listeners['language:change']({target:{value:'pt'}});
  const target=new URL(env.window.location.assigned,'https://daycare.example');
  assert.equal(target.pathname,'/pt/');
  assert.equal(target.searchParams.get('utm_campaign'),'sample');
  assert.equal(target.searchParams.has('analytics_consent'),false);
});

test('visible choice activates GA4 and preferences can revoke it',async()=>{
  const env=createRuntime({withChoice:true});
  assert.equal(env.choicePanel.hidden,false);
  assert.equal(env.scripts.length,0);
  env.listeners['choice:granted']();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(env.scripts.length,1);
  assert.equal(env.window.MateGrowthAnalytics.status().loaded,true);
  assert.equal(env.choices.get('cida-analytics-choice-v1'),'granted');
  env.listeners['preferences:click']();
  assert.equal(env.choicePanel.hidden,false);
  env.listeners['choice:denied']();
  assert.equal(env.window.MateGrowthAnalytics.status().consent,false);
});

test('stored choice works on the next page and GPC still blocks loading',async()=>{
  const granted=createRuntime({withChoice:true,savedChoice:'granted'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(granted.scripts.length,1);
  assert.equal(granted.choicePanel.hidden,true);
  const denied=createRuntime({withChoice:true,savedChoice:'denied'});
  assert.equal(denied.scripts.length,0);
  const gpc=createRuntime({withChoice:true,savedChoice:'granted',gpc:true});
  assert.equal(gpc.scripts.length,0);
});

test('WhatsApp, Instagram and tour CTA send their intended event parameters',async()=>{
  const env=createRuntime();
  await env.window.MateGrowthAnalytics.setConsent(true);
  for(const dataset of [{analytics:'whatsapp_click',analyticsContact:'whatsapp'},{analytics:'social_profile_click',socialNetwork:'instagram'},{analytics:'cta_click',analyticsLocation:'tour'}]){
    env.listeners['document:click']({target:{closest:()=>({dataset})}});
  }
  assert.equal(env.calls.find(c=>c[1]==='whatsapp_click')[2].contact_type,'whatsapp');
  assert.equal(env.calls.find(c=>c[1]==='social_profile_click')[2].social_network,'instagram');
  assert.equal(env.calls.find(c=>c[1]==='cta_click')[2].cta_location,'tour');
});
