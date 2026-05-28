const { readStock } = require('../utils/githubStore');

exports.handler = async function(event) {
  try {
    const items = await readStock();
    return { statusCode: 200, body: JSON.stringify(items) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
