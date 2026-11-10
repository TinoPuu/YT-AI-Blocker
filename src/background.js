importScripts('lib/rules.js', 'lib/store.js');

const { withChannelAdded, withChannelRemoved, withChannelRestored, withEnabled, withLanguage, mergeImported } =
  globalThis.AiBlockRules;
const { load } = globalThis.AiBlockStore;
const BADGE_COLOR = '#b3261e';
const MAX_BADGE_COUNT = 999;
const REINJECT_REASONS = new Set(['install', 'update']);
let queue = Promise.resolve();

function update(transform) {
  const run = queue.then(async () => {
    const data = await load();
    const next = transform(data);
    if (next !== data) await chrome.storage.local.set(next);
    return { data, next };
  });
  queue = run.catch(() => {});
  return run;
}

function addedCount(before, after) {
  return Object.keys(after).length - Object.keys(before).length;
}

const STORE_OPS = {
  async addChannel(channelId, name, source) {
    await update((data) => withChannelAdded(data, channelId, name, source, Date.now()));
  },
  async removeChannel(channelId) {
    await update((data) => withChannelRemoved(data, channelId));
  },
  async restoreChannel(channelId, entry) {
    await update((data) => withChannelRestored(data, channelId, entry, Date.now()));
  },
  async setEnabled(enabled) {
    await update((data) => withEnabled(data, enabled));
  },
  async setLanguage(language) {
    await update((data) => withLanguage(data, language));
  },
  async importData(imported) {
    const { data, next } = await update((current) => mergeImported(current, imported, Date.now()));
    return { blocked: addedCount(data.blocklist, next.blocklist), allowed: addedCount(data.allowed, next.allowed) };
  },
};

function updateBadge(message, tabId) {
  const count = Number.isInteger(message.count) && message.count > 0 ? message.count : 0;
  const text = count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : count ? String(count) : '';
  chrome.action.setBadgeText({ tabId, text });
}

function runStoreOp(message, sendResponse) {
  const op = Object.hasOwn(STORE_OPS, message.op) ? STORE_OPS[message.op] : null;
  if (!op) {
    sendResponse({ ok: false, error: `unknown store operation ${message.op}` });
    return;
  }
  op(...(Array.isArray(message.args) ? message.args : [])).then(
    (result) => sendResponse({ ok: true, result }),
    (error) => sendResponse({ ok: false, error: String(error) }),
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'hidden-count') {
    if (sender.tab?.id !== undefined) updateBadge(message, sender.tab.id);
    return false;
  }
  if (message?.type !== 'store') return false;
  runStoreOp(message, sendResponse);
  return true;
});

async function injectInto(tabId, script) {
  const target = { tabId };
  if (script.css) await chrome.scripting.insertCSS({ target, files: script.css });
  await chrome.scripting.executeScript({
    target,
    files: script.js,
    world: script.world ?? 'ISOLATED',
    injectImmediately: true,
  });
}

async function injectIntoOpenTabs() {
  const isMain = (script) => script.world === 'MAIN';
  const scripts = [...chrome.runtime.getManifest().content_scripts].sort((a, b) => isMain(a) - isMain(b));
  const tabs = await chrome.tabs.query({ url: scripts.flatMap((script) => script.matches) });
  for (const tab of tabs) {
    try {
      for (const script of scripts) await injectInto(tab.id, script);
    } catch (error) {
      console.warn('[aiblock] injection failed', tab.id, error);
    }
  }
}

chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (REINJECT_REASONS.has(reason)) injectIntoOpenTabs();
});
