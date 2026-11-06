# Individual email OAuth

Google Cloud administrative owner: us.rafael@icloud.com.
Dedicated project: affinity-portal-513823 (Affinity Portal).
Do not use the inaccessible project named affinity-portal from earlier setup attempts.

Authorized Web-client callbacks:
- https://portal.affinityfc.org/api/email-oauth/callback
- https://www.affinityfc.org/api/email-oauth/callback

Store client credentials only through /admin/integracoes-email as the master Admin.
The client secret is encrypted server-side and never returned to the browser.
Keep enrollment Disabled until provider setup is complete. Testing may be enabled
for selected portal login emails; the corresponding Gmail accounts must separately
be allowed in Google's test-user list. Production requires completing the provider's
app approval requirements. Existing mailbox connections are not disconnected by
this enrollment setting. Availability can be changed without entering the secret again.

Each agent signs into and authorizes their own provider mailbox. The Google Cloud
administrative account is not automatically connected to any portal mailbox.
No test messages are sent by configuring the platform application.

Provisioning verified on 2026-11-05 (New York): Gmail API enabled; declared
scopes are OpenID, userinfo.email, userinfo.profile and https://mail.google.com/.
The Web client and its exact callbacks were checked in the Google Console.
The client secret was saved through the authenticated Admin form and verified
as encrypted in D1. Enrollment remains Disabled. The earlier unused secrets
were retired; only the newly stored secret remains active. No real mailbox
was authorized, read, or used for a test send.

The initial Gmail tester has not been selected. Before enabling Testing, obtain
the user's chosen Gmail address and the corresponding portal login email, add
the Gmail address to Google's test-user list and the portal login to the Admin
Testing allowlist. The mailbox owner must then complete their individual OAuth
authorization. Do not describe this setup as production-verified or mail-tested.

## Microsoft registration and selected-user rollout

Verified on 2026-11-05 (New York):
- Owned tenant: `444c38a8-f7b5-4630-aa3c-3b575515db06`.
- Existing Affinity Portal client ID: `005837a5-c3c5-491f-8ebb-9c9436cb8d88`.
- Organizational and personal Microsoft accounts supported; both exact Web
  callbacks above confirmed.
- Application secret saved through the authenticated Master Admin form;
  independent D1 metadata query confirmed credential present and rollout Testing,
  allowlisted portal login `rafaelmcop@hotmail.com` only. No secrets in this repo.
- Browser cleanup reported one remaining application secret, removing unused
  credentials from earlier attempts. Do not regenerate without need.
- No mailbox has yet completed OAuth or SMTP/IMAP validation. No test email sent.
- The authorization-code flow requests delegated permissions dynamically using
  the Outlook scope URLs below. Do not confuse the documentation's app-only
  Exchange service-principal setup with this per-user delegated flow; do not
  grant application permissions or tenant-wide consent as a workaround.
- Personal Microsoft tenant uses smtp-mail.outlook.com; organizational Microsoft
  365 uses smtp.office365.com. Selection uses the validated ID-token tenant only.
- New Gmail enrollment remains disabled. User selected rafaelmcop@gmail.com for
  the next Gmail test; it still needs Google's Testing test-user registration.
- User authorized a test email to rafaelmcop@icloud.com after mailbox connection.
  This authorization is not evidence of delivery and does not authorize client mail.

Reuse this app. Outstanding: validate the selected user's actual Microsoft OAuth
connection, SMTP/IMAP authentication and the authorized test email. The browser
wallet became insufficient before Gmail setup/real mailbox validation; do not
claim production readiness from credential storage alone.

Registration checklist for the authenticated platform owner:
- Register Affinity Portal as a Web application in Microsoft Entra.
- Support organizational accounts in any directory and personal Microsoft accounts.
- Register exactly the two HTTPS callbacks listed above.
- Use delegated scopes openid, email, profile, offline_access,
  https://graph.microsoft.com/Mail.ReadWrite and
  https://graph.microsoft.com/Mail.Send, matching worker/email-oauth.js.
  Microsoft uses Graph for mailbox access, folders, attachments and sending.
  Existing legacy IMAP tokens remain unchanged until the user reconnects; new
  connections are stored as microsoft_graph. Google/iCloud keep SMTP/IMAP.
- Store client ID and encrypted secret through the master Admin page.
- Start with Testing and an explicitly chosen portal login allowlist.
- The individual mailbox owner must authorize the connection; app registration
  does not itself connect or authorize the administrative mailbox.
- Validate tokens and SMTP/IMAP authentication without sending real email.

Reference: https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth
