const test = require('node:test');
const assert = require('node:assert/strict');
const i18n = require('../src/lib/i18n.js');

test('both languages define the same messages', () => {
  assert.deepEqual(Object.keys(i18n.MESSAGES.fi).sort(), Object.keys(i18n.MESSAGES.en).sort());
});

test('explicit language setting wins and unknown settings fall back to the browser language', () => {
  assert.equal(i18n.resolveLanguage('fi'), 'fi');
  assert.equal(i18n.resolveLanguage('en'), 'en');
  assert.ok(['fi', 'en'].includes(i18n.resolveLanguage('auto')));
  assert.ok(['fi', 'en'].includes(i18n.resolveLanguage('sv')));
});

test('messages fill in their parameters in the chosen language', () => {
  i18n.setLanguage('fi');
  assert.equal(i18n.t('removed', { name: 'Ink Theory' }), 'Ink Theory poistettu estolistalta.');
  i18n.setLanguage('en');
  assert.equal(i18n.t('removed', { name: 'Ink Theory' }), 'Ink Theory removed from blocklist.');
  assert.equal(i18n.locale(), 'en-GB');
});

test('unknown keys fall back to the key itself', () => {
  assert.equal(i18n.t('noSuchKey'), 'noSuchKey');
});
