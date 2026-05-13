const output = document.getElementById('output');
const status = document.getElementById('status');

bind('connect', { type: 'connect' });
bind('disconnect', { type: 'disconnect' });
bind('notify', {
  type: 'notify',
  payload: {
    title: 'OpenClaw Browser Host',
    body: '浏览器插件通知测试'
  }
});
bind('tab', { type: 'currentTab' });
bind('summary', { type: 'pageSummary' });
bind('downloads', {
  type: 'downloadsSummary',
  payload: { lookbackMinutes: 60, maxItems: 20 }
});

refreshStatus();

function bind(id, message) {
  document.getElementById(id).addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage(message);
    render(response);
    await refreshStatus();
  });
}

async function refreshStatus() {
  const response = await chrome.runtime.sendMessage({ type: 'status' });
  const connected = Boolean(response?.status?.connected);
  status.textContent = connected ? '已连接' : '未连接';
  status.dataset.connected = String(connected);
}

function render(value) {
  output.textContent = JSON.stringify(value, null, 2);
}
