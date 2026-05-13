const params = new URLSearchParams(location.search);
document.getElementById('title').textContent = params.get('title') || 'OpenClaw 确认';
document.getElementById('message').textContent = params.get('message') || 'Allow this action?';

document.getElementById('confirm').addEventListener('click', () => respond(true));
document.getElementById('reject').addEventListener('click', () => respond(false));

async function respond(confirmed) {
  await chrome.runtime.sendMessage({ type: 'confirmResult', confirmed });
  window.close();
}
