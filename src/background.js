chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('theme').then(({ theme }) => {
    if (!theme) chrome.storage.local.set({ theme: 'dark' });
  }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'OPEN_OPTIONS' && sender.tab?.id) chrome.tabs.create({ url: chrome.runtime.getURL('src/popup.html#settings') });
});
