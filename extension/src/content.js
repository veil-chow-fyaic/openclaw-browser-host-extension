chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'pageSummary') {
    return false;
  }

  const selection = window.getSelection()?.toString() || '';
  const bodyText = document.body?.innerText || '';
  sendResponse({
    title: document.title,
    url: location.href,
    selection: selection.slice(0, 4000),
    textPreview: bodyText.replace(/\s+/g, ' ').trim().slice(0, 6000),
    collectedAt: new Date().toISOString()
  });
  return true;
});
