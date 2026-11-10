(function (root) {
  const { blockedChannelText } = root.AiBlockWatch;
  const i18n = root.AiBlockI18n;
  const OVERLAY_ID = 'aiblock-overlay';
  const WATCH_PLAYER_ID = 'movie_player';
  const SHORTS_PLAYER_ID = 'shorts-player';

  function playerId() {
    return location.pathname.startsWith('/shorts/') ? SHORTS_PLAYER_ID : WATCH_PLAYER_ID;
  }

  function playerVideo() {
    return document.querySelector(`#${playerId()} video`);
  }

  function removeOverlay() {
    document.getElementById(OVERLAY_ID)?.remove();
  }

  function reasonOf(video) {
    if (video.aiLabel) return i18n.t('videoAiLabelled');
    return blockedChannelText(video.name);
  }

  function overlayKey(video) {
    return `${video.videoId}|${i18n.language()}`;
  }

  function buildOverlay(video, onShowAnyway) {
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.dataset.key = overlayKey(video);
    overlay.addEventListener('click', (event) => event.stopPropagation());

    const title = document.createElement('strong');
    title.textContent = i18n.t('videoBlocked');

    const reason = document.createElement('span');
    reason.textContent = reasonOf(video);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = i18n.t('showAnyway');
    button.addEventListener('click', () => {
      onShowAnyway(video);
      removeOverlay();
      playerVideo()?.play();
    });

    overlay.append(title, reason, button);
    return overlay;
  }

  function render(blockedVideo, onShowAnyway) {
    if (!blockedVideo) {
      removeOverlay();
      return;
    }
    playerVideo()?.pause();
    const player = document.getElementById(playerId());
    if (!player) return;
    const existing = document.getElementById(OVERLAY_ID);
    if (existing?.dataset.key === overlayKey(blockedVideo) && existing.parentElement === player) return;
    removeOverlay();
    player.append(buildOverlay(blockedVideo, onShowAnyway));
  }

  function guardPlayback(isBlocked) {
    const pauseIfBlocked = (event) => {
      const target = event.target;
      if (target instanceof HTMLVideoElement && target.closest(`#${playerId()}`) && isBlocked()) target.pause();
    };
    document.addEventListener('play', pauseIfBlocked, true);
    document.addEventListener('playing', pauseIfBlocked, true);
  }

  function skipToNext() {
    const next = document.querySelector(`#${WATCH_PLAYER_ID} .ytp-next-button`);
    if (!next || next.getAttribute('aria-disabled') === 'true' || next.offsetParent === null) return false;
    next.click();
    return true;
  }

  root.AiBlockPlayer = { render, guardPlayback, skipToNext };
})(globalThis);
