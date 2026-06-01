const fetch = require('node-fetch');

const repoFull = process.env.GITHUB_REPO || ''; // ex: "meu-usuario/meu-repo"
const [GITHUB_OWNER = '', GITHUB_REPO = ''] = repoFull.split('/');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const FILE_PATH = process.env.FILE_PATH || 'stock.json';

function ensureEnv() {
  if (!repoFull || repoFull.indexOf('/') === -1) {
    throw new Error('Missing or invalid GITHUB_REPO (expected "owner/repo")');
  }
  if (!GITHUB_TOKEN) {
    throw new Error('Missing GITHUB_TOKEN');
  }
}

async function handleRes(res) {
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const msg = (json && (json.message || JSON.stringify(json))) || text || `status ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json;
}

async function getFile(){
  ensureEnv();
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (res.status === 404) return null;
  return handleRes(res);
}

async function readStock(){
  const file = await getFile();
  if(!file) return [];
  const content = Buffer.from(file.content || '', 'base64').toString('utf8');
  try {
    return JSON.parse(content || '[]');
  } catch(e) {
    throw new Error('Failed to parse stock.json: '+ e.message);
  }
}

async function writeStock(items, sha, opts = {}) {
  ensureEnv();
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
  const content = Buffer.from(JSON.stringify(items, null, 2)).toString('base64');
  const body = { message: opts.message || 'update stock', content };
  if (sha) body.sha = sha;

  const maxAttempts = opts.retries ?? 3;
  let attempt = 0;
  while (true) {
    attempt++;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
      body: JSON.stringify(body),
    });
    try {
      return await handleRes(res);
    } catch (err) {
      if (err.status === 409) { // conflict
        err.code = 'CONFLICT';
        throw err;
      }
      if (attempt >= maxAttempts) throw err;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 5000) + Math.floor(Math.random() * 200);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

module.exports = { readStock, writeStock, getFile };
