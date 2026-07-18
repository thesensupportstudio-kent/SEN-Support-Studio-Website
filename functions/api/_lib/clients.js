// Applies newly-submitted fields to an existing client record. A non-empty
// value always wins over what's stored (the latest form a family fills in
// is the most likely to be accurate) - an empty/missing value on the new
// submission never erases something already on file.
async function fillMissingFields(env, existing, { parentName, parentPhone, childName, school }) {
  const updates = [];
  const values = [];
  if (parentName && parentName !== existing.parent_name) { updates.push('parent_name = ?'); values.push(parentName); }
  if (parentPhone && parentPhone !== existing.parent_phone) { updates.push('parent_phone = ?'); values.push(parentPhone); }
  if (childName && childName !== existing.child_name) { updates.push('child_name = ?'); values.push(childName); }
  if (school && school !== existing.school) { updates.push('school = ?'); values.push(school); }
  if (!updates.length) return;
  updates.push("updated_at = datetime('now')");
  values.push(existing.id);
  await env.DB.prepare('UPDATE clients SET ' + updates.join(', ') + ' WHERE id = ?').bind(...values).run();
}

async function findOrCreateClient(env, { parentName, parentEmail, parentPhone, childName, school }) {
  const email = (parentEmail || '').trim().toLowerCase();
  if (!email) return null;

  const existing = await env.DB.prepare('SELECT * FROM clients WHERE parent_email = ?').bind(email).first();

  if (existing) {
    await fillMissingFields(env, existing, { parentName, parentPhone, childName, school });
    return { id: existing.id, created: false };
  }

  const result = await env.DB.prepare(
    'INSERT INTO clients (parent_name, parent_email, parent_phone, child_name, school) VALUES (?, ?, ?, ?, ?)'
  ).bind(parentName || null, email, parentPhone || null, childName || null, school || null).run();

  return { id: result.meta.last_row_id, created: true };
}

async function recordInteraction(env, clientId, type, summary, detail, fileKey, dueDate) {
  await env.DB.prepare(
    'INSERT INTO interactions (client_id, type, summary, detail, file_key, due_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(clientId, type, summary, detail ? JSON.stringify(detail) : null, fileKey || null, dueDate || null).run();
}

async function setClientStatus(env, clientId, status) {
  await env.DB.prepare("UPDATE clients SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(status, clientId).run();
}

// Best-effort logging: never throws, so a database issue (or D1 not yet
// configured) can never break the email-sending flow that already works.
// If clientId is supplied (dashboard-initiated sends), it's used directly
// instead of matching by email - falls back to email matching if that
// client no longer exists.
export async function logInteraction(env, { clientId, parentName, parentEmail, parentPhone, childName, school, type, summary, detail, status, fileKey, dueDate }) {
  if (!env.DB) return;
  try {
    let id = clientId ? Number(clientId) : null;

    if (id) {
      const existing = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
      if (existing) {
        await fillMissingFields(env, existing, { parentName, parentPhone, childName, school });
      } else {
        id = null;
      }
    }

    if (!id) {
      const found = await findOrCreateClient(env, { parentName, parentEmail, parentPhone, childName, school });
      id = found ? found.id : null;
    }

    if (!id) return;
    await recordInteraction(env, id, type, summary, detail, fileKey, dueDate);
    if (status) await setClientStatus(env, id, status);
  } catch (err) {
    console.log('logInteraction failed: ' + String(err && err.message));
  }
}

// Adds (or updates) a client from the internal dashboard directly, e.g. for
// someone who got in touch on another platform. Unlike logInteraction this
// throws on a real problem, since a staff-initiated action should surface
// the error rather than fail silently.
export async function createClient(env, { parentName, parentEmail, parentPhone, childName, school }) {
  if (!env.DB) throw new Error('Database is not configured yet.');

  const result = await findOrCreateClient(env, { parentName, parentEmail, parentPhone, childName, school });
  if (!result) throw new Error('Please enter an email address.');

  await recordInteraction(env, result.id, 'manual_add', result.created ? 'Added manually' : 'Details updated manually');

  return result;
}

// Resolves an assign-link token to the client it was sent for, so a public
// form submission can attach directly to the right client without relying
// on the parent's email matching exactly. Never throws.
export async function resolveAssignmentClient(env, token) {
  if (!env.DB || !token) return null;
  try {
    const row = await env.DB.prepare('SELECT client_id FROM assignments WHERE token = ?').bind(token).first();
    return row ? row.client_id : null;
  } catch (err) {
    console.log('resolveAssignmentClient failed: ' + String(err && err.message));
    return null;
  }
}

export async function completeAssignment(env, token) {
  if (!env.DB || !token) return;
  try {
    await env.DB.prepare("UPDATE assignments SET status = 'completed', completed_at = datetime('now') WHERE token = ?").bind(token).run();
  } catch (err) {
    console.log('completeAssignment failed: ' + String(err && err.message));
  }
}
