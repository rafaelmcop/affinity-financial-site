# Affinity portal — security, reliability and search review

Date: October 23, 2026. Times referenced below use America/New_York.

## Scope and limits

Reviewed the recovered production Worker and portal assets, identity/role/assistant boundaries, customer ownership tests, database integrity and encryption-format aggregates, public unauthenticated endpoints, attachment handling, Mac WhatsApp data permissions, dependency advisories, search metadata and crawler behavior. Production database checks were read-only and returned aggregates rather than customer information. No real email, WhatsApp message or call was sent as a test. No customer or historical delivery records were changed.

This review is not evidence that a breach never occurred. It did not include a forensic review of every historical request, an independent penetration test, or authenticated manual navigation through every account. Historical Cloudflare exception details remain unavailable with the current telemetry permissions. Recent transient 500s cannot conclusively be attributed to a particular database operation from the available logs.

## Findings addressed

1. **Stored script injection risk in public profile photos — high priority.** A photo value beginning with HTTPS could include a quote and an HTML event attribute. It was inserted directly into the image markup. Attribute escaping now prevents that value from creating executable attributes. A synthetic browser test verifies malicious photo values, biography markup and JavaScript links cannot execute. No production exploit was attempted and no evidence of past exploitation was established.
2. **Obsolete production email component — high priority.** The published Worker embedded Nodemailer 9.0.3. It now uses pinned Nodemailer 10.0.10; the old embedded implementation was removed. Lockfile integrity and a deployment installation recipe were added. Filesystem and remote-URL attachment resolution are disabled. A memory-only transport test verifies PDF attachment construction and rejects file/URL reads. This does not constitute a live SMTP delivery test.
3. **Inconsistent privacy headers — medium priority.** Login pages and several early-return API responses did not uniformly receive indexing/cache protections. An outer response layer now applies `noindex`, `noarchive`, private/no-store and cookie/authorization variation to portal/API routes, including login screens. These headers supplement authentication; they do not replace it.
4. **Sensitive-resource fallback — medium priority.** Unknown paths such as database filenames could return the generic homepage with HTTP 200. Database exports, backup/key/source-map files, private folders and encoded secret-path variants now return 404 before application processing. This was a misleading fallback response, not proof that a database file was publicly downloadable.
5. **Repeated schema work — reliability.** Feature-access schema/migration initialization previously issued DDL and migration writes repeatedly for the same database binding. Concurrent requests now share initialization within a Worker instance; failed initialization can retry. Permission values are still read fresh, so Admin revocation takes effect immediately. This reduces unnecessary database work; it is not a confirmed root-cause diagnosis for the earlier transient 500s.
6. **Missing ongoing checks.** Added a separate GitHub workflow for the actual live code, owner/permission regression tests and high/critical advisory checks for the production email runtime and WhatsApp service. It does not deploy or receive production secrets.

## Verified controls

- Remote D1 `PRAGMA quick_check`: `ok`.
- No malformed feature permission JSON found; no deleted Admin-account rows remained active in the checked table.
- No nonempty application `sensitiveData`, Admin/agent SMTP passwords, Five Rings stored passwords, Calendly tokens or domain-routing token failed the expected encrypted `v1.` format check. The implementation uses AES-GCM with random IVs. Format checks do not independently decrypt or prove every record's semantic correctness.
- Password authentication uses bcrypt; signed sessions are time-limited, with HttpOnly/Secure/SameSite cookies and active-account checks. Tests cover malformed/expired sessions and role boundaries.
- Unauthenticated requests to CRM listing, dashboard, Admin users/SMTP settings, private email attachments, domain-email administration and assistant identity returned 401. Mutation/origin/owner boundaries are covered by the regression suite.
- Public asset pattern scan found no private-key, GitHub-token, Cloudflare-token or AWS-key signatures among 240 scanned files. Pattern scanning cannot detect every possible secret format or private information in media.
- WhatsApp private directory: 0700; environment file: 0600; data/session directories: 0700; history database: 0600.
- WhatsApp service dependency audit: zero reported advisories at review time. New pinned email-runtime audit: zero reported advisories at review time.
- Existing spreadsheet browser runtime is SheetJS 0.20.3; the legacy npm `xlsx` warnings refer to a different dependency tree.
- 221 local regression tests passed. Public profile security and homepage desktop/mobile browser fixtures passed. Cloudflare deployment dry-run succeeded.

## Search improvements

- The homepage now includes useful semantic service text and real internal links in its initial HTML, before React loads. This is served identically to users and crawlers; React replaces it with the normal homepage. No hidden keyword stuffing or bot-specific content was added.
- Kept the descriptive title, description, canonical URL and insurance/financial-service structured data; added WebSite structured data.
- Removed misleading English/Spanish hreflang entries that pointed to the same Portuguese URL. Distinct translated URLs would be required for reliable language alternates.
- Removed the viewport zoom restriction for accessibility.
- Updated the homepage modification date in the sitemap and added assistant/internal route exclusions to robots.txt. Private responses carry explicit noindex headers as well.
- Unknown public paths using the SPA fallback now return a real 404. The homepage aliases redirect to the canonical www homepage.
- Google does not use the meta-keywords tag for ranking; natural visible content, crawlable links and accurate metadata are used instead.

## Remaining work / operational limits

- **Search Console:** Ownership verification, sitemap submission, URL inspection and measured search performance need access to the domain owner's Google Search Console. No such session/API connection was available here. The sitemap is published and discoverable through robots.txt; indexing and rankings are determined by Google and cannot be guaranteed.
- **Historical build:** The root `pnpm-lock.yaml` audit reported 64 advisories (2 critical, 23 high, 32 moderate, 7 low) in the historical TypeScript dependency tree. These are not a production-Worker scan and must not be described as 64 demonstrated live vulnerabilities. The two critical package families (proxy-addr/DOMPurify) were not found in the live Worker/public scripts during this review. That old build must not be redeployed without a dedicated dependency migration and its own regression testing. Production Nodemailer was separately identified and updated in this release.
- **CSP:** The enforced policy still permits inline scripts for compatibility. A stricter nonce policy is report-only. Moving it to enforcement requires migrating inline scripts/event handlers and testing all workflows; enabling it blindly would break parts of the portal. Output escaping, sandboxed email HTML and authentication remain necessary.
- **Physical device:** FileVault was previously disabled at the owner's request for unattended startup. Filesystem permissions protect against other nonprivileged users, not offline access after theft. The Mac contains WhatsApp sessions, contacts/history and temporary attachments, so physical security remains relevant.
- **Bearer links:** Private application/review URLs grant access to their holders. Treat them as confidential; never place them in public sitemaps or analytics. This review did not invalidate existing client links.
- **Backups:** Database integrity was checked; a full restore drill and account-level backup-retention verification were not performed. Repository commits preserve code, not a backup of customer data.

## References

- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google robots/noindex documentation: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- Sitemap documentation: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Nodemailer advisory and patched version: https://github.com/advisories/GHSA-39m8-27wv-hr27
- SheetJS authoritative browser distribution: https://docs.sheetjs.com/docs/getting-started/installation/standalone/
