# WhatsApp automatic sending paused — 2026-11-08

The responsible Admin requested a stop after another WhatsApp block. `WHATSAPP_AUTOMATIONS_PAUSED=true` is configured in the production Worker and local service. Local birthday, meeting-reminder and broad automation send switches are false. Manual permission remains separate.

The Worker skips birthday jobs, forces only WhatsApp meeting channels off, rejects automatic bridge requests and prevents template saves from re-enabling automatic WhatsApp. Editors expose the pause. Production WhatsApp campaign switches were turned off; email switches, email templates and meeting-email choices were preserved. Deferred/blocked WhatsApp jobs were retired; previously unconfirmed sends are never labeled as definitely unsent or retried. No pending local sends were present at the pause.

Do not enable, catch up, resend or change these settings without a new explicit instruction. Manual portal messaging and email automations remain separate; the WhatsApp provider must first permit the account to operate. This change does not claim a cause for the provider block.
