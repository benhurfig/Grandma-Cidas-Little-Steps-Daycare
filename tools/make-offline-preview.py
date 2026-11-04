from pathlib import Path
import json,base64,re
root=Path(__file__).resolve().parents[1]
public=root/'public'
css=(public/'assets/styles.css').read_text()
js=(public/'assets/main.js').read_text()
pages={}
for p in public.rglob('index.html'):
 route='/'+str(p.relative_to(public)).replace('index.html','')
 html=p.read_text()
 html=html.replace('<link rel="stylesheet" href="/assets/styles.css">','<style>'+css+'</style>')
 html=html.replace('<script defer src="/assets/main.js"></script>','')
 pages[route]=html
assets={}
for p in (public/'assets/photos').glob('*'):
 if p.suffix.lower() not in {'.webp','.jpg','.jpeg','.png'}: continue
 mime={'.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png'}[p.suffix.lower()]
 assets['/assets/photos/'+p.name]=f'data:{mime};base64,'+base64.b64encode(p.read_bytes()).decode()
for p in (public/'assets/videos').glob('*.mp4'):
 assets['/assets/videos/'+p.name]='data:video/mp4;base64,'+base64.b64encode(p.read_bytes()).decode()
serialize=lambda obj:json.dumps(obj,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
outer='''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grandma Cida’s — Prévia V3</title><style>*{box-sizing:border-box}body{margin:0;background:#e6e8e0;color:#173b45;font:13px system-ui}.toolbar{height:64px;padding:10px 20px;background:#173b45;color:#fff;display:flex;gap:15px;align-items:center;justify-content:space-between}.toolbar strong{font-size:13px}.toolbar small{display:block;font-size:10px;color:#c6d6ce}.controls{display:flex;gap:8px;align-items:center}.controls button,.controls select{border:1px solid #ffffff40;background:#fff;color:#173b45;border-radius:7px;padding:7px 10px;font-size:12px;cursor:pointer}.controls button[aria-pressed=true]{background:#f4b740;border-color:#f4b740}#frame{display:block;border:0;background:#fffaf1;width:100%;height:calc(100vh - 64px);margin:auto;box-shadow:0 0 25px #173b4512}body.mobile #frame{width:min(390px,100%)}@media(max-width:620px){.toolbar{height:auto;min-height:98px;gap:10px;flex-wrap:wrap;padding:12px}.controls{width:100%;justify-content:space-between}#frame{height:calc(100dvh - 104px)}.toolbar strong{font-size:12px}}:focus-visible{outline:3px solid #f4b740;outline-offset:2px}</style></head><body><div class="toolbar"><div><strong>Grandma Cida’s · Versão 3</strong><small>Prévia para revisão · sem publicação</small></div><div class="controls"><select id="locale" aria-label="Idioma"><option value="en">EN</option><option value="pt">PT</option><option value="es">ES</option></select><select id="page" aria-label="Página"><option value="/">Home</option><option value="/care/">Cuidado</option><option value="/about/">Meet Cida</option><option value="/daily-life/">Rotina</option><option value="/our-space/">Espaço</option><option value="/faq/">Dúvidas</option><option value="/locations/whitman-and-nearby-towns/">Cidades</option><option value="/privacy/">Privacidade</option></select><button id="desktop" aria-pressed="true">Desktop</button><button id="mobile" aria-pressed="false">Celular</button></div></div><iframe id="frame" title="Prévia navegável do website da Cida"></iframe><script>
'''
outer+='const PAGES='+serialize(pages)+';\nconst ASSETS='+serialize(assets)+';\nconst RUNTIME='+serialize(js)+';\n'
outer+='''for(const [path,url] of Object.entries(ASSETS)){if(path.endsWith('.mp4')){const encoded=url.slice(url.indexOf(',')+1),raw=atob(encoded),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);ASSETS[path]=URL.createObjectURL(new Blob([bytes],{type:'video/mp4'}));}}
const frame=document.getElementById('frame');
const locale=document.getElementById('locale'),page=document.getElementById('page');
let current='/';
const bridge=`document.addEventListener('click',function(e){const a=e.target.closest('a');if(!a)return;const h=a.getAttribute('href');if(h&&h.startsWith('#')){e.preventDefault();document.getElementById(h.slice(1))?.scrollIntoView({behavior:'smooth'});}else if(h&&h.startsWith('/')){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({type:'cida-preview-navigate',path:h},'*');}else if(h&&/^https?:/.test(h)){a.target='_blank';a.rel='noopener noreferrer';}},true);document.addEventListener('change',function(e){if(!e.target.matches('[data-language-picker]'))return;e.preventDefault();e.stopImmediatePropagation();const route=window.MG_LANGUAGE_ROUTES?.[e.target.value]?.[document.body.dataset.page];if(route)parent.postMessage({type:'cida-preview-navigate',path:route},'*');},true);`;
function render(path){const [route,anchor]=path.split('#');if(!PAGES[route])return;current=route;const lang=route.startsWith('/pt/')?'pt':route.startsWith('/es/')?'es':'en';locale.value=lang;page.value=lang==='en'?route:route.slice(3);let html=PAGES[route];html=html.replaceAll(/\\/assets\\/(?:photos\\/[a-z0-9-]+\\.(?:webp|jpe?g|png)|videos\\/[a-z0-9-]+\\.mp4)/g,m=>ASSETS[m]||m);const script=bridge+'\\n'+RUNTIME+(anchor?'\\ndocument.getElementById('+JSON.stringify(anchor)+')?.scrollIntoView();':'');html=html.replace('</body>','<script>'+script.replaceAll('</script','<\\/script')+'<'+ '/script></body>');frame.srcdoc=html;}
function choose(){render((locale.value==='en'?'':'/'+locale.value)+page.value);}
locale.addEventListener('change',choose);page.addEventListener('change',choose);
for(const mode of ['desktop','mobile'])document.getElementById(mode).addEventListener('click',()=>{document.body.classList.toggle('mobile',mode==='mobile');for(const m of ['desktop','mobile'])document.getElementById(m).setAttribute('aria-pressed',String(m===mode));});
window.addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.data?.type==='cida-preview-navigate'&&typeof e.data.path==='string')render(e.data.path);});
render('/');
</script></body></html>'''
# The literal </script in JS replacement source must not terminate the outer script.
outer=outer.replace("script.replaceAll('</script','<\\/script')", "script.replaceAll('<'+'/script','<'+'\\\\/script')")
output=root.parent/'Grandma-Cida-Previa-V3.html'
output.write_text(outer)
print(output, output.stat().st_size)
