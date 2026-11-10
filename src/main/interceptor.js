(function () {
  const { extractPage, extractPlayer } = globalThis.AiBlockExtract;
  const MESSAGE_SOURCE = 'aiblock';
  const INSTANCE_KEY = '__aiblockInterceptor';
  const instance = {};
  const posted = new WeakSet();
  window[INSTANCE_KEY] = instance;

  function post(json, kind) {
    if (!json || typeof json !== 'object' || posted.has(json) || window[INSTANCE_KEY] !== instance) return;
    posted.add(json);
    try {
      const message = { source: MESSAGE_SOURCE, tiles: [], channels: [], watch: null, player: null };
      if (kind === 'player') message.player = extractPlayer(json);
      else Object.assign(message, extractPage(json));
      window.postMessage(message, window.location.origin);
    } catch (error) {
      console.warn('[aiblock] extract failed', error);
    }
    if (kind === 'data') post(json.playerResponse, 'player');
  }

  function kindOf(url) {
    const match = /\/youtubei\/v1\/(next|browse|search|player|reel\/[a-z_]+)/.exec(url);
    if (!match) return null;
    return match[1] === 'player' ? 'player' : 'data';
  }

  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const response = await originalFetch.call(this, input, init);
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    const kind = kindOf(url);
    if (kind && response.ok) {
      response
        .clone()
        .json()
        .then((json) => post(json, kind))
        .catch(() => {});
    }
    return response;
  };

  function postPage(event) {
    const page = event.detail?.pageData ?? event.detail?.response;
    if (!page || typeof page !== 'object') return;
    post(page.response, 'data');
    post(page.playerResponse, 'player');
  }

  function livePage() {
    try {
      return document.querySelector('ytd-page-manager')?.getCurrentData?.() ?? null;
    } catch {
      return null;
    }
  }

  function livePlayerResponse() {
    try {
      return document.getElementById('movie_player')?.getPlayerResponse?.() ?? null;
    } catch {
      return null;
    }
  }

  function postCurrentPage() {
    post(window.ytInitialData, 'data');
    post(window.ytInitialPlayerResponse, 'player');
    const page = livePage();
    post(page?.response, 'data');
    post(page?.playerResponse ?? livePlayerResponse(), 'player');
  }

  document.addEventListener('yt-page-data-fetched', postPage);
  document.addEventListener('yt-navigate-finish', postPage);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', postCurrentPage);
  else postCurrentPage();
})();
