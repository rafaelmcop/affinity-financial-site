# Chrome Web Store submission — Affinity Five Rings Connector

Status: prepared for submission; not submitted or approved. Registration fee paid by owner on October 29, 2026. Publisher account remains owned by the user.

## Store listing (English)

Name: Affinity Five Rings Connector

Short description: Sync authorized Five Rings client, policy and credit records with your Affinity agent portal using your own browser session.

Category: Productivity / Workflow and planning (choose the closest category available in the dashboard).

Language: English. Existing Affinity synchronization screens currently use Portuguese.

Detailed description:

Connect your authorized Five Rings browser session to your Affinity Financial Consulting agent portal. Sign in directly with Five Rings, complete its security checks, then synchronize the client, policy and available production records you are authorized to access.

• Read client and policy lists with completeness checks.
• Read up to three detailed records in parallel and display synchronization progress.
• Resume completed stages of an interrupted capture for up to ten minutes in the same browser session and matching account.
• Continue using the Affinity portal while the browser synchronization runs in a background tab.
• Review and enable data access before synchronization, and disable new synchronization jobs from the extension icon.

An existing authorized Affinity account and Five Rings access are required. Data availability depends on the connected Five Rings account. The extension does not bypass passwords, MFA or reCAPTCHA, and does not extract passwords, verification codes or cookies. Browser restarts, extension reloads or expired sessions can require a new capture or login.

This is an independent Affinity Financial Consulting integration. It is not a Five Rings Financial product, endorsement or official API integration. Data is transferred to the user's authenticated Affinity portal and may be accessible to authorized Affinity administrators and assigned assistants under portal permissions.

Privacy policy and support: https://www.affinityfc.org/five-rings-privacy.html
Support email: rafael.cunha@affinityfc.org
Homepage: https://www.affinityfc.org/
Distribution: Unlisted. Anyone who has the store URL can install it; portal and Five Rings authentication are still required. Do not claim it is limited to employees by store visibility alone.

## Permission justifications

scripting: Read the column/order configuration of the signed-in Five Rings DataTables from static packaged functions in the page's main world, so requests match the native client and policy tables. Only the allowed Five Rings account paths are accepted; no password/cookie values or arbitrary remote code are exported.

storage: Store the explicit consent preference locally and temporarily store read checkpoints in extension session memory. Checkpoints are account-scoped, eligible for resumption for up to ten minutes and cleared after completion or later expiry/account mismatch detection. No Chrome sync storage is used.

https://portal.fiveringsfinancial.com/*: Read the authorized user's dashboard, client and policy tables and associated detail pages using the existing browser session, and optionally select the existing remember-device checkbox.

https://www.affinityfc.org/*: Read the authenticated portal configuration, receive synchronization commands and return captured data to that user's authorized portal session.

Remote code: No. Executed functions and all extension JavaScript are included in the submitted package. The product reads remote data, not remotely hosted executable extension code.

## Privacy disclosures to enter in the dashboard

Single purpose: Synchronize an authorized Five Rings account's client, policy and available production records into the matching user's Affinity agent portal.

Data handled: Personally identifiable information; financial/payment information; website content; health/underwriting information if present in the authorized policy details. Complete the dashboard using its current category wording and the published privacy policy. Do not state that no user data is handled simply because some capture progress stays in session memory.

No sale of user data, unrelated advertising, creditworthiness decisions or lending-purpose transfers. Imported records are available only under the portal's authorization model. Credentials are handled by the original websites; the extension does not extract authentication cookie values or passwords.

## Files to upload

Extension ZIP: recovered-live/public/affinity-five-rings-webstore.zip (manifest at root)
Store icon: integrations/five-rings-store/assets/icon128.png
Screenshots: integrations/five-rings-store/assets/screenshot-data-access.png and screenshot-progress.png (1280 × 800; progress example explicitly marked as demonstration)

## Reviewer instructions

1. Install the submitted package; the data-access page opens. Review the disclosure and enable synchronization.
2. Use an authorized Affinity account and its matching Five Rings account. The publisher must provide any reviewer/test account information securely in the developer dashboard, if requested; no credentials are in this repository or package.
3. Complete Five Rings authentication directly with the vendor, including MFA or reCAPTCHA if requested.
4. Open Affinity settings → browser synchronization. The existing reader tab is reused; the portal remains usable during background capture.
5. Observe client, policy and detail progress. Captures with incomplete list counts are rejected. Interrupted completed stages can be reused within ten minutes for the matching account.
6. Open the extension icon and disable synchronization to prevent new jobs. Existing imported portal data is retained until an authorized administrator removes it.

The review decision and timing are controlled by Google. Do not label the extension published until the dashboard confirms it, and do not replace the portal's installation link with a guessed store ID.
