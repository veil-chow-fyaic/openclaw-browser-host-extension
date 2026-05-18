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
bindPageSummary();
bind('downloads', {
  type: 'downloadsSummary',
  payload: { lookbackMinutes: 60, maxItems: 20 }
});
bind('confirm', {
  type: 'userConfirm',
  payload: {
    title: 'OpenClaw Browser Host',
    message: '允许这次来自 OpenClaw 的测试确认请求吗？'
  }
});

refreshStatus();

function bind(id, message) {
  document.getElementById(id).addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage(message);
    render(response);
    await refreshStatus();
  });
}

function bindPageSummary() {
  document.getElementById('summary').addEventListener('click', async () => {
    try {
      render({ ok: true, payload: { status: 'extracting-page-summary' } });
      const firstAttempt = await chrome.runtime.sendMessage({ type: 'pageSummary' });
      if (firstAttempt?.ok) {
        render(firstAttempt);
        await refreshStatus();
        return;
      }

      const tabResponse = await chrome.runtime.sendMessage({ type: 'currentTab' });
      if (!tabResponse?.ok || !tabResponse.payload?.url) {
        render(firstAttempt || tabResponse);
        return;
      }

      const origin = new URL(tabResponse.payload.url).origin;
      render({ ok: true, payload: { status: 'requesting-page-permission', origin } });
      const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
      if (!granted) {
        render({ ok: false, error: `Permission denied for ${origin}` });
        return;
      }

      render({ ok: true, payload: { status: 'extracting-page-summary', origin } });
      const response = await chrome.runtime.sendMessage({ type: 'pageSummary' });
      render(response);
      await refreshStatus();
    } catch (error) {
      render({ ok: false, error: error.message });
    }
  });
}

async function refreshStatus() {
  const response = await chrome.runtime.sendMessage({ type: 'status' });
  const current = response?.status || {};
  const connected = Boolean(current.connected);
  const online = Boolean(current.online);
  const connecting = Boolean(response?.status?.connecting);
  const paired = current.pairing === 'paired' || Boolean(current.registered);

  if (online && paired) {
    status.textContent = '在线';
  } else if (connecting) {
    status.textContent = '连接中';
  } else if (paired) {
    status.textContent = '已配对，重连中';
  } else if (current.pairing === 'pending') {
    status.textContent = '等待配对';
  } else {
    status.textContent = connected ? '已连接' : '未连接';
  }
  status.dataset.state = online && paired ? 'online' : paired ? 'paired' : connecting ? 'connecting' : 'offline';
}

function render(value) {
  output.textContent = JSON.stringify(value, null, 2);
}
