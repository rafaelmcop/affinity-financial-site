# Google Agenda connection

Agents use Conectar apps → Agenda → Google Agenda → Conectar Google Agenda.
The Google authorization flow returns to the portal, where the owner selects one
professional calendar. No secret iCal URL or app password is requested.

The existing Google platform client is reused with the registered HTTPS
`/api/email-oauth/callback` on www.affinityfc.org or portal.affinityfc.org.
Calendar jobs request only openid/email/profile and these Google API scopes:
- https://www.googleapis.com/auth/calendar.events.readonly
- https://www.googleapis.com/auth/calendar.calendarlist.readonly

Calendar authorization is stored separately from email in agentGoogleCalendar;
access and refresh tokens are encrypted with the existing server encryption.
Connecting or disconnecting Calendar does not replace email credentials or
Calendly tokens. Calendar imports use the existing daily first-access sync and
manual refresh. Cancellation preserves the CRM and appointment records. The
Google API read completes every page before changing stored appointment status.

Admin → Google and Microsoft integrations → Google Agenda controls new Calendar
connections separately from Gmail, reusing Google credentials. Keep the calendar
rollout disabled/testing until the vendor app is ready. Changing that rollout
does not modify the Gmail rollout. Vendor consent, verification requirements and
unverified-user limits still apply independently of portal availability.

2026-11-06: Google Calendar API enabled in project
affinity-portal-513823. The two read-only scopes were added and the Google Cloud
console confirmed that data-access changes were saved. The Google app is now
in production with a visible unverified-user limit of 100; verification has not
been approved for data access. Brand identity was separately verified and
published on 2026-11-06; this does not approve calendar data scopes. Gmail portal enrollment remains restricted to its preexisting
test owner. Real mailbox-owner
consent and an end-to-end Google event capture still need validation; fixture
and browser tests do not establish that a real Google calendar is connected.
