// PDFs of the actual flashcards a practitioner used in a session, uploaded
// so the family can open/print the same sheet from their portal's practice
// page - see practiceItems.js for the separate word/letter game data.

export async function getPracticeDocumentsForClient(env, clientId) {
  const result = await env.DB.prepare(
    'SELECT * FROM practice_documents WHERE client_id = ? ORDER BY created_at DESC'
  ).bind(clientId).all();
  return result.results;
}

export async function getPracticeDocumentById(env, id) {
  return env.DB.prepare('SELECT * FROM practice_documents WHERE id = ?').bind(id).first();
}

export async function createPracticeDocument(env, { clientId, fileName, fileKey }) {
  if (!clientId) throw new Error('Missing client id.');
  if (!fileKey) throw new Error('Missing file.');
  const trimmedName = (fileName || 'Flashcards.pdf').trim();

  const result = await env.DB.prepare(
    'INSERT INTO practice_documents (client_id, file_name, file_key) VALUES (?, ?, ?)'
  ).bind(clientId, trimmedName, fileKey).run();

  return result.meta.last_row_id;
}

export async function deletePracticeDocument(env, id) {
  const doc = await getPracticeDocumentById(env, id);
  if (!doc) throw new Error('Document not found.');
  await env.DB.prepare('DELETE FROM practice_documents WHERE id = ?').bind(id).run();
  return doc;
}
