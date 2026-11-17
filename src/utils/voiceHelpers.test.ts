import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VOICE_PRESET,
  buildBossBriefingScript,
  getSpeechSynthesisProfile,
  normalizeVoiceName,
  sanitizeSpeechText,
} from './voiceHelpers';
import type { BossGuide } from '../types/gaming';

test('normalizeVoiceName falls back to default for unknown voices', () => {
  assert.equal(normalizeVoiceName('Kore'), 'Kore');
  assert.equal(normalizeVoiceName('Charon'), 'Charon');
  assert.equal(normalizeVoiceName('InvalidVoice'), DEFAULT_VOICE_PRESET);
  assert.equal(normalizeVoiceName(undefined), DEFAULT_VOICE_PRESET);
});

test('sanitizeSpeechText strips markdown artifacts and respects max length', () => {
  const raw = '**Phase 1:** *Dodge* into `Waterfowl` #1.\n\nUse Frost pots!';
  assert.equal(
    sanitizeSpeechText(raw),
    'Phase 1: Dodge into Waterfowl 1. Use Frost pots!'
  );

  const longText = 'Sentence one ends here. '.repeat(20);
  const capped = sanitizeSpeechText(longText, 90);
  assert.ok(capped.length <= 90);
  assert.ok(capped.endsWith('.'));
});

test('buildBossBriefingScript formats phases, evade tip, and weapon cleanly', () => {
  const sampleGuide: BossGuide = {
    id: 'test-boss',
    bossName: 'Lace',
    gameTitle: 'Hollow Knight: Silksong',
    genre: 'Metroidvania',
    difficulty: 'Hard',
    arenaLocation: 'Deep Docks Forge Arena',
    weaknesses: ['Sting Shard Ground Traps'],
    summary: 'Agile needle duelist in Pharloom.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Needle Duel',
        hpThreshold: '100% - 50% HP',
        attackPatterns: ['Parry stance counters greedy slashes.'],
        safeWindows: ['Punish right after her forward lunge misses.'],
      },
    ],
    positioningTips: ['Hold center arena.'],
    dodgingTips: ['Jump over sweeping lunge rather than dashing backward.'],
    loadouts: [
      {
        playstyle: 'Aggressive Needle',
        weapon: 'Hornet’s Needle (Reaper Crest)',
        charmsOrRelics: ['Warding Bell'],
        skillsOrArts: ['Sting Shard'],
        defensiveGear: ['Fractured Mask'],
        consumables: [],
        rationale: 'Controls spacing.',
      },
    ],
  };

  const script = buildBossBriefingScript(sampleGuide);
  assert.ok(script.includes('Lace, from Hollow Knight: Silksong'));
  assert.ok(script.includes('Deep Docks Forge Arena'));
  assert.ok(script.includes('Phase 1, Needle Duel'));
  assert.ok(script.includes('Evade tip: Jump over sweeping lunge'));
  assert.ok(script.includes('Reaper Crest'));
});

test('getSpeechSynthesisProfile returns valid pitch and rate presets', () => {
  const fenrir = getSpeechSynthesisProfile('Fenrir');
  const puck = getSpeechSynthesisProfile('Puck');
  assert.ok(fenrir.pitch < 1 && fenrir.rate > 0.5);
  assert.ok(puck.pitch > fenrir.pitch && puck.rate > fenrir.rate);
});
