(function (root) {
  const DEFAULT_SETTINGS = { enabled: true, language: 'auto' };

  async function load() {
    const stored = await chrome.storage.local.get(['blocklist', 'allowed', 'settings']);
    return {
      blocklist: stored.blocklist ?? {},
      allowed: stored.allowed ?? {},
      settings: { ...DEFAULT_SETTINGS, ...stored.settings },
    };
  }

  async function mutate(op, ...args) {
    const reply = await chrome.runtime.sendMessage({ type: 'store', op, args });
    if (!reply?.ok) throw new Error(reply?.error ?? `store operation ${op} failed`);
    return reply.result;
  }

  function onChange(callback) {
    chrome.storage.onChanged.addListener((_changes, area) => {
      if (area === 'local') callback();
    });
  }

  root.AiBlockStore = {
    load,
    onChange,
    addChannel: (channelId, name, source) => mutate('addChannel', channelId, name, source),
    removeChannel: (channelId) => mutate('removeChannel', channelId),
    restoreChannel: (channelId, entry) => mutate('restoreChannel', channelId, entry),
    setEnabled: (enabled) => mutate('setEnabled', enabled),
    setLanguage: (language) => mutate('setLanguage', language),
    importData: (imported) => mutate('importData', imported),
  };
})(globalThis);
