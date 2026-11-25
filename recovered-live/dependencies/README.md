# Production mail runtime

Before testing or deploying the recovered production worker:

```sh
npm ci --ignore-scripts --prefix recovered-live/dependencies
node --test recovered-live/*.test.mjs
```

The worker imports the pinned Nodemailer ESM entry directly. Wrangler bundles it; the server does not need an npm installation. Do not replace this worker with the historical TypeScript build. The previous embedded Nodemailer 9.0.3 implementation was removed on 2026-10-23. SMTP transports disable local file and URL attachment resolution; attachments are supplied as validated in-memory bytes.

`package-lock.json` records the registry source and package integrity. Never commit `node_modules` or credentials.

SMTP connections use `worker/smtp-runtime.js`: it opens the configured hostname through the runtime's native socket connector rather than letting Nodemailer's DNS address pool select a CNAME as an endpoint. TLS certificate validation is preserved, STARTTLS remains mandatory on 587, and implicit TLS is used on 465. A Cloudflare remote-preview handshake against iCloud was validated without authentication or message submission on 2026-10-23.
