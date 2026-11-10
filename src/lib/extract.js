(function (root) {
  const AI_LABEL_HELP_ID = 'answer/15447836';
  const TILE_KEYS = new Set([
    'videoRenderer',
    'compactVideoRenderer',
    'gridVideoRenderer',
    'playlistVideoRenderer',
    'endScreenVideoRenderer',
    'reelItemRenderer',
    'lockupViewModel',
    'shortsLockupViewModel',
  ]);

  function findFirst(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const key in node) {
      const found = findFirst(node[key], predicate);
      if (found) return found;
    }
    return null;
  }

  function isChannelId(value) {
    return typeof value === 'string' && value.startsWith('UC');
  }

  function channelOf(tile) {
    const endpointHolder = findFirst(tile, (o) => isChannelId(o.browseEndpoint?.browseId));
    if (!endpointHolder) return { channelId: null, name: null };
    const channelId = endpointHolder.browseEndpoint.browseId;
    const run = findFirst(
      tile,
      (o) => typeof o.text === 'string' && o.navigationEndpoint?.browseEndpoint?.browseId === channelId,
    );
    const name = run?.text ?? endpointHolder.browseEndpoint.canonicalBaseUrl ?? null;
    return { channelId, name };
  }

  function videoIdOf(key, tile) {
    if (key === 'lockupViewModel') {
      return tile.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO' ? tile.contentId ?? null : null;
    }
    if (key === 'shortsLockupViewModel') {
      return findFirst(tile, (o) => typeof o.reelWatchEndpoint?.videoId === 'string')?.reelWatchEndpoint.videoId ?? null;
    }
    return typeof tile.videoId === 'string' ? tile.videoId : null;
  }

  function scan(json) {
    const found = { tiles: [], channelRenderers: [], madeSections: [], owner: null };
    const walk = (node) => {
      for (const key in node) {
        const child = node[key];
        if (!child || typeof child !== 'object') continue;
        if (TILE_KEYS.has(key)) {
          const videoId = videoIdOf(key, child);
          if (videoId) found.tiles.push({ videoId, ...channelOf(child), aiLabel: false });
          continue;
        }
        if (key === 'channelRenderer') found.channelRenderers.push(child);
        else if (key === 'howThisWasMadeSectionViewModel') found.madeSections.push(child);
        else if (key === 'videoOwnerRenderer') found.owner ??= child;
        walk(child);
      }
    };
    if (json && typeof json === 'object') walk(json);
    return found;
  }

  function isAiSection(section) {
    return JSON.stringify(section).includes(AI_LABEL_HELP_ID);
  }

  function watchOf(json, found) {
    const videoId = json?.currentVideoEndpoint?.watchEndpoint?.videoId;
    if (!videoId) return null;
    const channelId = found.owner?.navigationEndpoint?.browseEndpoint?.browseId ?? null;
    const name = found.owner?.title?.runs?.[0]?.text ?? null;
    return {
      videoId,
      channelId: isChannelId(channelId) ? channelId : null,
      name,
      aiLabel: found.madeSections.some(isAiSection),
    };
  }

  function channelsOf(json, found) {
    const channels = [];
    const metadata = json?.metadata?.channelMetadataRenderer;
    if (isChannelId(metadata?.externalId)) {
      channels.push({
        channelId: metadata.externalId,
        name: metadata.title ?? null,
        url: metadata.vanityChannelUrl ?? null,
      });
    }
    for (const renderer of found.channelRenderers) {
      if (!isChannelId(renderer.channelId)) continue;
      channels.push({
        channelId: renderer.channelId,
        name: renderer.title?.simpleText ?? null,
        url: renderer.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl ?? null,
      });
    }
    return channels;
  }

  function extractPage(json) {
    const found = scan(json);
    return { tiles: found.tiles, channels: channelsOf(json, found), watch: watchOf(json, found) };
  }

  function extractPlayer(json) {
    const details = json?.videoDetails;
    if (!details?.videoId) return null;
    return {
      videoId: details.videoId,
      channelId: isChannelId(details.channelId) ? details.channelId : null,
      name: details.author ?? null,
      aiLabel: false,
    };
  }

  const api = {
    extractPage,
    extractPlayer,
    extractTiles: (json) => scan(json).tiles,
    extractWatch: (json) => watchOf(json, scan(json)),
    extractChannels: (json) => channelsOf(json, scan(json)),
    hasAiLabel: (json) => scan(json).madeSections.some(isAiSection),
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AiBlockExtract = api;
})(globalThis);
