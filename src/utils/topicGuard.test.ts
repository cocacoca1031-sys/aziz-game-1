import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STRICT_REFUSAL,
  hasGamingSignal,
  isDefinitelyOffTopic,
  normalizeAgentReply,
} from './topicGuard';

test('rejects pure math, cooking, politics, and non-gaming coding queries', () => {
  assert.equal(isDefinitelyOffTopic('What is 24 * 17?'), true);
  assert.equal(isDefinitelyOffTopic('42 + 99'), true);
  assert.equal(isDefinitelyOffTopic('How do I bake chocolate chip cookies?'), true);
  assert.equal(isDefinitelyOffTopic('Who won the last election in congress?'), true);
  assert.equal(isDefinitelyOffTopic('Write a SQL query to join two tables'), true);
  assert.equal(isDefinitelyOffTopic('What is the capital of France?'), true);
});

test('allows video game, boss, loadout, hardware, and achievement queries', () => {
  assert.equal(isDefinitelyOffTopic('How do I dodge Malenia Waterfowl Dance in Elden Ring?'), false);
  assert.equal(isDefinitelyOffTopic('Best GPU for 1440p 144Hz gaming'), false);
  assert.equal(isDefinitelyOffTopic('How to unlock Pure Nail achievement in Hollow Knight?'), false);
  assert.equal(isDefinitelyOffTopic('Calculate DPS for my Factorio turret build'), false);
  assert.equal(hasGamingSignal('What is the best PS5 DualSense controller setting?'), true);
});

test('normalizes refusal variations exclusively to the strict refusal string', () => {
  const exact = normalizeAgentReply("I don't have knowledge about this subject.");
  assert.equal(exact.isRefusal, true);
  assert.equal(exact.text, STRICT_REFUSAL);

  const byFlag = normalizeAgentReply('Sorry, I cannot help with cooking.', 'REFUSAL');
  assert.equal(byFlag.isRefusal, true);
  assert.equal(byFlag.text, STRICT_REFUSAL);

  const valid = normalizeAgentReply('Use Dodge Roll into her second flurry.');
  assert.equal(valid.isRefusal, false);
  assert.equal(valid.text, 'Use Dodge Roll into her second flurry.');
});
