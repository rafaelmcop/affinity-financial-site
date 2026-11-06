# Portal AI — initial assisted workflow

The top toolbar is enabled by the Admin's `ai` feature grant. New registrations
do not receive this feature automatically. Assigned assistants need `ai:view`
and the relevant calendar, policies or email access; each read rechecks the
owner's released functions. No cross-owner IDs or SQL from the model are used.

Cloudflare Workers AI: @cf/zai-org/glm-4.7-flash. Intent extraction and draft
completion are separate, limited calls, each with a 25 second timeout and a
2048-token ceiling. Daily quota: 100 requests per owner/actor, UTC day. Requests
that fail still count. Usage stores only identity/day/count, not the transcript.
AI output is rendered as text, and navigation targets come from server code.

Supported now: upcoming 1–30 days, scheduled/overdue follow-ups, contact name
lookup, editable email and short WhatsApp drafts. Lists show up to 20 owned
records and disclose truncation. Terminal declined/no-interest/already-insured
cards are excluded from follow-up suggestions. No attachments, medical data,
identity documents, bank details, mailbox content or credentials enter prompts.

Execution is deliberately separate: reviewing an email opens the existing email
composer with the editable draft and a unique matching contact, or an empty
recipient for ambiguous/group requests. A group request is a draft only; recipient
selection and actual sending remain in the existing portal flow. No bulk
WhatsApp jobs are enabled. Schedule opens the existing agenda flow: the AI does
not create an event, reserve a slot or write to Google Calendar (read-only scope).

Tests cover real SQLite ownership and quota, assistant permissions, untrusted
model output and responsive browser UI with no live customer mutations.

Model API reference:
https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/
