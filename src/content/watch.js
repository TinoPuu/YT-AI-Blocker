(function (root) {
  const i18n = root.AiBlockI18n;
  const BAR_ID = 'aiblock-bar';
  const CHANNEL_BAR_ID = 'aiblock-channel-bar';

  function removeBar() {
    document.getElementById(BAR_ID)?.remove();
  }

  function removeChannelBar() {
    document.getElementById(CHANNEL_BAR_ID)?.remove();
  }

  function blockedChannelText(name) {
    return name ? i18n.t('channelBlockedNamed', { name }) : i18n.t('channelBlocked');
  }

  function buildBar(id, subject, blocked, onToggle) {
    const bar = document.createElement('div');
    bar.id = id;
    bar.className = 'aiblock-bar';

    const text = document.createElement('span');
    const parts = [];
    if (subject.aiLabel) parts.push(i18n.t('aiLabelNotice'));
    if (blocked) parts.push(blockedChannelText(subject.name));
    text.textContent = parts.join(' ');

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = i18n.t(blocked ? 'unmarkChannel' : 'markChannel');
    button.addEventListener('click', onToggle);

    bar.append(text, button);
    bar.classList.toggle('aiblock-bar--warning', subject.aiLabel || blocked);
    return bar;
  }

  function render(video, blocklist, onToggle) {
    if (location.pathname !== '/watch' || !video?.channelId) {
      removeBar();
      return;
    }
    const anchor = document.querySelector('ytd-watch-metadata');
    if (!anchor) return;

    const blocked = Boolean(blocklist[video.channelId]);
    const key = `${video.videoId}|${video.channelId}|${blocked}|${video.aiLabel}|${i18n.language()}`;
    const existing = document.getElementById(BAR_ID);
    if (existing?.dataset.key === key && existing.nextElementSibling === anchor) return;

    removeBar();
    const bar = buildBar(BAR_ID, video, blocked, () => onToggle(video, blocked));
    bar.dataset.key = key;
    anchor.parentElement.insertBefore(bar, anchor);
  }

  function renderChannel(channel, blocklist, onToggle) {
    if (!channel || !document.body) {
      removeChannelBar();
      return;
    }
    const blocked = Boolean(blocklist[channel.channelId]);
    const key = `${channel.channelId}|${channel.name}|${blocked}|${i18n.language()}`;
    if (document.getElementById(CHANNEL_BAR_ID)?.dataset.key === key) return;

    removeChannelBar();
    const bar = buildBar(CHANNEL_BAR_ID, { ...channel, aiLabel: false }, blocked, () => onToggle(channel, blocked));
    bar.classList.add('aiblock-bar--floating');
    bar.dataset.key = key;
    document.body.append(bar);
  }

  function clear() {
    removeBar();
    removeChannelBar();
  }

  root.AiBlockWatch = { render, renderChannel, clear, blockedChannelText };
})(globalThis);
