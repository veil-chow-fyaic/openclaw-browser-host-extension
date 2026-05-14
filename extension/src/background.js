const DEFAULT_CONFIG = {
  gatewayUrl: '',
  token: '',
  nodeName: 'OpenClaw Browser Host',
  protocol: 'browser-host',
  autoConnect: false
};
const CONFIRM_TIMEOUT_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 25 * 1000;
const CAPABILITIES = [
  'browser.notify',
  'system.notify',
  'browser.current_tab.info',
  'browser.current_tab.extract',
  'browser.downloads.summary',
  'user.confirm'
];

let socket = null;
let heartbeatTimer = null;
let reconnectEnabled = false;
let lastInvokeId = '';
let pendingConfirm = null;
let hostIdentity = null;
let status = {
  connected: false,
  connecting: false,
  registered: false,
  hostId: '',
  lastError: '',
  lastConnectedAt: '',
  lastDisconnectedAt: '',
  lastCommand: ''
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(Object.keys(DEFAULT_CONFIG));
  await chrome.storage.local.set({ ...DEFAULT_CONFIG, ...existing });
  await ensureHostIdentity();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'openclaw-reconnect') {
    connectGateway().catch((error) => setStatus({ lastError: error.message }));
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  sendGatewayMessage({
    type: 'browser.host.event',
    event: 'notification.clicked',
    payload: {
      notificationId,
      clickedAt: new Date().toISOString()
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleRuntimeMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

ensureHostIdentity().catch((error) => setStatus({ lastError: error.message }));

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
    case 'userConfirm':
      return userConfirm(message.payload ?? {});
    default:
      return { ok: false, error: `Unknown message type: ${message?.type}` };
  }
}

async function connectGateway() {
  const config = await chrome.storage.local.get(Object.keys(DEFAULT_CONFIG));
  if (!config.gatewayUrl) {
    throw new Error('Gateway URL is not configured');
  }

  reconnectEnabled = true;
  setStatus({ connecting: true, lastError: '' });
  const identity = await ensureHostIdentity();

  if (socket) {
    socket.close();
    socket = null;
  }

  socket = new WebSocket(config.gatewayUrl);
  socket.addEventListener('open', () => {
    setStatus({
      connected: true,
      connecting: false,
      registered: false,
      hostId: identity.hostId,
      lastError: '',
      lastConnectedAt: new Date().toISOString()
    });
    sendRegisterMessage(config, identity);
    startHeartbeat(config, identity);
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
    stopHeartbeat();
    setStatus({
      connected: false,
      connecting: false,
      registered: false,
      lastDisconnectedAt: new Date().toISOString()
    });
    if (reconnectEnabled) {
      chrome.alarms.create('openclaw-reconnect', { delayInMinutes: 1 });
    }
  });

  socket.addEventListener('error', () => {
    setStatus({ connecting: false, lastError: 'WebSocket error' });
  });
}

function disconnectGateway() {
  reconnectEnabled = false;
  chrome.alarms.clear('openclaw-reconnect');
  stopHeartbeat();
  if (socket) {
    socket.close();
    socket = null;
  }
  setStatus({
    connected: false,
    connecting: false,
    registered: false,
    lastDisconnectedAt: new Date().toISOString()
  });
}

async function handleGatewayMessage(raw) {
  const message = JSON.parse(raw);
  if (message.type === 'browser.host.registered') {
    setStatus({ registered: true, lastError: '' });
    return;
  }

  if (message.type === 'browser.host.pong') {
    setStatus({ lastHeartbeatAt: new Date().toISOString() });
    return;
  }

  const isBrowserInvoke = message.type === 'browser.host.invoke';
  const isNodeInvoke = message.type === 'node.invoke';
  if (!isBrowserInvoke && !isNodeInvoke) {
    setStatus({ lastError: `Ignored message type: ${message.type || 'unknown'}` });
    return;
  }

  lastInvokeId = message.id || '';
  setStatus({ lastCommand: message.command || '' });
  const result = await executeCommand(message.command, message.args ?? {});

  if (isBrowserInvoke) {
    sendGatewayMessage({
      type: 'browser.host.invoke.result',
      id: message.id,
      hostId: status.hostId || undefined,
      command: message.command,
      ...result
    });
    return;
  }

  sendGatewayMessage({
    type: 'node.invoke.result',
    id: message.id,
    ...result
  });
}

async function ensureHostIdentity() {
  if (hostIdentity) {
    return hostIdentity;
  }

  const stored = await chrome.storage.local.get(['browserHostIdentity']);
  if (stored.browserHostIdentity?.hostId) {
    hostIdentity = stored.browserHostIdentity;
    setStatus({ hostId: hostIdentity.hostId });
    return hostIdentity;
  }

  hostIdentity = {
    hostId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    kind: 'browser-extension'
  };
  await chrome.storage.local.set({ browserHostIdentity: hostIdentity });
  setStatus({ hostId: hostIdentity.hostId });
  return hostIdentity;
}

function sendRegisterMessage(config, identity) {
  const payload = {
    type: 'browser.host.register',
    protocolVersion: 1,
    hostId: identity.hostId,
    hostName: config.nodeName || 'OpenClaw Browser Host',
    runtime: 'chrome-extension-mv3',
    token: config.token || undefined,
    capabilities: CAPABILITIES,
    userAgent: navigator.userAgent,
    connectedAt: new Date().toISOString()
  };

  if (config.protocol === 'node-compatible') {
    payload.type = 'browser.host.hello';
    payload.nodeName = payload.hostName;
  }

  sendGatewayMessage(payload);
}

function startHeartbeat(config, identity) {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    sendGatewayMessage({
      type: 'browser.host.heartbeat',
      hostId: identity.hostId,
      hostName: config.nodeName || 'OpenClaw Browser Host',
      sentAt: new Date().toISOString()
    });
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

async function executeCommand(command, args) {
  switch (command) {
    case 'browser.notify':
    case 'system.notify':
      return showNotification(args);
    case 'browser.current_tab.info':
      return currentTabInfo();
    case 'browser.current_tab.extract':
      return currentPageSummary();
    case 'browser.downloads.summary':
      return downloadsSummary(args);
    case 'user.confirm':
      return userConfirm(args);
    default:
      return { ok: false, error: `Unsupported command: ${command}` };
  }
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
  return {
    ok: true,
    payload: {
      sent: true,
      notificationId: id,
      requestId: lastInvokeId || undefined
    }
  };
}

async function currentTabInfo() {
  const tab = await getActiveWebTab();
  if (!tab) {
    return { ok: false, error: 'No active web tab' };
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
  const tab = await getActiveWebTab();
  if (!tab?.id) {
    return { ok: false, error: 'No active web tab' };
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

async function getActiveWebTab() {
  const focused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const direct = focused.find(isWebTab);
  if (direct) {
    return direct;
  }

  const candidates = await chrome.tabs.query({});
  return candidates
    .filter(isWebTab)
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
}

function isWebTab(tab) {
  return typeof tab.url === 'string' &&
    (tab.url.startsWith('http://') || tab.url.startsWith('https://'));
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

async function userConfirm(args) {
  if (pendingConfirm) {
    return { ok: false, error: 'Another confirmation is already pending' };
  }

  const title = args.title || 'OpenClaw confirmation';
  const message = args.message || args.body || 'Allow this action?';
  pendingConfirm = { title, message, createdAt: new Date().toISOString() };

  try {
    await chrome.windows.create({
      url: chrome.runtime.getURL(
        `src/confirm.html?title=${encodeURIComponent(title)}&message=${encodeURIComponent(message)}`
      ),
      type: 'popup',
      width: 420,
      height: 260,
      focused: true
    });

    const result = await waitForConfirmation();
    return {
      ok: true,
      payload: {
        confirmed: result.confirmed,
        action: result.confirmed ? 'confirmed' : 'rejected',
        respondedAt: new Date().toISOString()
      }
    };
  } finally {
    pendingConfirm = null;
  }
}

function waitForConfirmation() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      resolve({ confirmed: false });
    }, CONFIRM_TIMEOUT_MS);

    const listener = (message) => {
      if (message?.type !== 'confirmResult') {
        return;
      }
      clearTimeout(timeout);
      chrome.runtime.onMessage.removeListener(listener);
      resolve({ confirmed: Boolean(message.confirmed) });
    };
    chrome.runtime.onMessage.addListener(listener);
  });
}
