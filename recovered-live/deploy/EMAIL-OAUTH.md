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
