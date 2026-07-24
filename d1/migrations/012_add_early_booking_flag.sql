-- Lets a specific client (e.g. a friend/family test booking) bypass the
-- EARLIEST_BOOKABLE_DATE floor in the booking portal, without changing it
-- for anyone else. Off by default for every existing and new client.
ALTER TABLE clients ADD COLUMN early_booking_ok INTEGER NOT NULL DEFAULT 0;
