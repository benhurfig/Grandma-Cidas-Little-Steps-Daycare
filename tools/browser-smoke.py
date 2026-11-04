"""Optional OFFLINE Chromium render/interaction checks; never sends a real request.
Requires Python + Playwright and Chromium. HTTP deployment and GA4 receipt are not tested.
Run: python tools/browser-smoke.py --chromium /usr/bin/chromium --output audit-output/browser
"""
from pathlib import Path
import argparse
import json
import re
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--chromium', default=None)
parser.add_argument('--output', default='audit-output/browser')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
out = Path(args.output).resolve()
out.mkdir(parents=True, exist_ok=True)
css = (root / 'public/assets/styles.css').read_text()
js = (root / 'public/assets/main.js').read_text()

def offline_html(path):
    html = path.read_text().replace('<link rel="stylesheet" href="/assets/styles.css">', '<style>' + css + '</style>')
    return html.replace('<script defer src="/assets/main.js"></script>', '')

results = {'mode': 'offline set_content; not HTTP, deployment or actual analytics receipt', 'pages': [], 'interactions': {}}
errors = []
with sync_playwright() as p:
    options = {'headless': True}
    if args.chromium:
        options['executable_path'] = args.chromium
    browser = p.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    page.on('pageerror', lambda error: errors.append(str(error)))
    # Deliberately do not allow any external download or analytics request.
    page.route('**/*', lambda route: route.abort())
    for file in sorted((root / 'public').rglob('*.html')):
        for width in [320, 375, 390, 768, 1024, 1280, 1440]:
            page.set_viewport_size({'width': width, 'height': 900})
            page.set_content(offline_html(file))
            if file.name != '404.html':
                page.add_script_tag(content=js)
            state = page.evaluate('''() => {
                const r = element => element?.getBoundingClientRect();
                const hero = document.querySelector('.hero');
                const title = r(hero?.querySelector('h1')), media = r(hero?.querySelector('.hero-media')), subtitle = r(hero?.querySelector('h2'));
                return {overflow: document.documentElement.scrollWidth > innerWidth,
                    heroOrder: !hero || innerWidth > 900 || (title.bottom <= media.top + 1 && media.bottom <= subtitle.top + 1),
                    ctaCount: document.querySelectorAll('#contact').length};
            }''')
            assert not state['overflow'], f'Overflow: {file} @ {width}'
            assert state['heroOrder'], f'Hero order: {file} @ {width}'
            if file.name != '404.html':
                assert state['ctaCount'] == 1
            results['pages'].append({'page': str(file.relative_to(root / 'public')), 'width': width, **state})

    home = root / 'public/index.html'
    page.set_viewport_size({'width': 390, 'height': 844})
    page.set_content(offline_html(home)); page.add_script_tag(content=js)
    page.locator('.menu-toggle').click()
    assert page.locator('.menu-toggle').get_attribute('aria-expanded') == 'true'
    page.keyboard.press('Escape')
    assert page.locator('.menu-toggle').get_attribute('aria-expanded') == 'false'
    assert page.locator('.menu-toggle').evaluate('(el)=>document.activeElement === el')
    page.locator('.menu-toggle').click()
    page.locator('h1').click()
    assert page.locator('.menu-toggle').get_attribute('aria-expanded') == 'false'
    results['interactions']['menu_escape_focus_and_outside_click'] = 'PASS'
    page.evaluate('window.scrollTo(0,0)'); page.screenshot(path=str(out / 'home-mobile.png'), full_page=True)
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.screenshot(path=str(out / 'home-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    space = root / 'public/our-space/index.html'
    page.set_content(offline_html(space)); page.add_script_tag(content=js)
    page.screenshot(path=str(out / 'our-space-mobile.png'), full_page=True)
    page.set_content(offline_html(root / 'public/faq/index.html')); page.add_script_tag(content=js)
    page.locator('details[data-faq] summary').first.click()
    assert page.locator('details[data-faq]').first.evaluate('(el)=>el.open')
    results['interactions']['native_faq'] = 'PASS'

    # Inject synthetic controls ONLY into this test document, not the template.
    html = offline_html(home).replace('<main id="main">', '''<main id="main"><aside class="bulletin" data-bulletin hidden data-valid-from="2000-01-01T00:00:00Z" data-valid-until="2001-01-01T00:00:00Z" data-timezone="America/New_York" data-date-locale="en-US"><span data-bulletin-date></span><p>Expired synthetic notice</p></aside>''')
    html = html.replace('</body>', '<a class="floating-text" href="sms:+12025550101">Text me (QA)</a></body>')
    page.set_content(html); page.add_script_tag(content=js)
    assert page.locator('[data-bulletin]').evaluate('(el)=>el.hidden && getComputedStyle(el).display === "none"')
    results['interactions']['expired_bulletin_hidden'] = 'PASS'
    page.locator('.menu-toggle').click()
    assert page.locator('.floating-text').evaluate('(el)=>el.hidden')
    results['interactions']['floating_sms_hidden_when_menu_open'] = 'PASS'
    page.keyboard.press('Escape')
    page.evaluate('''() => {
        const button=document.querySelector('.request-card .button');
        const absTop=button.getBoundingClientRect().top+scrollY;
        window.scrollTo(0,absTop-innerHeight+75);
        window.dispatchEvent(new Event('scroll'));
    }''')
    page.wait_for_timeout(150)
    # The floating element must be hidden OR not overlap the main conversion button.
    assert page.evaluate('''() => {const f=document.querySelector('.floating-text');if(f.hidden)return true;const a=f.getBoundingClientRect(),b=document.querySelector('.request-card .button').getBoundingClientRect();return !(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);}''')
    results['interactions']['floating_sms_does_not_cover_final_button'] = 'PASS'
    assert not page.evaluate("Array.from(document.scripts).some(s=>s.src.includes('googletagmanager')||s.src.includes('facebook'))")
    results['interactions']['demo_has_no_tracking_script'] = 'PASS'
    page.emulate_media(reduced_motion='reduce')
    assert page.evaluate('getComputedStyle(document.documentElement).scrollBehavior') == 'auto'
    results['interactions']['reduced_motion'] = 'PASS'
    assert not errors, errors
    results['javascript_errors'] = errors
    browser.close()
(out / 'results.json').write_text(json.dumps(results, indent=2))
print(json.dumps({'page_viewport_checks': len(results['pages']), 'interactions': results['interactions'], 'javascript_errors': errors}, indent=2))
