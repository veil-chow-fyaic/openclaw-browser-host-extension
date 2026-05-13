const fields = ['gatewayUrl', 'token', 'nodeName', 'autoConnect'];
const message = document.getElementById('message');

load();
document.getElementById('save').addEventListener('click', save);

async function load() {
  const data = await chrome.storage.local.get(fields);
  for (const field of fields) {
    const el = document.getElementById(field);
    if (el.type === 'checkbox') {
      el.checked = Boolean(data[field]);
    } else {
      el.value = data[field] || '';
    }
  }
}

async function save() {
  const next = {};
  for (const field of fields) {
    const el = document.getElementById(field);
    next[field] = el.type === 'checkbox' ? el.checked : el.value.trim();
  }
  await chrome.storage.local.set(next);
  message.textContent = '已保存';
  setTimeout(() => {
    message.textContent = '';
  }, 1800);
}
