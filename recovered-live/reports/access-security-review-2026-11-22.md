# Additional access security review — 22 November 2026

18 live, read-only, signed-out probes were blocked: seven private tRPC data operations (Admin statistics/accounts/affiliates, agent policies/applications/email settings and CRM), six private REST endpoints (legal records, incidents, OAuth configuration, audit access, assistant identity and agent access), and five sensitive file paths (.env, Git metadata, a private certificate path, a SQL backup and a source map). No private response content was copied into this report. These probes verify selected boundaries, not every possible endpoint or past event.

Code review verified signed and expiring sessions, constant-time signature checks, active-account checks, assistant session-version checks, master-only administrative audit entry, scoped assistant permissions, parameterized client queries and existing login/reset throttles.

Additional protections implemented:

- Private application link reads are rate limited per trusted Cloudflare source IP and per source/application, separately from login/reset counters. Limits are 120 total and 30 per application in a 15-minute window. A different source or application is not globally locked out. Tokens, codes and network addresses are not stored in the counters; only digests are retained.
- Client access-code/token format is checked before database lookup in the public application read/save and document-upload paths. Existing valid private links and save behavior are preserved.
- General tRPC exception logging now records a fixed category and bounded error-name class instead of dumping raw error messages that could contain query/schema/private values. Public tRPC database error messages already use the separate SQL privacy guard.
- Regression checks cover rate-limit isolation, omission of tokens/IPs from counters, application saving, request boundaries, scoped SQL behavior, sensitive-file protection and session expiry. 35 targeted checks passed before publication; the release's GitHub Actions result provides the broader suite outcome.

No breach was established by this review. A review is not a certification or a promise that compromise is impossible. The previously documented FileVault-off physical-access risk remains because the owner selected unattended startup. Cloudflare/GitHub/email MFA, periodic access reviews, safe recovery and independent penetration testing remain important complementary controls.
