const crypto = require('crypto');
const { readStock, writeStock, getFile } = require('../utils/githubStore');

exports.handler = async function(event) {
  try {
    const body = event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : {};
    if (!body.name) return { statusCode: 400, body: 'Missing name' };

    // simple validation
    const qty = Number(body.qty || 0);
    if (!Number.isFinite(qty)) return { statusCode: 400, body: 'Invalid qty' };

    // read current file and sha
    const file = await getFile();
    let sha = file ? file.sha : null;
    const items = await readStock();

    const item = { id: crypto.randomUUID(), name: String(body.name), qty, meta: body.meta || {}, created_at: new Date().toISOString() };
    items.push(item);

    try {
      await writeStock(items, sha);
      return { statusCode: 201, body: JSON.stringify(item) };
    } catch (err) {
      if (err.code === 'CONFLICT') {
        // re-read, merge and retry once
        const latestFile = await getFile();
        const latestItems = await readStock();
        latestItems.push(item);
        await writeStock(latestItems, latestFile ? latestFile.sha : null);
        return { statusCode: 201, body: JSON.stringify(item) };
      }
      throw err;
    }
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
