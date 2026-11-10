const test = require('node:test');
const assert = require('node:assert/strict');
const { videoIdFromHref, tileVideoIdFromHref, channelKeyFromHref } = require('../src/content/tiles.js');

test('playlist and mix links do not identify a feed tile', () => {
  assert.equal(tileVideoIdFromHref('/watch?v=firstVid001&list=RDfirstVid001&start_radio=1', false), null);
  assert.equal(tileVideoIdFromHref('/watch?v=SD7XyG2wd1k', false), 'SD7XyG2wd1k');
});

test('playlist entry links keep their video id', () => {
  assert.equal(tileVideoIdFromHref('/watch?v=SD7XyG2wd1k&list=PLexample&index=2', true), 'SD7XyG2wd1k');
});

test('channel id link yields the channel id', () => {
  assert.equal(channelKeyFromHref('/channel/UCexampleAiChannel000000/videos'), 'UCexampleAiChannel000000');
});

test('handle link yields a lowercase decoded handle', () => {
  assert.equal(channelKeyFromHref('/@ExampleAI/shorts'), '@exampleai');
  assert.equal(channelKeyFromHref('http://www.youtube.com/@ExampleAI'), '@exampleai');
  assert.equal(channelKeyFromHref('/@%C3%84%C3%A4ni'), '@ääni');
});

test('non-channel links yield no channel key', () => {
  assert.equal(channelKeyFromHref('/watch?v=SD7XyG2wd1k'), null);
  assert.equal(channelKeyFromHref('/channel/notAnId'), null);
  assert.equal(channelKeyFromHref('/@'), null);
  assert.equal(channelKeyFromHref(null), null);
});

test('watch link yields the video id', () => {
  assert.equal(videoIdFromHref('/watch?v=SD7XyG2wd1k&t=10s'), 'SD7XyG2wd1k');
});

test('shorts link yields the video id', () => {
  assert.equal(videoIdFromHref('/shorts/shortVid001'), 'shortVid001');
});

test('absolute end screen link yields the video id', () => {
  assert.equal(videoIdFromHref('https://www.youtube.com/watch?v=SD7XyG2wd1k'), 'SD7XyG2wd1k');
});

test('other links yield nothing', () => {
  assert.equal(videoIdFromHref('/@exampleai'), null);
  assert.equal(videoIdFromHref('/shorts/'), null);
  assert.equal(videoIdFromHref(null), null);
});
