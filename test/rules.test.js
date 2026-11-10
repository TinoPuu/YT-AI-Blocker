const test = require('node:test');
const assert = require('node:assert/strict');
const { decide } = require('../src/lib/rules.js');

const on = { enabled: true };
const blocklist = { UCblocked: { name: 'Blocked', addedAt: 0, source: 'manual' } };

test('labelled video is hidden', () => {
  assert.equal(decide({ channelId: 'UCother', aiLabel: true }, {}, on), 'hide');
});

test('video from a blocklisted channel is hidden', () => {
  assert.equal(decide({ channelId: 'UCblocked', aiLabel: false }, blocklist, on), 'hide');
});

test('other videos are shown', () => {
  assert.equal(decide({ channelId: 'UCother', aiLabel: false }, blocklist, on), 'show');
});

test('unknown video is shown', () => {
  assert.equal(decide(undefined, blocklist, on), 'show');
});

test('nothing is hidden when disabled', () => {
  assert.equal(decide({ channelId: 'UCblocked', aiLabel: true }, blocklist, { enabled: false }), 'show');
});

const { withChannelAdded, withChannelRemoved, withChannelRestored, withEnabled, withLanguage, mergeImported } =
  require('../src/lib/rules.js');

test('language setting accepts only known values', () => {
  const data = { blocklist, allowed: {}, settings: { enabled: true, language: 'auto' } };
  assert.equal(withLanguage(data, 'en').settings.language, 'en');
  assert.equal(withLanguage(data, 'sv'), data);
});

test('restoring a removed channel brings back its entry and clears the allowance', () => {
  const removed = withChannelRemoved({ blocklist, allowed: {}, settings: on }, 'UCblocked');
  const restored = withChannelRestored(removed, 'UCblocked', blocklist.UCblocked, 9);
  assert.deepEqual(restored.blocklist, blocklist);
  assert.deepEqual(restored.allowed, {});
});

test('toggling filtering keeps other settings and lists', () => {
  const data = { blocklist, allowed: { UCok: true }, settings: { enabled: true, extra: 1 } };
  assert.deepEqual(withEnabled(data, false), { ...data, settings: { enabled: false, extra: 1 } });
});

const empty = { blocklist: {}, allowed: {}, settings: on };
const entry = (name, source) => ({ name, addedAt: 5, source });

test('adding a channel stores its entry', () => {
  const next = withChannelAdded(empty, 'UCnew', 'New', 'label', 5);
  assert.deepEqual(next.blocklist, { UCnew: entry('New', 'label') });
});

test('adding a channel without a name falls back to the id', () => {
  assert.equal(withChannelAdded(empty, 'UCnew', null, 'manual', 5).blocklist.UCnew.name, 'UCnew');
});

test('adding an already blocked channel changes nothing', () => {
  const data = { ...empty, blocklist };
  assert.equal(withChannelAdded(data, 'UCblocked', 'Other name', 'label', 5), data);
});

test('removing a channel allows it', () => {
  const next = withChannelRemoved({ ...empty, blocklist }, 'UCblocked');
  assert.deepEqual(next.blocklist, {});
  assert.deepEqual(next.allowed, { UCblocked: true });
});

test('removing an unknown channel changes nothing', () => {
  assert.equal(withChannelRemoved(empty, 'UCother'), empty);
});

test('label does not re-add a removed channel', () => {
  const removed = withChannelRemoved({ ...empty, blocklist }, 'UCblocked');
  assert.equal(withChannelAdded(removed, 'UCblocked', 'Blocked', 'label', 5), removed);
});

test('manual add overrides an earlier removal', () => {
  const removed = withChannelRemoved({ ...empty, blocklist }, 'UCblocked');
  const next = withChannelAdded(removed, 'UCblocked', 'Blocked', 'manual', 5);
  assert.deepEqual(next.blocklist, { UCblocked: entry('Blocked', 'manual') });
  assert.deepEqual(next.allowed, {});
});

test('import adds new channels and keeps existing entries', () => {
  const data = { ...empty, blocklist };
  const next = mergeImported(
    data,
    { version: 1, blocklist: { UCblocked: entry('Renamed', 'label'), UCnew: entry('New', 'label') }, allowed: { UCok: true } },
    9,
  );
  assert.deepEqual(next.blocklist, { ...blocklist, UCnew: entry('New', 'label') });
  assert.deepEqual(next.allowed, { UCok: true });
});

test('import does not block a channel removed here', () => {
  const data = { ...empty, allowed: { UCok: true } };
  assert.equal(mergeImported(data, { blocklist: { UCok: entry('Ok', 'manual') } }, 9), data);
});

test('import skips invalid ids and repairs entry fields', () => {
  const next = mergeImported(
    empty,
    { blocklist: { notAChannel: entry('X', 'manual'), __proto__: entry('Y', 'manual'), UCraw: { name: 7, source: 'evil' } } },
    9,
  );
  assert.deepEqual(next.blocklist, { UCraw: { name: 'UCraw', addedAt: 9, source: 'manual' } });
});

test('import of malformed data changes nothing', () => {
  for (const imported of [null, 'text', [], { blocklist: [] }, { blocklist: 'x', allowed: 3 }]) {
    assert.equal(mergeImported(empty, imported, 9), empty);
  }
});
