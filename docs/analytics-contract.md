# Analytics event contract

The authoritative registry is `src/analytics-contract.mjs`. Names, trigger definitions, and allowed parameter keys come from that file; `tools/check.mjs` ensures the generated bundle keeps consent/GPC and does not include a completion event.

| Event | Trigger | Allowed parameters | Meaning |
|---|---|---|---|
| `page_view` | One manual event per page load, after approved analytics consent | `page_type`, `locale` | Page was loaded by the browser; receipt still requires network/platform evidence. |
| `cta_click` | In-page CTA scrolls to `#contact` | `cta_location`, `page_type`, `locale` | Intent to view contact options. |
| `contact_options_view` | Contact area becomes visible once | `page_type`, `locale` | Contact section viewed. |
| `final_cta_request` | Click on external SmartMate request link | `cta_location`, `page_type`, `locale` | Outbound request-page click only, not a submitted request. |
| `phone_click`, `sms_click`, `email_click` | Configured protocol link clicked | `contact_type`, `page_type`, `locale` | Contact link clicked, not conversation completed. |
| `google_maps_click`, `google_reviews_click` | Configured map/review link clicked | `page_type`, `locale` | External link clicked. |
| `social_profile_click` | Configured social link clicked | `social_network`, `page_type`, `locale` | External social link clicked. |
| `language_switch` | Select a real translated page route | `source_locale`, `target_locale`, `page_type` | Locale navigation. |
| `faq_open` | Native FAQ item opens | `page_type`, `locale` | FAQ item opened. |
| `video_play` | Configured native video starts | `page_type`, `locale` | Video playback began. |

Never add `Lead` or `generate_lead` to this website contract. A confirmed Family Request belongs to the external SmartMate system and requires its own approved integration. Never pass names, emails, phone numbers, child data, free text, raw URLs, full referrers, SmartMate URLs, or arbitrary query parameters to analytics. A queued `gtag` call is not proof that GA4 received an event.

GA4 defaults off. To enable, add a valid measurement ID and an approved consent manager supplied/approved during onboarding, then call `window.MateGrowthAnalytics.setConsent(true)` only after explicit analytics consent. `navigator.globalPrivacyControl === true` prevents activation. The runtime removes query strings from `page_location` and sends no referrer; attribution parameters are forwarded only to SmartMate. Before enabling the website, review GA4 property Enhanced Measurement and disable any automatic outbound-click/form collection that could add raw link URLs or form data. The template intentionally includes no consent banner or consent storage; deployment must not interpret the absence of a banner as permission.

## v0.2.0 runtime behavior

Event names are unchanged. Separate clicks are measured separately; `page_view`, contact-section visibility, FAQ opening per item and first measurable video play remain one-time within the page. The runtime shares one pending tag-loading promise and sends an explicit denied update on revocation, including revocation while loading. Regrant updates consent without duplicating the page view.

`status()` reports `loaded`, `loading`, `pageViewQueued` and `receiptConfirmed: false`. `loaded` only means that the script's load handler ran; it does not prove an event arrived at GA4. Unit tests mock gtag and do not contact Google. Existing browser storage/cookies are not deleted by this API; deployment-specific consent/retention handling remains an onboarding task.

The accepted attribution values use ASCII campaign slugs `[A-Za-z0-9._~-]`, maximum 160 characters. Do not use contact details, personal text or spaces in UTMs. Both URL input and stored values are revalidated. A new acquisition bundle replaces the old one rather than mixing campaign fields. When session storage is unavailable, the current-page values still reach SmartMate and the language switch. `utm_id` is supported alongside the existing allowlist. Attribution after ordinary internal navigation with blocked storage is not persisted; do not claim complete cross-page attribution in that case.

No Pixel implementation has been added, no hardcoded `analytics_consent=granted` is transferred, and the template does not establish GA4 cross-domain attribution. The consent integration and live analytics acceptance test are separate tasks for the client project.
