# Acceptance checklist

- [ ] No client names, photos, testimonials, contact data, domains, company slugs, measurement IDs, or Pixel IDs.
- [ ] Production build fails while required identity, SmartMate company slug, locale copy, or approvals are missing.
- [ ] Every enabled locale is complete across all enabled pages and shared UI.
- [ ] Optional services/pages appear only when enabled and supported by verified daycare facts.
- [ ] Mobile Hero DOM order is H1 → media/card/mockup → H2 → intro/actions; no horizontal overflow.
- [ ] Menu is at the top, keyboard accessible, Escape closes it, focus returns to its toggle, and locale links exist.
- [ ] Bulletin requires timezone and validity window; month/year are calculated in configured timezone; no vacancy claim is enabled by default.
- [ ] One Final CTA per page; in-page conversion CTAs scroll to `#contact`; only the primary request action leaves for SmartMate.
- [ ] Call/Text/Email keep `tel:`, `sms:`, and `mailto:` protocols; floating text control does not obscure page content.
- [ ] Our Space provides indoor/outdoor structure and optional native video with accessible controls; placeholder illustrations are replaced only with approved assets.
- [ ] Local SEO pages are approved, substantive, unique, localized, canonicalized, and included in sitemap only when enabled.
- [ ] Schema uses verified facts only; robots/sitemap/canonical/hreflang match actual generated routes.
- [ ] Tracking starts disabled; consent/GPC are respected; page_view has no duplicate auto-send; event params are allowlisted; no PII, raw URLs, or child information.
- [ ] A click is not called a completed request; no website `Lead`/`generate_lead`.
- [ ] Tests, demo build, route checks, and browser QA pass; analytics receipt is separately evidenced.

## Regression checks added in v0.2.0

- [ ] Concurrent GA grants create one loader; revocation before/after load queues denied; regrant does not duplicate page_view.
- [ ] Repeated clicks count separately; visibility/FAQ/video one-time rules remain distinct.
- [ ] Expired bulletin is visually hidden even though its CSS component has a display rule.
- [ ] Blocked storage does not discard current-page attribution; invalid stored values are removed.
- [ ] Local pages share the configured theme and are linked from the site.
- [ ] Every individual CTA is checked, not merely the existence of one valid anchor.
- [ ] Header logo/social image/video poster have safe local paths and dimensions.
- [ ] Motion-reduced and synthetic multilingual layouts are reviewed in the client-specific website.
