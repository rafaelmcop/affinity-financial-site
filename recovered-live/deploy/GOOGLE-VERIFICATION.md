# Google OAuth verification preparation

Status checked 2026-11-06 in Google Cloud project affinity-portal-513823:
- Publishing status is production; this does not constitute Google verification.
- Verification Center reports that branding has not been verified/published.
- Data-access verification has not been approved; it requires verified branding.
- No verification submission or approval is claimed by this document.

## Existing branding

App: Affinity Portal
Support/developer contact: us.rafael@icloud.com
Home: https://portal.affinityfc.org/
Privacy: https://portal.affinityfc.org/portal-privacy.html
Authorized domain: affinityfc.org
Both public pages returned HTTP 200 on 2026-11-06.

Confirm domain ownership in Search Console using a project Owner/Editor.
Do not replace MX records or alter existing mail delivery for verification.
Do not claim domain verification merely because it is an authorized OAuth domain.

## Calendar scope justifications

https://www.googleapis.com/auth/calendar.calendarlist.readonly
Affinity Portal lists calendars in the consenting user's Google account so that
the user can choose one professional calendar to display in their own portal.
Write access to calendars or calendar sharing settings is not requested.

https://www.googleapis.com/auth/calendar.events.readonly
Affinity Portal reads timed events from the selected professional calendar to
show appointments, meeting links and participants to the account owner and their
authorized assistants. The import window is 30 days before and 180 days after the
current date. It never edits or deletes events in Google. Imported history stays
in the account's portal for continuity and auditing, as disclosed in the policy.

openid/email/profile establish the consenting Google account's identity.
Calendar tokens are encrypted separately from email tokens. Calendar connection
never changes existing mailbox credentials. Administrators have audit access;
assigned assistants have access only to authorized owners and functions.

## Separate existing Gmail requirement

The same project currently also declares https://mail.google.com/ for the
existing optional Gmail SMTP/IMAP integration. That restricted scope has its own
Google verification/assessment requirements. Do not silently remove it or claim
that it is a calendar permission. Portal Gmail enrollment remains limited to the
existing test owner. Calendar requests do not request the Gmail scope.

If a dedicated Calendar production project is chosen to separate those review
requirements, register separate credentials and callbacks first and preserve the
existing Gmail configuration. Do not replace functioning credentials blindly.

## Real demonstration still required

Google requests a real end-to-end demonstration, not a mocked test recording:
1. Log into Affinity as a consenting test professional.
2. Show Conectar apps > Agenda > Google Agenda.
3. Show the complete Google authorization flow in English, with the exact scopes.
4. Select a professional test calendar without real customer events.
5. Show its calendar list and an actual imported test appointment in the portal.
6. Show disconnect and explain preserved appointment history and access controls.
7. Include Gmail's separate consent/features if submitting its restricted scope
   in the same verification request.

Do not fabricate approval, consent, a demonstration URL or successful imports.
Do not publish customer appointments, cookies, OAuth codes, tokens or passwords
in the demonstration or repository. The account holder completes any required
login, MFA and Google consent. Upload the reviewed demonstration to a permitted
video/file host and submit its accessible URL through Google's actual form.

References:
- https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://support.google.com/cloud/answer/13804565
- https://support.google.com/googleapi/answer/7454865
