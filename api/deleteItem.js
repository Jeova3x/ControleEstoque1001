const { readStock, writeStock, getFile } = require('../utils/githubStore');

exports.handler = async function(event) {
  try {
    const body = event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : {};
    const id = body.id || (event.queryStringParameters && event.queryStringParameters.id);
    if (!id) return { statusCode: 400, body: 'Missing id' };

    const file = await getFile();
    let sha = file ? file.sha : null;
    const items = await readStock();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return { statusCode: 404, body: 'Not found' };

    const removed = items.splice(idx, 1)[0];

    try {
      await writeStock(items, sha);
      return { statusCode: 200, body: JSON.stringify(removed) };
    } catch (err) {
      if (err.code === 'CONFLICT') {
        const latestFile = await getFile();
        const latestItems = await readStock();
        const latestIdx = latestItems.findIndex(i => i.id === id);
        if (latestIdx === -1) return { statusCode: 409, body: JSON.stringify({ error: 'Conflict: item already removed' }) };
        const removed2 = latestItems.splice(latestIdx, 1)[0];
        await writeStock(latestItems, latestFile ? latestFile.sha : null);
        return { statusCode: 200, body: JSON.stringify(removed2) };
      }
      throw err;
    }
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
