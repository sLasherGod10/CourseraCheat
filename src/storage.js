const DEFAULTS = Object.freeze({
  playbackSpeed: 1,
  autoSpeed: true,
  autoNext: false,
  theme: 'dark',
  ai: {
    enabled: false,
    provider: 'gemini',
    endpoint: '',
    model: 'gemini-2.5-flash',
    apiKey: ''
  },
  checklist: {}
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULTS);
  return {
    ...clone(DEFAULTS),
    ...stored,
    ai: { ...DEFAULTS.ai, ...(stored.ai || {}) },
    checklist: stored.checklist || {}
  };
}

export async function updateSettings(patch) {
  const current = await getSettings();
  const next = {
    ...current,
    ...patch,
    ai: patch.ai ? { ...current.ai, ...patch.ai } : current.ai
  };
  await chrome.storage.local.set(next);
  return next;
}

export const __testing = { DEFAULTS };
