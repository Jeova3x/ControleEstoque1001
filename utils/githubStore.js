const fetch = require('node-fetch');

const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const FILE_PATH = 'stock.json';

async function getFile(){
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
  });
  if(res.status === 404) return null;
  if(!res.ok) throw new Error('GitHub getFile failed: '+res.status);
  return res.json();
}

async function readStock(){
  const file = await getFile();
  if(!file) return [];
  const content = Buffer.from(file.content, 'base64').toString();
  return JSON.parse(content || '[]');
}

async function writeStock(items, sha){
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
  const content = Buffer.from(JSON.stringify(items, null, 2)).toString('base64');
  const body = { message: 'update stock', content };
  if(sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error('GitHub writeStock failed: '+res.status);
  return res.json();
}

module.exports = { readStock, writeStock, getFile };
