// Session packs let a client book and manage their own sessions through
// their account - either a fixed pack paid for upfront (e.g. a 4-session
// monthly tuition pack) or an ongoing pay-per-session arrangement - instead
// of it going through Emma's personal email/texts every time.

export async function createPack(env, { clientId, serviceLabel, totalSessions, sessionMinutes, packType, serviceKey }) {
  const minutes = parseInt(sessionMinutes, 10) || 60;
  const isOngoing = packType === 'ongoing';
  if (!clientId) throw new Error('Missing client id.');
  if (!serviceLabel || !serviceLabel.trim()) throw new Error('Please enter a service name for this pack.');

  let total = -1;
  if (!isOngoing) {
    total = parseInt(totalSessions, 10);
    if (!total || total < 1) throw new Error('Please enter how many sessions are in this pack.');
  }

  const result = await env.DB.prepare(
    'INSERT INTO session_packs (client_id, service_label, session_minutes, total_sessions, remaining_sessions, pack_type, service_key) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(clientId, serviceLabel.trim(), minutes, total, total, isOngoing ? 'ongoing' : 'fixed', isOngoing ? (serviceKey || null) : null).run();

  return result.meta.last_row_id;
}

export async function getPacksForClient(env, clientId) {
  const result = await env.DB.prepare(
    'SELECT * FROM session_packs WHERE client_id = ? ORDER BY created_at DESC'
  ).bind(clientId).all();
  return result.results;
}

export async function getPackById(env, packId) {
  return env.DB.prepare('SELECT * FROM session_packs WHERE id = ?').bind(packId).first();
}

export async function getBookingsForClient(env, clientId, { upcomingOnly } = {}) {
  const query = upcomingOnly
    ? "SELECT b.*, p.service_label FROM pack_bookings b JOIN session_packs p ON p.id = b.pack_id WHERE b.client_id = ? AND b.status = 'booked' AND b.start_at >= datetime('now') ORDER BY b.start_at ASC"
    : 'SELECT b.*, p.service_label FROM pack_bookings b JOIN session_packs p ON p.id = b.pack_id WHERE b.client_id = ? ORDER BY b.start_at DESC';
  const result = await env.DB.prepare(query).bind(clientId).all();
  return result.results;
}

export async function createBooking(env, { packId, clientId, calendarEventId, startAt, endAt }) {
  await env.DB.prepare(
    'INSERT INTO pack_bookings (pack_id, client_id, calendar_event_id, start_at, end_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(packId, clientId, calendarEventId, startAt, endAt).run();

  await env.DB.prepare(
    'UPDATE session_packs SET remaining_sessions = remaining_sessions - 1 WHERE id = ? AND remaining_sessions > 0'
  ).bind(packId).run();
}

export async function getBookingById(env, bookingId) {
  return env.DB.prepare('SELECT * FROM pack_bookings WHERE id = ?').bind(bookingId).first();
}

export async function cancelBooking(env, { bookingId, refundCredit }) {
  const booking = await getBookingById(env, bookingId);
  if (!booking) throw new Error('Booking not found.');

  await env.DB.prepare(
    "UPDATE pack_bookings SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?"
  ).bind(bookingId).run();

  if (refundCredit) {
    await env.DB.prepare(
      'UPDATE session_packs SET remaining_sessions = remaining_sessions + 1 WHERE id = ?'
    ).bind(booking.pack_id).run();
  }

  return booking;
}
