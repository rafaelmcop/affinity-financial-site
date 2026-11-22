# Security and privacy review — 21 November 2026

Scope: the tracked live Affinity portal, its production Worker configuration, supported browser integrations and local WhatsApp runtime. This is a technical review and implementation record, not a legal opinion, a certification or a guarantee against compromise. No customer data or secrets are included in this report.

## Implemented

- English Terms of Use and Privacy Policy, version `2026-11-21.1`, with explicit unchecked acceptance, server timestamps, signed HttpOnly/Secure/SameSite receipts, document SHA-256 fingerprints and an administrator-only acceptance ledger. Original versioned documents are retained under `/legal/2026-11-21.1/`.
- Server-side acceptance checks for registration, client application writes, review submission, public contact submission and the interactive AI entry points. Reading public pages does not require agreement. Agreements are requested from the actual user; no pre-existing user was silently marked as having agreed.
- Optional AI processing and optional conversation memory have separate, default-off choices and an append-only preference-change record. Model calls are rejected before execution without processing authorization. With memory off, the assistant neither saves new conversation history nor reuses previous memory. The existing owner/actor/admin boundaries and masked sensitive financial summaries remain in place. There is no model-training or fine-tuning feature.
- Optional Vimeo/YouTube homepage players are held behind a browser privacy choice. Essential session cookies remain necessary. Google Fonts and enabled account integrations are disclosed; their external service processing must not be described as the portal's own security certification.
- Administrator incident register at `/admin/privacidade-seguranca`, also in the Admin settings menu. Case details use the existing server-side AES-GCM encryption facility. Creating an incident immediately attempts an email alert to the responsible administrator; unsuccessful alerts remain pending for five-minute retries. Messages omit customer details. Scope reviews and completed notifications to authorities/affected persons are audit recorded.
- The incident register does **not** automatically discover every breach or submit government/customer notices. Reporting obligations depend on verified data, affected jurisdictions and business status. Ordinary HTTP errors are not proof of a breach. Preserve evidence, contain the event and obtain prompt legal/incident-response help when an actual incident is identified.

## Verified findings

- Pattern scan of current tracked source and 2,957 historical text blobs across 362 commits found no matching private-key blocks, GitHub tokens, AWS access IDs, Google API keys or OpenAI secret keys. Pattern matching does not establish that every possible secret or past disclosure is absent. Ignored operational credentials and session stores must remain excluded from Git and deployment assets.
- Application-source scans found no advertising pixel/marketing SDK initialization for Google Analytics/Tag Manager, Meta Pixel, Hotjar, Clarity, Mixpanel or PostHog. The inspected live homepage loaded scripts from its own hostname. This is not a permanent guarantee about third-party embedded content or future dashboard-injected scripts.
- No unsupported SOC 2, HIPAA/PCI certification, security seal or “100% secure” claim was found in the reviewed first-party page templates. No invented certification was added.
- `npm audit --omit=dev`: zero published vulnerability findings for both the pinned live mail runtime and the WhatsApp service on this review date. Existing application-specific mail parser/attachment restrictions remain covered by regression tests.
- D1 is not a publicly listening SQL server and has no independent SQL password to set. Worker bindings and Cloudflare account/API authorization control access. Cloudflare provides AES-256 encryption at rest and TLS for database transport. Passwords remain hashed; sensitive application fields and integration credentials use the existing server-side encryption. Production secrets remain outside the public code bundle.
- macOS firewall is enabled. The reviewed Cloudflare credential file has restrictive `0600` permissions. FileVault remains **off** according to the owner's prior decision to permit unattended startup. Physical access to this computer remains a material risk to local WhatsApp sessions and data; provider encryption of D1 does not protect an unencrypted Mac disk.
- No breach was established by these checks. This was not a forensic examination of every historical request, a penetration-test certification or a review of every external provider account.

## Validation

61 automated checks passed across versioned acceptance, CSRF/origin protection, actor isolation, AI permission/memory behavior, incident encryption/alert retry behavior, scoped data access, private-file protection, mail attachment restrictions, session expiry and homepage availability. Browser testing used a disposable local account to confirm that unchecked terms cannot be saved and that optional AI/media choices remain unchecked. No real client messages or legal incident reports were sent by the tests.

## Remaining legal and operational work

- Have qualified counsel review these documents against the company's actual insurance, financial-service, marketing, state, federal and any international obligations. Consent is not a substitute for a lawful basis, minimization, an appropriate provider agreement or a regulatory obligation.
- Confirm the scope of insurance licensing, applicable GLBA/insurance cybersecurity rules, customer records retention and legal holds. Determine required breach recipients and deadlines for each actual incident; do not assume a single universal deadline.
- Review contracts/permissions for Five Rings, National Life, WhatsApp and imported third-party/group contact information. A browser integration is not an official vendor API. Transparency and staff authority do not themselves establish every contact's marketing authorization. Previously paused WhatsApp bulk automations were not enabled by this release.
- Use MFA on Cloudflare/GitHub/email administrator accounts, least-privilege API tokens, tested recovery/backups and periodic access/secret reviews. Retain the ability to revoke connected accounts and sessions. Do not rotate the data-encryption secret without a migration plan for existing encrypted records.
- The existing CSP permits legacy inline scripts; a tighter nonce policy remains in report-only rollout to avoid breaking the portal. Further removal of legacy inline code should be staged and tested rather than claiming a fully strict CSP today.
- Revisit FileVault and secured physical hosting when unattended operations and disk protection can both be supported.

## Primary references

- D1 encryption and transport: https://developers.cloudflare.com/d1/reference/data-security/
- Workers AI data use and no model training: https://developers.cloudflare.com/workers-ai/platform/data-usage/
- Massachusetts reporting: https://www.mass.gov/info-details/report-a-data-breach
- FTC Safeguards Rule applicability and notification: https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know
