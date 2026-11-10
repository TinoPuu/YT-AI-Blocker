(function (root) {
  const SOURCES = new Set(['manual', 'label']);
  const MAX_NAME_LENGTH = 200;
  const LANGUAGE_SETTINGS = new Set(['auto', 'fi', 'en']);

  function decide(video, blocklist, settings) {
    if (!settings?.enabled || !video) return 'show';
    if (video.aiLabel) return 'hide';
    if (video.channelId && blocklist?.[video.channelId]) return 'hide';
    return 'show';
  }

  function isChannelId(value) {
    return typeof value === 'string' && value.startsWith('UC');
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function withChannelAdded(data, channelId, name, source, now) {
    if (data.blocklist[channelId]) return data;
    if (source !== 'manual' && data.allowed[channelId]) return data;
    const allowed = { ...data.allowed };
    delete allowed[channelId];
    return {
      ...data,
      blocklist: { ...data.blocklist, [channelId]: { name: name || channelId, addedAt: now, source } },
      allowed,
    };
  }

  function withEnabled(data, enabled) {
    return { ...data, settings: { ...data.settings, enabled: Boolean(enabled) } };
  }

  function withLanguage(data, language) {
    if (!LANGUAGE_SETTINGS.has(language)) return data;
    return { ...data, settings: { ...data.settings, language } };
  }

  function withChannelRemoved(data, channelId) {
    if (!data.blocklist[channelId]) return data;
    const blocklist = { ...data.blocklist };
    delete blocklist[channelId];
    return { ...data, blocklist, allowed: { ...data.allowed, [channelId]: true } };
  }

  function importedEntry(channelId, entry, now) {
    const name = typeof entry?.name === 'string' && entry.name ? entry.name.slice(0, MAX_NAME_LENGTH) : channelId;
    const addedAt = Number.isFinite(entry?.addedAt) ? entry.addedAt : now;
    const source = SOURCES.has(entry?.source) ? entry.source : 'manual';
    return { name, addedAt, source };
  }

  function withChannelRestored(data, channelId, entry, now) {
    if (!isChannelId(channelId) || data.blocklist[channelId]) return data;
    const allowed = { ...data.allowed };
    delete allowed[channelId];
    return { ...data, blocklist: { ...data.blocklist, [channelId]: importedEntry(channelId, entry, now) }, allowed };
  }

  function mergeImported(data, imported, now) {
    if (!isRecord(imported)) return data;
    const importedBlocklist = isRecord(imported.blocklist) ? imported.blocklist : {};
    const importedAllowed = isRecord(imported.allowed) ? imported.allowed : {};
    const isNew = (channelId) => isChannelId(channelId) && !data.blocklist[channelId] && !data.allowed[channelId];

    const blockedIds = Object.keys(importedBlocklist).filter(isNew);
    const allowedIds = Object.keys(importedAllowed).filter(
      (channelId) => isNew(channelId) && importedAllowed[channelId] === true && !blockedIds.includes(channelId),
    );
    if (!blockedIds.length && !allowedIds.length) return data;

    const blocklist = { ...data.blocklist };
    for (const channelId of blockedIds) blocklist[channelId] = importedEntry(channelId, importedBlocklist[channelId], now);
    const allowed = { ...data.allowed };
    for (const channelId of allowedIds) allowed[channelId] = true;
    return { ...data, blocklist, allowed };
  }

  const api = { decide, isChannelId, withChannelAdded, withChannelRemoved, withChannelRestored, withEnabled, withLanguage, mergeImported };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AiBlockRules = api;
})(globalThis);
