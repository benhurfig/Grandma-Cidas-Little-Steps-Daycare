# Architecture

## Runtime

This is a dependency-free static site. `config/` holds per-daycare settings, `content/` holds complete locale packages, `src/` contains shared rendering and behavior, and `tools/` contains build/check/preview utilities. `public/` is generated output and is ignored by Git.

The build generates one route per enabled page and enabled locale. The default locale uses root routes; additional locales receive a locale prefix. Hreflang links are emitted only for pages that exist in each enabled locale. A locale is all-or-nothing: every enabled page, navigation label, shared string, and page section must be present before generation. Each locale module also has a `status`; production requires `approved`, so incomplete/unreviewed translations cannot publish.

## Optional modules

Pages and services are independent configuration switches. Transportation cannot render unless the transportation service is enabled. A video module requires a safe local MP4/WebM asset or approved HTTPS URL, a poster, dimensions, and a production-reviewed textual alternative. Optional VTT tracks are supported; audible speech still needs reviewed captions. No page is inferred from a generic service list.

## Local SEO

Location pages are off by default. Enable only approved locations with a unique slug and locale-specific title, description (at least 120 characters), and substantive introduction. At least two visible body sections (400 characters in total) are required in addition to the metadata. Duplicate intros/descriptions/bodies are checked within each locale after normalizing the city name; this catches simple city-name substitutions but cannot establish editorial quality. Human review remains required. Unapproved locations fail validation. The generator does not manufacture neighborhood copy. LocalBusiness/ChildCare JSON-LD stays off until identity, URL, address, and phone facts are supplied and reviewed.

## Security and privacy defaults

- Demo mode emits `noindex,nofollow` and a visible DEMO ribbon.
- Production mode rejects demo identity, example URLs, missing company slug, missing timezone/location, incomplete locales, and a template privacy notice.
- No external form, iframe, family-request page, iframe-resize, or postMessage code exists.
- Attribution values are restricted to the configured UTM/click-ID allowlist, kept in session storage when available (with a current-page in-memory fallback), and forwarded to the configured SmartMate URL. They are not sent as GA4 parameters.
- No analytics or advertising tags load by default. GA4 requires an explicit client configuration and an external approved consent integration. Global Privacy Control blocks enablement. No consent banner or persistence system is included.
- The website reports click events only. It does not emit `Lead` or `generate_lead`.

## v0.2.0 shared rendering and QA

Institutional and local pages use the same render path: theme, header/footer, bulletin, Final CTA, canonical/hreflang including x-default, and social-sharing metadata. Approved local routes are linked from the footer. Schema can be enabled for the verified business independently of extra local landing pages. Local pages must never fabricate another physical branch.

Configured logo and social-share images use local assets with dimensions. The 404 uses the default locale's labels. Modes other than `demo` or `production` are rejected. Build validators are explicit checks, not a security certification or editorial approval.
