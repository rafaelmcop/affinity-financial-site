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
