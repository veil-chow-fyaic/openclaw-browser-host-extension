const SNAPSHOTS_KEY = 'patternMemorySnapshots';
const PATTERNS_KEY = 'patternMemoryPatterns';
const CANDIDATES_KEY = 'patternMemoryCandidates';

export const PATTERN_SNAPSHOT_ALARM = 'openclaw-pattern-snapshot-hourly';

const SNAPSHOT_RETENTION_LIMIT = 168;
const PATTERN_RETENTION_LIMIT = 50;
const CANDIDATE_RETENTION_LIMIT = 20;
const MIN_CANDIDATE_SUPPORT = 2;
const MAX_TABS_PER_SNAPSHOT = 80;
const LOW_VALUE_ORIGINS = new Set([
  'https://chrome.google.com',
  'https://chromewebstore.google.com',
  'https://microsoftedge.microsoft.com',
  'https://addons.mozilla.org'
]);

export async function ensurePatternSnapshotAlarm() {
  const existing = await chrome.alarms.get(PATTERN_SNAPSHOT_ALARM);
  if (!existing) {
    await chrome.alarms.create(PATTERN_SNAPSHOT_ALARM, {
      delayInMinutes: 60,
      periodInMinutes: 60
    });
  }
}

export async function savePatternSnapshot(reason = 'manual') {
  const snapshot = await collectCurrentSnapshot();
  const stored = await chrome.storage.local.get([SNAPSHOTS_KEY]);
  const snapshots = [...asArray(stored[SNAPSHOTS_KEY]), snapshot]
    .slice(-SNAPSHOT_RETENTION_LIMIT);
  const patterns = generatePatterns(snapshots).slice(0, PATTERN_RETENTION_LIMIT);
  const candidates = generateCandidates(patterns).slice(0, CANDIDATE_RETENTION_LIMIT);

  await chrome.storage.local.set({
    [SNAPSHOTS_KEY]: snapshots,
    [PATTERNS_KEY]: patterns,
    [CANDIDATES_KEY]: candidates
  });

  return {
    ok: true,
    payload: {
      reason,
      savedAt: snapshot.timestamp,
      tabCount: snapshot.tabs.length,
      snapshotCount: snapshots.length,
      patternCount: patterns.length,
      candidateCount: candidates.length,
      candidates
    }
  };
}

export async function getPatternMemoryState() {
  const stored = await chrome.storage.local.get([SNAPSHOTS_KEY, PATTERNS_KEY, CANDIDATES_KEY]);
  const snapshots = asArray(stored[SNAPSHOTS_KEY]);
  const patterns = asArray(stored[PATTERNS_KEY]);
  const candidates = asArray(stored[CANDIDATES_KEY]);
  return {
    ok: true,
    payload: {
      snapshotCount: snapshots.length,
      patternCount: patterns.length,
      candidateCount: candidates.length,
      latestSnapshotAt: snapshots[snapshots.length - 1]?.timestamp || '',
      patterns,
      candidates
    }
  };
}

async function collectCurrentSnapshot() {
  const timestamp = new Date().toISOString();
  const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
  const tabGroups = await Promise.all(
    windows.map((windowInfo) => chrome.tabs.query({ windowId: windowInfo.id }))
  );
  const tabs = tabGroups
    .flat()
    .map((tab) => toSnapshotTab(tab, timestamp))
    .filter(Boolean)
    .slice(0, MAX_TABS_PER_SNAPSHOT);

  return { timestamp, tabs };
}

function toSnapshotTab(tab, timestamp) {
  if (!Number.isInteger(tab.id) || !Number.isInteger(tab.windowId)) {
    return null;
  }

  const normalized = normalizeHttpUrl(tab.url);
  if (!normalized || isLowValueUrl(normalized)) {
    return null;
  }

  return {
    url: normalized.href,
    origin: normalized.origin,
    title: tab.title || '',
    windowId: tab.windowId,
    tabId: tab.id,
    active: Boolean(tab.active),
    pinned: Boolean(tab.pinned),
    timestamp
  };
}

function normalizeHttpUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

function isLowValueUrl(url) {
  if (LOW_VALUE_ORIGINS.has(url.origin)) {
    return true;
  }

  const pathname = url.pathname.toLowerCase();
  return pathname === '/favicon.ico' ||
    pathname.endsWith('/favicon.ico') ||
    pathname.endsWith('/robots.txt');
}

function generatePatterns(snapshots) {
  const groups = new Map();

  for (const snapshot of snapshots) {
    const tabsByWindow = groupTabsByWindow(asArray(snapshot.tabs));
    for (const tabs of tabsByWindow.values()) {
      const uniqueTabs = dedupeTabs(tabs);
      if (uniqueTabs.length < 2) {
        continue;
      }

      for (const pair of pairTabs(uniqueTabs)) {
        const key = pair.map((tab) => tab.origin).sort().join('|');
        const existing = groups.get(key) || {
          id: stablePatternId(key),
          kind: 'co_occurrence',
          origins: pair.map((tab) => tab.origin).sort(),
          urls: [],
          titles: [],
          support: 0,
          confidence: 0,
          firstSeenAt: snapshot.timestamp,
          lastSeenAt: snapshot.timestamp
        };

        existing.support += 1;
        existing.lastSeenAt = snapshot.timestamp;
        existing.urls = mergeUnique(existing.urls, pair.map((tab) => tab.url)).slice(0, 12);
        existing.titles = mergeUnique(existing.titles, pair.map((tab) => tab.title).filter(Boolean)).slice(0, 12);
        groups.set(key, existing);
      }
    }
  }

  return [...groups.values()]
    .map((pattern) => ({
      ...pattern,
      confidence: Math.min(1, pattern.support / MIN_CANDIDATE_SUPPORT)
    }))
    .filter((pattern) => pattern.support >= MIN_CANDIDATE_SUPPORT)
    .sort((a, b) => b.support - a.support || b.lastSeenAt.localeCompare(a.lastSeenAt));
}

function generateCandidates(patterns) {
  return patterns.map((pattern) => ({
    id: `candidate:${pattern.id}`,
    patternId: pattern.id,
    reason: 'tabs-opened-together',
    origins: pattern.origins,
    urls: pattern.urls,
    support: pattern.support,
    confidence: pattern.confidence,
    generatedAt: new Date().toISOString()
  }));
}

function groupTabsByWindow(tabs) {
  const grouped = new Map();
  for (const tab of tabs) {
    const existing = grouped.get(tab.windowId) || [];
    existing.push(tab);
    grouped.set(tab.windowId, existing);
  }
  return grouped;
}

function dedupeTabs(tabs) {
  const byOrigin = new Map();
  for (const tab of tabs) {
    if (!byOrigin.has(tab.origin) || tab.active) {
      byOrigin.set(tab.origin, tab);
    }
  }
  return [...byOrigin.values()];
}

function pairTabs(tabs) {
  const pairs = [];
  for (let left = 0; left < tabs.length - 1; left += 1) {
    for (let right = left + 1; right < tabs.length; right += 1) {
      pairs.push([tabs[left], tabs[right]]);
    }
  }
  return pairs;
}

function stablePatternId(key) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
  }
  return `pattern:${Math.abs(hash).toString(36)}`;
}

function mergeUnique(left, right) {
  return [...new Set([...left, ...right])];
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}