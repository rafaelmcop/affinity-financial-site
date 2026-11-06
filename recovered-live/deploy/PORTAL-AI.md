# Portal AI — initial assisted workflow

The compact icon beside notifications and the user avatar is enabled by the Admin's `ai` feature grant. New registrations
do not receive this feature automatically. Assigned assistants need `ai:view`
and the relevant module’s view access; each read rechecks the
owner's released functions. No cross-owner IDs or SQL from the model are used.

Cloudflare Workers AI: @cf/zai-org/glm-4.7-flash. Intent extraction and draft
completion are separate, limited calls, each with a 25 second timeout and a
2048-token ceiling. Daily quota: 100 requests per owner/actor, UTC day. Requests
that fail still count. Usage stores only identity/day/count, not the transcript.
AI output is rendered as text, and navigation targets come from server code.

Supported: upcoming 1–30 days, scheduled/overdue follow-ups, contact name
lookup, editable email and short WhatsApp drafts, plus the scoped portal
metadata modules listed below. Lists show up to 20 owned
records and disclose truncation. Terminal declined/no-interest/already-insured
cards are excluded from follow-up suggestions. No attachments, medical data,
identity documents, bank details, full message bodies or credentials enter prompts.

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

2026-11-06: All 458 tests passed. A real authenticated synthetic account
opened the top-bar assistant and queried the live AI binding. Its own test
appointment was returned with the correct details link. No client messages or
calendar writes were performed. The fixture was disabled after validation. The
Rafael pilot feature grant was recorded in the administrative permission audit.

2026-11-06 visual refinement: removed the full-width toolbar and its 72px
page spacing. The launcher is now a 42px circular sparkle icon (36px on mobile),
with a hover/focus label and pressed state. The existing conversation and access
checks are unchanged. Responsive browser interaction checks passed.

2026-11-06 scoped portal reads: added fixed read adapters for scheduled/sent
message history (including personal sent email when separately permitted), inbox
subjects, WhatsApp audit metadata, CRM board stages, application summaries,
policy/premium summaries, payment tasks, Five Rings status/credits, reviews,
profile, own assistants, library metadata, queue outcome history and marketing
obligations. Each domain independently checks released features and delegated
view permissions. Materials/assistant management metadata is agent-only.
No arbitrary procedure, SQL, account selector, message body, attachment,
password, auth code or encrypted field can be selected by model output.
No send, lease reservation, synchronization or configuration mutation is called.
Sources failing to respond are explicitly unavailable, never reported as empty.
Lists are capped at 20, source windows are bounded, and the UI links to the full
module. This is contextual assistance, not a complete forensic audit/export.
