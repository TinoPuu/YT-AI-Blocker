const test = require('node:test');
const assert = require('node:assert/strict');
const { extractPage, extractTiles, extractWatch, extractPlayer, extractChannels, hasAiLabel } = require('../src/lib/extract.js');
const labelFixture = require('./fixtures/watch-how-this-was-made-ai.json');
const searchFixture = require('./fixtures/search-video-renderer.json');

function watchPage(descriptionItems) {
  return {
    currentVideoEndpoint: { watchEndpoint: { videoId: 'SD7XyG2wd1k' } },
    contents: {
      twoColumnWatchNextResults: {
        results: {
          results: {
            contents: [
              {
                videoSecondaryInfoRenderer: {
                  owner: {
                    videoOwnerRenderer: {
                      title: { runs: [{ text: 'Example AI Channel' }] },
                      navigationEndpoint: { browseEndpoint: { browseId: 'UCexampleAiChannel000000' } },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
    engagementPanels: [
      {
        engagementPanelSectionListRenderer: {
          content: { structuredDescriptionContentRenderer: { items: descriptionItems } },
        },
      },
    ],
  };
}

const summaryItem = {
  expandableMetadataRenderer: {
    header: { expandedTitle: { simpleText: 'Tekoälyn luoma videoyhteenveto' } },
  },
};

test('watch page with the AI label yields aiLabel and the channel', () => {
  const watch = extractWatch(watchPage([summaryItem, labelFixture.item]));
  assert.deepEqual(watch, {
    videoId: 'SD7XyG2wd1k',
    channelId: 'UCexampleAiChannel000000',
    name: 'Example AI Channel',
    aiLabel: true,
  });
});

test('YouTube AI summary alone is not an AI label', () => {
  assert.equal(extractWatch(watchPage([summaryItem])).aiLabel, false);
});

test('how-this-was-made section without the AI help link is not an AI label', () => {
  const other = { howThisWasMadeSectionViewModel: { bodyHeader: { content: 'Captured with a camera' } } };
  assert.equal(hasAiLabel(watchPage([other])), false);
});

test('non-watch data yields no watch info', () => {
  assert.equal(extractWatch(searchFixture), null);
});

test('search tiles yield video and channel ids, playlists are skipped', () => {
  assert.deepEqual(extractTiles(searchFixture), [
    { videoId: 'SD7XyG2wd1k', channelId: 'UCexampleAiChannel000000', name: 'Example AI Channel', aiLabel: false },
    { videoId: 'lockupVid01', channelId: 'UClockupChannel000000000', name: null, aiLabel: false },
  ]);
});

test('channel page metadata yields the channel and its handle url', () => {
  const page = {
    metadata: {
      channelMetadataRenderer: {
        title: 'Example AI Channel',
        externalId: 'UCexampleAiChannel000000',
        vanityChannelUrl: 'http://www.youtube.com/@exampleai',
      },
    },
  };
  assert.deepEqual(extractChannels(page), [
    { channelId: 'UCexampleAiChannel000000', name: 'Example AI Channel', url: 'http://www.youtube.com/@exampleai' },
  ]);
});

test('search channel results yield channels', () => {
  const search = {
    contents: [
      {
        channelRenderer: {
          channelId: 'UCexampleAiChannel000000',
          title: { simpleText: 'Example AI Channel' },
          navigationEndpoint: { browseEndpoint: { browseId: 'UCexampleAiChannel000000', canonicalBaseUrl: '/@exampleai' } },
        },
      },
    ],
  };
  assert.deepEqual(extractChannels(search), [
    { channelId: 'UCexampleAiChannel000000', name: 'Example AI Channel', url: '/@exampleai' },
  ]);
  assert.deepEqual(extractChannels(searchFixture), []);
});

test('page extraction returns tiles, channels and watch info in one pass', () => {
  const page = extractPage(watchPage([labelFixture.item]));
  assert.deepEqual(page.tiles, []);
  assert.deepEqual(page.channels, []);
  assert.equal(page.watch.channelId, 'UCexampleAiChannel000000');
  assert.equal(page.watch.aiLabel, true);
  assert.deepEqual(extractPage(searchFixture).tiles, extractTiles(searchFixture));
});

test('player response yields the channel', () => {
  const player = extractPlayer({ videoDetails: { videoId: 'abc', channelId: 'UCx', author: 'X' } });
  assert.deepEqual(player, { videoId: 'abc', channelId: 'UCx', name: 'X', aiLabel: false });
});
