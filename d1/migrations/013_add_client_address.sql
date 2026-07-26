-- Session location for mobile/home-visit bookings. Populated by staff on a
-- client's profile, then used as the calendar event location when a session
-- is auto-booked through the client portal.
ALTER TABLE clients ADD COLUMN address TEXT;
