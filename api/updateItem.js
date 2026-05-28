const { readStock, writeStock, getFile } = require('../utils/githubStore');

exports.handler = async function(event) {
  try {
    const body = event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : {};
    const id = body.id || (event.queryStringParameters && event.queryStringParameters.id);
    if (!id) return { statusCode: 400, body: 'Missing id' };

    const qty = body.qty;
    if (qty === undefined) return { statusCode: 400, body: 'Missing qty' };
    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum)) return { statusCode: 400, body: 'Invalid qty' };

    const file = await getFile();
    let sha = file ? file.sha : null;
    const items = await readStock();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return { statusCode: 404, body: 'Not found' };

    items[idx].qty = qtyNum;
    items[idx].updated_at = new Date().toISOString();

    try {
      await writeStock(items, sha);
      return { statusCode: 200, body: JSON.stringify(items[idx]) };
    } catch (err) {
      if (err.code === 'CONFLICT') {
        const latestFile = await getFile();
        const latestItems = await readStock();
        const latestIdx = latestItems.findIndex(i => i.id === id);
        if (latestIdx === -1) return { statusCode: 409, body: JSON.stringify({ error: 'Conflict: item removed' }) };
        latestItems[latestIdx].qty = qtyNum;
        latestItems[latestIdx].updated_at = new Date().toISOString();
        await writeStock(latestItems, latestFile ? latestFile.sha : null);
        return { statusCode: 200, body: JSON.stringify(latestItems[latestIdx]) };
      }
      throw err;
    }
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
