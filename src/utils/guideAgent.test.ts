import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendGuideAgentTurn,
  buildInitializationPrompt,
  createDefaultGuideAgentState,
  needsInitialGameScope,
  normalizeHintPreference,
  parseBoldMarkdownSegments,
} from './guideAgent.ts';

test('needsInitialGameScope triggers initialization when game is unset and prompt is vague', () => {
  assert.equal(needsInitialGameScope('hello', '', false), true);
  assert.equal(needsInitialGameScope('i am stuck', '', false), true);
  assert.equal(needsInitialGameScope('i am stuck', 'Elden Ring', false), false);
  assert.equal(needsInitialGameScope('How do I beat Margit in Elden Ring?', '', false), false);
  assert.equal(needsInitialGameScope('help', '', true), false);
  assert.ok(buildInitializationPrompt().includes('**Game Title**'));
});

test('appendGuideAgentTurn captures detected game, progress, and deduplicates milestones', () => {
  const initial = createDefaultGuideAgentState();
  const userMsg = {
    id: 'u1',
    role: 'user' as const,
    content: 'Just beat Margit in Elden Ring, where next?',
    timestamp: '2026-11-18T00:01:00.000Z',
  };
  const agentMsg = {
    id: 'a1',
    role: 'agent' as const,
    content: 'Nice win against **Margit**. Head into **Stormveil Castle**.',
    milestoneCompleted: 'Defeated Margit, the Fell Omen',
    timestamp: '2026-11-18T00:01:05.000Z',
  };

  const next = appendGuideAgentTurn(initial, userMsg, agentMsg, {
    detectedGame: 'Elden Ring',
    detectedProgress: 'Stormveil Castle Main Gate',
    milestoneCompleted: 'Defeated Margit, the Fell Omen',
  });

  assert.equal(next.gameTitle, 'Elden Ring');
  assert.equal(next.currentProgress, 'Stormveil Castle Main Gate');
  assert.deepEqual(next.milestones, ['Defeated Margit, the Fell Omen']);
  assert.equal(next.messages.length, 3);

  const duplicateTurn = appendGuideAgentTurn(next, userMsg, agentMsg, {
    milestoneCompleted: 'defeated margit, the fell omen',
  });
  assert.equal(duplicateTurn.milestones.length, 1);
  assert.equal(normalizeHintPreference('hint'), 'hint');
  assert.equal(normalizeHintPreference('invalid'), 'auto');
});

test('parseBoldMarkdownSegments splits bold terms safely without stripping text', () => {
  const segments = parseBoldMarkdownSegments('Equip **Mimic Tear** at **Elphael** now.');
  assert.deepEqual(segments, [
    { text: 'Equip ', bold: false },
    { text: 'Mimic Tear', bold: true },
    { text: ' at ', bold: false },
    { text: 'Elphael', bold: true },
    { text: ' now.', bold: false },
  ]);
});
