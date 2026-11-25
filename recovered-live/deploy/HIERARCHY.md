# Organizational hierarchy and marketing participation

Admin → Hierarquia now provides a connected family-tree style map, a searchable
list and dialog-based changes. Tree branches collapse independently; wide trees
scroll within the map. WhatsApp grants and pending-upline requests are secondary
collapsed sections. The editor excludes the person and descendants from parent
choices, while an atomic recursive SQL guard independently rejects cycles.

Upline directory profiles are references, not logins. Admins can save name,
optional email/phone/NLG number and edit them without changing their stable
negative selection ID. Registration stores their opaque directory key as the
parent; no synthetic email, password or approved account is created. Registered
inactive/blocked non-deleted agents can also be selected. Deleted users and
assistants are excluded. Unknown-upline requests can be completed and registered
without automatically approving the applicant. Approval emails resolve directory
names as well as registered accounts.

The visible tree and Affinity's business/retention anchor are separate. Rafael
remains the Affinity anchor even when he has an organizational upline. Reparenting
does not grant access to another user's records or change assistant assignments.
The requested Phil → Hernane → Rafael and Phil → Beatriz-agent relationships were
applied with a single conditional SQL statement. A private rollback snapshot and
hierarchy audit entries were retained. No client records were moved or deleted.

Marketing participation is separate from menu access. Agents are required by
default; Rafael is permanently exempt. Admin can waive another agent's unpaid
obligations. Paid/reported-paid records are preserved. Reactivating participation
applies only to new closures; previously waived charges stay waived. Both manual
lead closures and policy synchronization guard obligation creation. Beneficiary
selection/payment reporting enforce the same eligibility rule server-side.

Tables: agentUplineDirectory, agentHierarchyAudit, agentMarketingSettings,
agentMarketingSettingsAudit. None store passwords or provider credentials.
