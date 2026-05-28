const api = {
  list: '/api/listItems',
  add: '/api/addItem',
  update: '/api/updateItem',
  del: '/api/deleteItem'
};

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return { ok: res.ok, data: text ? JSON.parse(text) : null }; } catch { return { ok: res.ok, data: text }; }
}

async function load() {
  const r = await fetchJson(api.list);
  const listEl = document.getElementById('items');
  listEl.innerHTML = '';
  if (!r.ok) {
    listEl.innerHTML = '<li>Error loading items</li>';
    return;
  }
  const items = r.data || [];
  items.forEach(i => {
    const li = document.createElement('li');
    li.dataset.id = i.id;
    li.innerHTML = `
      <strong>${escapeHtml(i.name)}</strong>
      <span>Qty: <input class="qty" value="${i.qty}" size="4" /></span>
      <button class="update">Update</button>
      <button class="remove">Remove</button>
    `;
    listEl.appendChild(li);
  });
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }

document.getElementById('addBtn').addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  const qty = document.getElementById('qty').value;
  if (!name) return alert('Name required');
  const r = await fetchJson(api.add, { method: 'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ name, qty }) });
  if (!r.ok) return alert('Add failed: '+ JSON.stringify(r.data));
  document.getElementById('name').value = '';
  document.getElementById('qty').value = '';
  load();
});

document.getElementById('items').addEventListener('click', async (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const id = li.dataset.id;
  if (e.target.classList.contains('remove')) {
    if (!confirm('Remove item?')) return;
    const r = await fetchJson(api.del, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
    if (!r.ok) return alert('Remove failed: '+ JSON.stringify(r.data));
    load();
  } else if (e.target.classList.contains('update')) {
    const qtyInput = li.querySelector('.qty');
    const qty = qtyInput.value;
    const r = await fetchJson(api.update, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id, qty }) });
    if (!r.ok) return alert('Update failed: '+ JSON.stringify(r.data));
    load();
  }
});

window.addEventListener('load', load);
