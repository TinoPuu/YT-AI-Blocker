(function () {
  const { decide } = globalThis.AiBlockRules;
  const store = globalThis.AiBlockStore;
  const tiles = globalThis.AiBlockTiles;
  const watch = globalThis.AiBlockWatch;
  const player = globalThis.AiBlockPlayer;
  const i18n = globalThis.AiBlockI18n;

  const USER_INPUT_WINDOW_MS = 1500;
  const MAX_CONSECUTIVE_SKIPS = 5;
  const SKIP_STREAK_RESET_MS = 30000;

  const videos = new Map();
  const channelNames = new Map();
  const channelIdsByHandle = new Map();
  const shownAnyway = new Set();
  let state = { blocklist: {}, allowed: {}, settings: { enabled: true } };
  let scheduled = false;
  let stopped = false;
  let reportedCount = 0;
  let lastUserInputAt = -Infinity;
  let automaticNavigation = false;
  let skippedVideoId = null;
  let consecutiveSkips = 0;
  let lastSkipAt = -Infinity;

  function remember(info) {
    if (!info?.videoId) return;
    const known = videos.get(info.videoId) ?? { videoId: info.videoId, channelId: null, name: null, aiLabel: false };
    videos.set(info.videoId, {
      videoId: info.videoId,
      channelId: info.channelId ?? known.channelId,
      name: info.name ?? known.name,
      aiLabel: known.aiLabel || Boolean(info.aiLabel),
    });
    if (info.channelId && info.name) channelNames.set(info.channelId, info.name);
  }

  function rememberChannel(info) {
    if (!info?.channelId) return;
    if (info.name) channelNames.set(info.channelId, info.name);
    const key = tiles.channelKeyFromHref(info.url);
    if (key?.startsWith('@')) channelIdsByHandle.set(key, info.channelId);
  }

  function channelIdOfKey(key) {
    if (!key) return null;
    return key.startsWith('@') ? channelIdsByHandle.get(key) ?? null : key;
  }

  function learnChannel(videoId) {
    const video = videos.get(videoId);
    if (!state.settings.enabled || !video?.aiLabel || !video.channelId) return;
    if (state.blocklist[video.channelId] || state.allowed[video.channelId]) return;
    persist(store.addChannel(video.channelId, video.name, 'label'));
  }

  function persist(update) {
    update.catch((error) => console.warn('[aiblock] store update failed', error));
  }

  function currentVideo() {
    return videos.get(tiles.videoIdFromHref(location.pathname + location.search)) ?? null;
  }

  function currentChannel() {
    const channelId = channelIdOfKey(tiles.channelKeyFromHref(location.pathname));
    return channelId ? { channelId, name: channelNames.get(channelId) ?? null } : null;
  }

  function blockedVideo() {
    if (stopped) return null;
    const video = currentVideo();
    if (!video || shownAnyway.has(video.videoId)) return null;
    return decide(video, state.blocklist, state.settings) === 'hide' ? video : null;
  }

  function showAnyway(video) {
    shownAnyway.add(video.videoId);
  }

  function toggleChannel(subject, blocked) {
    if (blocked) persist(store.removeChannel(subject.channelId));
    else persist(store.addChannel(subject.channelId, subject.name, 'manual'));
  }

  function decideVideo(videoId) {
    return decide(videos.get(videoId), state.blocklist, state.settings);
  }

  function decideChannel(channelKey) {
    return decide({ channelId: channelIdOfKey(channelKey), aiLabel: false }, state.blocklist, state.settings);
  }

  function reportCount(count) {
    if (count === reportedCount) return;
    reportedCount = count;
    try {
      chrome.runtime.sendMessage({ type: 'hidden-count', count }).catch(() => {});
    } catch {}
  }

  function skipIfAutomatic(video) {
    if (!automaticNavigation || location.pathname !== '/watch' || skippedVideoId === video.videoId) return;
    const now = performance.now();
    if (now - lastSkipAt > SKIP_STREAK_RESET_MS) consecutiveSkips = 0;
    if (consecutiveSkips >= MAX_CONSECUTIVE_SKIPS || !player.skipToNext()) return;
    skippedVideoId = video.videoId;
    consecutiveSkips += 1;
    lastSkipAt = now;
  }

  function markUserInput(event) {
    if (!event.isTrusted) return;
    lastUserInputAt = performance.now();
    automaticNavigation = false;
  }

  function markNavigation() {
    automaticNavigation = performance.now() - lastUserInputAt > USER_INPUT_WINDOW_MS;
  }

  function stop() {
    stopped = true;
    observer.disconnect();
    watch.clear();
    player.render(null, showAnyway);
  }

  function stopIfOrphaned() {
    if (!stopped && !chrome.runtime?.id) stop();
    return stopped;
  }

  function render() {
    scheduled = false;
    if (stopIfOrphaned()) return;
    reportCount(tiles.apply(decideVideo, decideChannel));
    watch.render(currentVideo(), state.blocklist, toggleChannel);
    watch.renderChannel(currentChannel(), state.blocklist, toggleChannel);
    const blocked = blockedVideo();
    if (blocked) skipIfAutomatic(blocked);
    player.render(blocked, showAnyway);
  }

  function schedule() {
    if (scheduled || stopped) return;
    scheduled = true;
    requestAnimationFrame(render);
  }

  async function reload() {
    state = await store.load();
    i18n.setLanguage(state.settings.language);
    schedule();
  }

  const observer = new MutationObserver(schedule);
  const ready = reload();

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== 'aiblock' || stopIfOrphaned()) return;
    const { tiles: tileInfos, channels, watch: watchInfo, player: playerInfo } = event.data;
    tileInfos?.forEach(remember);
    channels?.forEach(rememberChannel);
    remember(playerInfo);
    if (watchInfo) {
      remember(watchInfo);
      ready.then(() => learnChannel(watchInfo.videoId));
    }
    schedule();
  });

  for (const type of ['pointerdown', 'click', 'keydown']) document.addEventListener(type, markUserInput, true);
  window.addEventListener('popstate', markUserInput, true);
  document.addEventListener('yt-navigate-start', markNavigation);
  document.addEventListener('yt-navigate-finish', schedule);
  player.guardPlayback(() => blockedVideo() !== null);
  store.onChange(reload);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
