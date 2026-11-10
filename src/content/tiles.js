(function (root) {
  const { isChannelId } = typeof module === 'object' && module.exports ? require('../lib/rules.js') : root.AiBlockRules;
  const PLAYLIST_ENTRY_SELECTOR = 'ytd-playlist-video-renderer';
  const TILE_SELECTOR = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-playlist-video-renderer',
    'ytd-reel-item-renderer',
    'yt-lockup-view-model',
    'ytm-shorts-lockup-view-model',
    'ytm-shorts-lockup-view-model-v2',
    'a.ytp-videowall-still',
    'a.ytp-modern-videowall-still',
    '.ytp-ce-video',
  ].join(',');
  const LINK_SELECTOR = 'a[href*="/watch?v="], a[href^="/shorts/"]';
  const CHANNEL_TILE_SELECTOR = 'ytd-channel-renderer';
  const CHANNEL_LINK_SELECTOR = 'a[href^="/@"], a[href^="/channel/"]';
  const HIDDEN_ATTRIBUTE = 'data-aiblock-hidden';
  const YOUTUBE_ORIGIN = 'https://www.youtube.com';

  function parse(href) {
    if (!href) return null;
    try {
      return new URL(href, YOUTUBE_ORIGIN);
    } catch {
      return null;
    }
  }

  function videoIdFromHref(href) {
    const url = parse(href);
    if (!url) return null;
    if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || null;
    if (url.pathname === '/watch') return url.searchParams.get('v');
    return null;
  }

  function handleKey(segment) {
    try {
      return decodeURIComponent(segment).toLowerCase();
    } catch {
      return segment.toLowerCase();
    }
  }

  function channelKeyFromHref(href) {
    const url = parse(href);
    if (!url) return null;
    const [first, second] = url.pathname.split('/').filter(Boolean);
    if (first === 'channel') return isChannelId(second) ? second : null;
    if (first?.startsWith('@') && first.length > 1) return handleKey(first);
    return null;
  }

  function tileVideoIdFromHref(href, isPlaylistEntry) {
    if (!isPlaylistEntry && parse(href)?.searchParams.has('list')) return null;
    return videoIdFromHref(href);
  }

  function videoIdOf(tile) {
    const isPlaylistEntry = tile.matches(PLAYLIST_ENTRY_SELECTOR);
    const links = tile.matches(LINK_SELECTOR) ? [tile] : tile.querySelectorAll(LINK_SELECTOR);
    for (const link of links) {
      const videoId = tileVideoIdFromHref(link.getAttribute('href'), isPlaylistEntry);
      if (videoId) return videoId;
    }
    return null;
  }

  function channelKeyOf(tile) {
    return channelKeyFromHref(tile.querySelector(CHANNEL_LINK_SELECTOR)?.getAttribute('href'));
  }

  function containerOf(tile) {
    return tile.closest('ytd-rich-item-renderer') ?? tile;
  }

  function setHidden(container, hide, hidden) {
    if (hide) hidden.add(container);
    if (hide !== container.hasAttribute(HIDDEN_ATTRIBUTE)) {
      container.toggleAttribute(HIDDEN_ATTRIBUTE, hide);
    }
  }

  function apply(decideForVideo, decideForChannel) {
    const hidden = new Set();
    for (const tile of document.querySelectorAll(TILE_SELECTOR)) {
      const videoId = videoIdOf(tile);
      if (videoId) setHidden(containerOf(tile), decideForVideo(videoId) === 'hide', hidden);
    }
    for (const tile of document.querySelectorAll(CHANNEL_TILE_SELECTOR)) {
      const channelKey = channelKeyOf(tile);
      if (channelKey) setHidden(tile, decideForChannel(channelKey) === 'hide', hidden);
    }
    return hidden.size;
  }

  const api = { apply, videoIdFromHref, tileVideoIdFromHref, channelKeyFromHref };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AiBlockTiles = api;
})(globalThis);
