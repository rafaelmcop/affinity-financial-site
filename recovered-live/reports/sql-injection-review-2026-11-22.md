# SQL injection review — 22 November 2026

Scope: request-controlled CRM fields, account boundaries, direct D1 query construction in the live Worker and modules, dynamically assembled lead/marketing SQL fragments, application revision guards and model-driven CRM discovery. Tests used synthetic in-memory records only, never destructive statements against production.

## Findings and changes

- The reviewed CRM writes, searches and ownership predicates use bound parameters. Table selection for email attachment recovery is selected from two server-defined names; application update columns come from fixed server-side lists. AI plans do not become arbitrary SQL.
- Added exact allowlists to the lead-visibility and marketing-participation fragment builders. Unexpected identifiers, comments, statement separators, UNION clauses or expressions are rejected before SQL preparation. This reinforces an internal boundary; no request-reachable exploit through these helpers was established during this review.
- Added centralized suppression of D1/SQLite implementation details in tRPC errors. Public error messages no longer repeat SQL statements, schema identifiers or private exception text matched by this guard. Existing restricted operational logging remains separate.
- Regression cases cover tautology payloads, UNION extraction attempts, stacked DROP statements, comments, extension-loading expressions, forged column keys, foreign-account keys and malformed client IDs. Legitimate apostrophes and SQL-looking notes/labels remain literal bound data instead of being blocked by a fragile keyword blacklist.
- Verified that application revision predicates ignore unexpected property names and bind client-provided values. Verified that injected client IDs are rejected before any database read.

76 targeted checks passed across SQL defenses, CRM operations, lead isolation, hierarchy, marketing, one-time legal acceptance, API request boundaries and scoped AI data reads. The GitHub workflow also runs the broader portal/WhatsApp test suite; refer to the commit's actual Actions result for that separate verification.

The one-time legal acceptance correction is stored per authenticated account and survives cookie loss, host/browser changes and future document versions. Registration carries the actual anonymous acceptance record forward only after creating the new account. No previous account was silently marked accepted.

This is a scoped technical review, not proof that every possible attack or past exposure is absent. Prepared statements, authentication, authorization, least privilege, secret management and ongoing dependency/access reviews remain necessary together. No 100% security guarantee or security certification is claimed.
