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

## Microsoft registration pending

Microsoft requires a platform app registration before each agent can individually
authorize Outlook.com, Hotmail or Microsoft 365. On 2026-11-05 (New York), the owner completed Azure free-account setup and the
owned Default Directory became accessible. The Microsoft provider must remain
unavailable until the remaining configuration and individual validation succeed.

Verified registration progress:
- Directory tenant: `444c38a8-f7b5-4630-aa3c-3b575515db06`.
- Existing app: Affinity Portal, client ID `005837a5-c3c5-491f-8ebb-9c9436cb8d88`.
- Organizational and personal Microsoft account support confirmed.
- Both HTTPS OAuth callback URLs above confirmed on the Web platform.
- Only the initial delegated User.Read permission was verified as saved.
- Required OIDC/IMAP/SMTP delegated permissions, homepage and privacy branding
  remain pending. Browser automation repeatedly failed to persist permissions;
  do not infer completion from checkbox interactions.
- No client secret was created or transferred; Microsoft enrollment remains
  disabled. No mailbox was authorized or tested and no email was sent.

Reuse this registration; do not create another app. Resume at API permissions.
Do not enable paid resources or change the existing Google/iCloud configuration.

Registration checklist for the authenticated platform owner:
- Register Affinity Portal as a Web application in Microsoft Entra.
- Support organizational accounts in any directory and personal Microsoft accounts.
- Register exactly the two HTTPS callbacks listed above.
- Use delegated scopes openid, email, profile, offline_access,
  https://outlook.office.com/IMAP.AccessAsUser.All and
  https://outlook.office.com/SMTP.Send, matching worker/email-oauth.js.
- Store client ID and encrypted secret through the master Admin page.
- Start with Testing and an explicitly chosen portal login allowlist.
- The individual mailbox owner must authorize the connection; app registration
  does not itself connect or authorize the administrative mailbox.
- Validate tokens and SMTP/IMAP authentication without sending real email.

Reference: https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth
