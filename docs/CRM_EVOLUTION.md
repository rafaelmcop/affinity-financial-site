# Affinity CRM evolution

Reference brief: the owner's November 4, 2026 all-in-one CRM request. Extend the existing Affinity board; keep current production integrations and the Affinity identity.

## Delivery sequence

1. **Contacts and opportunities**: existing owner-scoped board, configurable stages, drag ordering, automatic evidence-based classification, referrals and meeting progress. Add table/board views, owner-scoped tags, saved dynamic lists, filters and access to the existing client dossier. No duplicate contact database.
2. **Conversations**: bring existing email and WhatsApp adapters into one inbox with channel indicators, delivery receipts and explicit sending controls. Preserve separate personal/automation history, attachment access and exact person identity when contact methods are shared.
3. **Workflows**: build on existing automation receipts and recurring email settings. Add a versioned visual workflow model, dry-run preview, authorized activation, cancellation and idempotent actions. A workflow must not override disabled WhatsApp marketing or recover ambiguous sends automatically.
4. **Calendars and capture**: extend current Calendly integration, appointment reminders and event-to-CRM stages; add owned forms and landing-page attribution. Keep vendor session requirements explicit.
5. **Reporting**: opportunity counts, stage movement, follow-up overdue, conversion and source attribution, with owner/assistant/admin scopes.
6. **Additional modules**: AI drafting/qualification, reputation, social publishing, memberships, commercial payments and signatures. Scope each integration, required account and provider cost before implementation; do not expose nonfunctional menu items.

## Existing systems to reuse

- Contacts: `crmClients`, owned by `assignedAdminEmail`; existing client dossier and communication audit.
- Opportunities: `crmBoardCards` and `crmBoardColumns`; agent choices take priority over automatic classification.
- Meeting progress: `meetingCrmProgress`, linked only through an owned meeting and CRM client.
- Prospecting: central sources and assignments are separate from customer records; any unification must preserve every source and Admin-controlled sharing/exclusions.
- Communications: email transport and assistant corporate identities; WhatsApp bridge, receipts and assistant-owned sessions.
- Automation: email templates, weekly copy, subscriptions, delivery ledgers and transactional meeting reminders.
- Access: `portalFeatureAccess`, assistant per-owner view/edit/delete grants, and backend procedure boundaries.

## Data and access requirements

- Every tag, saved list and pipeline preference is scoped to its agent owner. Never trust an owner supplied by the browser.
- A shared phone/email does not identify one person. Preserve insured, policy owner, full name and birthday distinctions.
- Smart lists store validated filter definitions, not exported customer snapshots or user-provided SQL. Membership updates with current records.
- Assistant mutations require the relevant agent grant. An Admin's existing oversight does not make ordinary agent data public to peers.
- New workflow or sending capabilities must preserve current transport switches, opt-outs, confirmations, idempotency and auditing.
- Only show features that are implemented and accessible; keep the shared portal menu consistent.

## First extension acceptance

- Switch between the existing board and a searchable contact table.
- Filter by opportunity stage, source, tag, contactability and follow-up state.
- Add or remove a contact's tags without editing another agent's contacts.
- Save the selected filters as a named smart list; the list recalculates after changes.
- Open the same existing dossier and communication actions from either view.
- Persist preferences without replacing agent-chosen stages or column order.
- Exercise ownership, assistant read-only restrictions, filter validation and browser interactions without sending real messages.

## First extension implementation

Implemented in the existing board route: board/table switch, per-contact tags, validated combined filters, named dynamic lists and per-view contact counts. Existing dossier links, manual stages, custom columns and assistant grants are retained. Additional modules above remain subsequent deliveries, not implemented features.
