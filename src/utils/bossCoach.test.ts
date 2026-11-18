import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendBossCoachTurn,
  createDefaultBossCoachState,
  formatCoachLines,
  formatPhaseLabel,
  isDeathReport,
  isFullBreakdownRequest,
  normalizePhaseCap,
  parseCoachInlineSegments,
} from './bossCoach.ts';

test('normalizePhaseCap, formatPhaseLabel, and detection helpers behave cleanly', () => {
  assert.equal(normalizePhaseCap('phase2'), 'phase2');
  assert.equal(normalizePhaseCap('unknown'), 'phase1');
  assert.equal(formatPhaseLabel('phase1'), 'Phase 1 Only');
  assert.equal(formatPhaseLabel('full'), 'Full Fight Breakdown');

  assert.equal(isDeathReport('I keep getting one-shot by the fire sweep'), true);
  assert.equal(isDeathReport('Give me quick prep for Malenia'), false);
  assert.equal(isFullBreakdownRequest('Give me a full fight breakdown please'), true);
});

test('appendBossCoachTurn updates boss/game detection and increments attempt counter on death reports', () => {
  const initial = createDefaultBossCoachState();
  const u1 = {
    id: 'u1',
    role: 'user' as const,
    content: 'I keep getting killed by the delayed overhead slam in Malenia Phase 1',
    timestamp: '2026-11-18T00:01:00.000Z',
  };
  const a1 = {
    id: 'a1',
    role: 'agent' as const,
    content: '**The Telegraph:** Arm pauses upright...',
    isDeathDiagnosis: true,
    phaseUsed: 'phase1' as const,
    timestamp: '2026-11-18T00:01:02.000Z',
  };

  const next = appendBossCoachTurn(initial, u1, a1, {
    detectedBoss: 'Malenia, Blade of Miquella',
    detectedGame: 'Elden Ring',
    isDeathDiagnosis: true,
  });

  assert.equal(next.bossName, 'Malenia, Blade of Miquella');
  assert.equal(next.gameTitle, 'Elden Ring');
  assert.equal(next.attemptsLogged, 1);
  assert.equal(next.messages.length, 3);
});

test('formatCoachLines and parseCoachInlineSegments render bold/italic segments and clean line breaks', () => {
  const raw = '**Quick Prep:** Use pot. **#1 Rule to Survive:** Stay light. *Telegraph* -> *Counter*';
  const lines = formatCoachLines(raw);
  assert.equal(lines.length, 2);
  assert.equal(lines[1].startsWith('**#1 Rule to Survive:**'), true);

  const segments = parseCoachInlineSegments('**Waterfowl Dance:** *Telegraph* -> Dodge');
  assert.deepEqual(segments, [
    { text: 'Waterfowl Dance:', bold: true, italic: false },
    { text: ' ', bold: false, italic: false },
    { text: 'Telegraph', bold: false, italic: true },
    { text: ' -> Dodge', bold: false, italic: false },
  ]);
});

