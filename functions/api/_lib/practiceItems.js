// Words/letter-sounds a practitioner adds after a session, for a family to
// practise at home through the client portal's flashcard/quiz game, or to
// print out. Each item is either a whole word (main_text = the word itself)
// or a letter-sound (main_text = the letter, example_text = an example word,
// e.g. "A" / "Apple"). image_key (an uploaded photo) takes priority over
// emoji when both are set - see practiceGame rendering.

export async function getPracticeItemsForClient(env, clientId) {
  const result = await env.DB.prepare(
    'SELECT * FROM practice_items WHERE client_id = ? ORDER BY created_at DESC'
  ).bind(clientId).all();
  return result.results;
}

export async function getPracticeItemById(env, id) {
  return env.DB.prepare('SELECT * FROM practice_items WHERE id = ?').bind(id).first();
}

export async function createPracticeItem(env, { clientId, kind, mainText, exampleText, emoji, imageKey }) {
  if (!clientId) throw new Error('Missing client id.');
  const trimmedMain = (mainText || '').trim();
  if (!trimmedMain) throw new Error('Please enter a word or letter.');

  const isLetter = kind === 'letter';
  if (isLetter && !(exampleText || '').trim()) {
    throw new Error('Please enter an example word for this letter.');
  }

  const result = await env.DB.prepare(
    'INSERT INTO practice_items (client_id, kind, main_text, example_text, emoji, image_key) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    clientId,
    isLetter ? 'letter' : 'word',
    trimmedMain,
    isLetter ? exampleText.trim() : null,
    (emoji || '').trim() || null,
    imageKey || null
  ).run();

  return result.meta.last_row_id;
}

export async function deletePracticeItem(env, id) {
  const item = await getPracticeItemById(env, id);
  if (!item) throw new Error('Item not found.');
  await env.DB.prepare('DELETE FROM practice_items WHERE id = ?').bind(id).run();
  return item;
}
