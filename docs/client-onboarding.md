# First website onboarding

1. Copy this directory to a new, independent project directory. Do not copy any existing daycare site's public output or customer assets.
2. Gather owner-approved business name, legal name, service list, ages, schedules, policies, timezone, address, contact details, SmartMate company slug, and any links. Record who verified each fact.
3. Edit `config/site.config.mjs`. Replace every demo value, set `mode: 'production'` only after content review, and enable only pages/services the daycare actually offers.
4. Add a complete locale module for every locale in `locales.enabled`. Translate navigation, shared labels, all enabled page headings/intro/sections, FAQs, privacy and optional-module text. Keep its `status` as `demo` until a qualified human has reviewed the complete translation; only then change it to `approved` and enable the locale.
5. Add owner-authorized images in a client-owned assets folder, with descriptive alt text, intrinsic width/height, responsive variants, and appropriate rights. Remove neutral illustration placeholders.
6. Add local SEO pages only for approved cities with genuinely distinct, useful material. Configure each location's content for every enabled locale. Never spin up near-duplicate city pages.
7. Review privacy/consent. Analytics remains off until policy and consent flow are approved. If GA4 is enabled, supply the ID through configuration and connect the approved consent manager; never hardcode a granted state. Do not configure a Pixel without a separate privacy review.
8. Run `npm test`, `npm run build`, `npm run check`, and `npm run preview`. Run `npm run build:production` only after all production checks pass. Review `public/` as generated output; do not hand-edit it.
9. Verify every route, language switch, CTA scroll, SmartMate external destination, protocol contact link, keyboard menu, mobile layout, metadata, robots, sitemap, and event behavior in a clean browser. Confirm actual analytics receipt in the provider separately.
10. Set up hosting/domain and redirects in the client's own project only after review and separate authorization. This template never publishes or configures hosting.

## v0.2.0 configuration details

- `media.logo`: optional local image object, with `src`, `width`, `height`, `altByLocale`. The adjacent visible brand name supplies the header link name, so the header logo itself has empty alt to avoid repetition.
- `media.socialImage`: optional object with the same fields, for Open Graph sharing.
- Images go in `assets/` in the project root; their public paths start with `/assets/`.
- `links.video`: local `/assets/tour.mp4` or an owner-approved HTTPS media file. `media.tour` supplies `poster` (image object), intrinsic `width`/`height`, `tracks` (`src`, `locale`, `label`) and `transcriptByLocale`. Human-reviewed captions are needed for meaningful speech; the build does not inspect the video's audio.
- Local pages additionally require `contentByLocale[locale].sections`, an array of at least two `{heading, body}` objects. Character counts are only a minimum structural check, not proof of useful SEO content.
- SmartMate's base URL has **no query**. Set the daycare's URL-safe identifier separately in `links.companySlug`; the final link receives `?company=...` automatically.
- `localSeo.schemaEnabled` does not require additional city landing pages. It does require verified name, URL, full address and phone.
- Every new language module must provide `common.areasServed`, `common.tourDescription`, `common.notFoundTitle`, and `common.returnHome` in addition to the existing complete strings. Use `export default` when a locale code contains a hyphen.
- Do not copy the synthetic testing fixture's approval flags into a client project. A successful QA fixture build is not a client's approval.
