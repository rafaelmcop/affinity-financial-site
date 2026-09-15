# Publication workflow

The user requires every production release to be saved to GitHub. Commit the exact release files and confirm a successful push before declaring publication complete. If GitHub is unavailable, report the pending push explicitly. Do not claim local commits are on GitHub.

The live Cloudflare application is in `recovered-live/`; the historical TypeScript build does not reproduce it. Preserve the live assets and worker when editing. Never commit credentials, customer data, `.wrangler` caches or WhatsApp session directories.

The WhatsApp integration in `services/whatsapp` is a test service requiring a persistent server. Its secrets must stay server-side. Do not claim pairing or delivery has been tested without a real user-authorized test number.
