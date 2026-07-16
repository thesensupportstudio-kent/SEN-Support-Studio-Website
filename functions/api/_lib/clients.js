async function findOrCreateClient(env, { parentName, parentEmail, parentPhone, childName, school }) {
  const email = (parentEmail || '').trim().toLowerCase();
  if (!email) return null;

  const existing = await env.DB.prepare('SELECT * FROM clients WHERE parent_email = ?').bind(email).first();

  if (existing) {
    const updates = [];
    const values = [];
    if (parentName && !existing.parent_name) { updates.push('parent_name = ?'); values.push(parentName); }
    if (parentPhone && !existing.parent_phone) { updates.push('parent_phone = ?'); values.push(parentPhone); }
    if (childName && !existing.child_name) { updates.push('child_name = ?'); values.push(childName); }
    if (school && !existing.school) { updates.push('school = ?'); values.push(school); }
    if (updates.length) {
      updates.push("updated_at = datetime('now')");
      values.push(existing.id);
      await env.DB.prepare('UPDATE clients SET ' + updates.join(', ') + ' WHERE id = ?').bind(...values).run();
    }
    return existing.id;
  }

  const result = await env.DB.prepare(
    'INSERT INTO clients (parent_name, parent_email, parent_phone, child_name, school) VALUES (?, ?, ?, ?, ?)'
  ).bind(parentName || null, email, parentPhone || null, childName || null, school || null).run();

  return result.meta.last_row_id;
}

async function recordInteraction(env, clientId, type, summary, detail) {
  await env.DB.prepare(
    'INSERT INTO interactions (client_id, type, summary, detail) VALUES (?, ?, ?, ?)'
  ).bind(clientId, type, summary, detail ? JSON.stringify(detail) : null).run();
}

async function setClientStatus(env, clientId, status) {
  await env.DB.prepare("UPDATE clients SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(status, clientId).run();
}

// Best-effort logging: never throws, so a database issue (or D1 not yet
// configured) can never break the email-sending flow that already works.
export async function logInteraction(env, { parentName, parentEmail, parentPhone, childName, school, type, summary, detail, status }) {
  if (!env.DB) return;
  try {
    const clientId = await findOrCreateClient(env, { parentName, parentEmail, parentPhone, childName, school });
    if (!clientId) return;
    await recordInteraction(env, clientId, type, summary, detail);
    if (status) await setClientStatus(env, clientId, status);
  } catch (err) {
    console.log('logInteraction failed: ' + String(err && err.message));
  }
}
