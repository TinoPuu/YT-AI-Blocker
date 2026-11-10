(function () {
  const store = globalThis.AiBlockStore;
  const i18n = globalThis.AiBlockI18n;
  const { t } = i18n;
  const enabledInput = document.getElementById('enabled');
  const languageSelect = document.getElementById('language');
  const stateText = document.getElementById('state');
  const list = document.getElementById('channels');
  const count = document.getElementById('count');
  const empty = document.getElementById('empty');
  const exportButton = document.getElementById('export');
  const importButton = document.getElementById('import');
  const importInput = document.getElementById('import-file');
  const status = document.getElementById('status');
  const EXPORT_FILENAME = 'ai-blocklist.json';
  const IMPORT_HASH = '#import';
  const UNDO_TIMEOUT_MS = 10000;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const openedForImport = location.hash === IMPORT_HASH;
  let importPromptShown = false;
  let statusTimer = null;

  function translateStatic() {
    document.documentElement.lang = i18n.language();
    for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  }

  function clearStatus() {
    clearTimeout(statusTimer);
    status.replaceChildren();
  }

  function showStatus(text, action) {
    clearStatus();
    const message = document.createElement('span');
    message.textContent = text;
    status.replaceChildren(message);
    if (!action) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      clearStatus();
      action.run();
    });
    status.append(button);
    statusTimer = setTimeout(clearStatus, UNDO_TIMEOUT_MS);
  }

  function crossIcon() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 14 14');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M3 3l8 8M11 3l-8 8');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.6');
    path.setAttribute('stroke-linecap', 'round');
    svg.append(path);
    return svg;
  }

  function metaText(entry, dateFormat) {
    const parts = [];
    if (Number.isFinite(entry.addedAt)) parts.push(dateFormat.format(entry.addedAt));
    if (entry.source === 'manual') parts.push(t('addedManually'));
    return parts.join(' · ');
  }

  async function removeChannel(channelId, entry) {
    try {
      await store.removeChannel(channelId);
    } catch {
      showStatus(t('removeFailed'));
      return;
    }
    showStatus(t('removed', { name: entry.name }), {
      label: t('undo'),
      run: () => store.restoreChannel(channelId, entry).catch(() => showStatus(t('restoreFailed'))),
    });
  }

  function channelItem(channelId, entry, dateFormat) {
    const item = document.createElement('li');
    item.className = 'channel';

    const text = document.createElement('div');
    text.className = 'channel-text';

    const link = document.createElement('a');
    link.className = 'channel-name';
    link.href = `https://www.youtube.com/channel/${channelId}`;
    link.target = '_blank';
    link.textContent = entry.name;

    const meta = document.createElement('span');
    meta.className = 'channel-meta';
    meta.textContent = metaText(entry, dateFormat);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.title = t('removeFromBlocklist');
    remove.setAttribute('aria-label', t('removeNamed', { name: entry.name }));
    remove.append(crossIcon());
    remove.addEventListener('click', () => removeChannel(channelId, entry));

    text.append(link, meta);
    item.append(text, remove);
    return item;
  }

  async function render() {
    const { blocklist, settings } = await store.load();
    i18n.setLanguage(settings.language);
    translateStatic();
    languageSelect.value = settings.language;
    enabledInput.checked = settings.enabled;
    document.body.classList.toggle('is-off', !settings.enabled);
    stateText.textContent = t(settings.enabled ? 'stateOn' : 'stateOff');

    const dateFormat = new Intl.DateTimeFormat(i18n.locale(), { dateStyle: 'medium' });
    const entries = Object.entries(blocklist).sort(([, a], [, b]) => b.addedAt - a.addedAt);
    count.textContent = entries.length ? String(entries.length) : '';
    empty.hidden = entries.length > 0;
    list.hidden = entries.length === 0;
    list.replaceChildren(...entries.map(([id, entry]) => channelItem(id, entry, dateFormat)));

    if (openedForImport && !importPromptShown) {
      importPromptShown = true;
      showStatus(t('importPrompt'));
    }
  }

  async function exportList() {
    const { blocklist, allowed } = await store.load();
    const blob = new Blob([JSON.stringify({ version: 1, blocklist, allowed }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = EXPORT_FILENAME;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function importStatus({ blocked, allowed }) {
    if (!blocked && !allowed) return t('importNothing');
    return t('importDone', { blocked, allowed });
  }

  async function importList() {
    const file = importInput.files[0];
    importInput.value = '';
    if (!file) return;
    let imported;
    try {
      imported = JSON.parse(await file.text());
    } catch {
      showStatus(t('invalidJson'));
      return;
    }
    try {
      showStatus(importStatus(await store.importData(imported)));
    } catch {
      showStatus(t('importFailed'));
    }
  }

  async function startImport() {
    if (openedForImport) {
      importInput.click();
      return;
    }
    await chrome.tabs.create({ url: chrome.runtime.getURL(`src/popup/popup.html${IMPORT_HASH}`) });
    window.close();
  }

  function saveSetting(save) {
    save.catch(() => {
      showStatus(t('saveFailed'));
      render();
    });
  }

  enabledInput.addEventListener('change', () => saveSetting(store.setEnabled(enabledInput.checked)));
  languageSelect.addEventListener('change', () => {
    clearStatus();
    saveSetting(store.setLanguage(languageSelect.value));
  });
  exportButton.addEventListener('click', exportList);
  importButton.addEventListener('click', startImport);
  importInput.addEventListener('change', importList);
  store.onChange(render);
  document.body.classList.toggle('is-page', openedForImport);
  render();
})();
