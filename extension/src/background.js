const DEFAULT_CONFIG = {
  gatewayUrl: '',
  token: '',
  nodeName: 'OpenClaw Browser Host',
  autoConnect: false
};

let socket = null;
let status = {
  connected: false,
  lastError: '',
  lastConnectedAt: '',
  lastDisconnectedAt: ''
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(Object.keys(DEFAULT_CONFIG));
  await chrome.storage.local.set({ ...DEFAULT_CONFIG, ...existing });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'openclaw-reconnect') {
    connectGateway().catch((error) => setStatus({ lastError: error.message }));
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleRuntimeMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

async function handleRuntimeMessage(message) {
  switch (message?.type) {
    case 'status':
      return { ok: true, status };
    case 'connect':
      await connectGateway();
      return { ok: true, status };
    case 'disconnect':
      disconnectGateway();
      return { ok: true, status };
    case 'notify':
      return showNotification(message.payload ?? {});
    case 'currentTab':
      return currentTabInfo();
    case 'pageSummary':
      return currentPageSummary();
    case 'downloadsSummary':
      return downloadsSummary(message.payload ?? {});
    default:
      return { ok: false, error: `Unknown message type: ${message?.type}` };
  }
}

async function connectGateway() {
  const config = await chrome.storage.local.get(Object.keys(DEFAULT_CONFIG));
  if (!config.gatewayUrl) {
    throw new Error('Gateway URL is not configured');
  }

  if (socket) {
    socket.close();
    socket = null;
  }

  socket = new WebSocket(config.gatewayUrl);
  socket.addEventListener('open', () => {
    setStatus({
      connected: true,
      lastError: '',
      lastConnectedAt: new Date().toISOString()
    });
    sendGatewayMessage({
      type: 'browser.host.hello',
      nodeName: config.nodeName,
      token: config.token || undefined,
      capabilities: [
        'browser.notify',
        'browser.current_tab.info',
        'browser.current_tab.extract',
        'browser.downloads.summary',
        'user.confirm'
      ]
    });
  });

  socket.addEventListener('message', (event) => {
    handleGatewayMessage(event.data).catch((error) => {
      sendGatewayMessage({
        type: 'browser.host.error',
        error: error.message
      });
    });
  });

  socket.addEventListener('close', () => {
    setStatus({
      connected: false,
      lastDisconnectedAt: new Date().toISOString()
    });
    chrome.alarms.create('openclaw-reconnect', { delayInMinutes: 1 });
  });

  socket.addEventListener('error', () => {
    setStatus({ lastError: 'WebSocket error' });
  });
}

function disconnectGateway() {
  chrome.alarms.clear('openclaw-reconnect');
  if (socket) {
    socket.close();
    socket = null;
  }
  setStatus({
    connected: false,
    lastDisconnectedAt: new Date().toISOString()
  });
}

async function handleGatewayMessage(raw) {
  const message = JSON.parse(raw);
  if (message.type !== 'node.invoke') {
    return;
  }

  let result;
  switch (message.command) {
    case 'browser.notify':
      result = await showNotification(message.args ?? {});
      break;
    case 'browser.current_tab.info':
      result = await currentTabInfo();
      break;
    case 'browser.current_tab.extract':
      result = await currentPageSummary();
      break;
    case 'browser.downloads.summary':
      result = await downloadsSummary(message.args ?? {});
      break;
    default:
      result = { ok: false, error: `Unsupported command: ${message.command}` };
      break;
  }

  sendGatewayMessage({
    type: 'node.invoke.result',
    id: message.id,
    ...result
  });
}

function sendGatewayMessage(message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }
  socket.send(JSON.stringify(message));
  return true;
}

function setStatus(patch) {
  status = { ...status, ...patch };
  chrome.storage.local.set({ connectionStatus: status });
}

async function showNotification(args) {
  const id = `openclaw-${Date.now()}`;
  await chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: '../icons/icon-128.png',
    title: args.title || 'OpenClaw',
    message: args.body || args.message || ''
  });
  return { ok: true, payload: { sent: true, notificationId: id } };
}

async function currentTabInfo() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) {
    return { ok: false, error: 'No active tab' };
  }

  return {
    ok: true,
    payload: {
      id: tab.id,
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      windowId: tab.windowId
    }
  };
}

async function currentPageSummary() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) {
    return { ok: false, error: 'No active tab' };
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content.js']
    });
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'pageSummary' });
    return { ok: true, payload: response };
  } catch (error) {
    return { ok: false, error: `Page summary failed: ${error.message}` };
  }
}

async function downloadsSummary(args) {
  const lookbackMinutes = Math.max(1, Math.min(Number(args.lookbackMinutes || 60), 60 * 24 * 30));
  const since = Date.now() - lookbackMinutes * 60 * 1000;
  const items = await chrome.downloads.search({
    startedAfter: new Date(since).toISOString(),
    orderBy: ['-startTime'],
    limit: Math.max(1, Math.min(Number(args.maxItems || 50), 200))
  });

  return {
    ok: true,
    payload: {
      lookbackMinutes,
      count: items.length,
      items: items.map((item) => ({
        id: item.id,
        filename: item.filename,
        url: item.url,
        finalUrl: item.finalUrl,
        state: item.state,
        mime: item.mime,
        bytesReceived: item.bytesReceived,
        totalBytes: item.totalBytes,
        startTime: item.startTime,
        endTime: item.endTime,
        exists: item.exists
      }))
    }
  };
}
