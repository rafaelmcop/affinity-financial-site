# CRM scheduled follow-up consistency

2026-11-06 audit identified one raw `new` record with an existing next-contact
date and a proposal card, plus seven records with future owned meetings whose
raw status was `new`. No customer identifiers are stored in this document.

The one stale follow-up record was reconciled to the Follow-up board card and
compatible legacy status `proposal`. Its date and notes were preserved, and a
status activity was recorded. A private minimal rollback snapshot was saved
locally before the conditional update. A post-repair audit found both dated
follow-ups in the `follow_up` category and no meeting follow-up lacking its
client's scheduled date. Future first appointments remain scheduled meetings;
they are not inferred to be follow-ups without an explicit date or outcome.

Read-time projection is shared by board, dedicated client record, CRM list and
legacy agent client list. A valid next-follow-up date takes priority over early
new/scheduled/attended/proposal/no-show cards. InForce/Lapsada policy evidence,
submitted applications, explicit terminal stages and custom columns retain
priority. No customer maintenance writes are performed by read projection.

Legacy saves preserve an omitted next-follow-up date. An explicitly empty value
still removes it. Saves and board moves normalize an early stage with a retained
follow-up date instead of recreating a contradictory New card. Appointment
classification is owner- and exact-client-scoped; another agent's meeting cannot
change the client's stage.
