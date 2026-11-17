import test from 'node:test';
import assert from 'node:assert/strict';
import type { BossGuide } from '../types/gaming';
import { filterBossGuides, getUniqueGames, removeBossGuide } from './bossFilter';

const guides: BossGuide[] = [
  {
    id: 'b1',
    bossName: 'Malenia, Blade of Miquella',
    gameTitle: 'Elden Ring',
    genre: 'Action RPG',
    difficulty: 'Nightmare',
    arenaLocation: 'Elphael, Brace of the Haligtree',
    weaknesses: ['Frostbite', 'Hemorrhage'],
    summary: 'Relentless lifesteal duelist.',
    phases: [],
    positioningTips: [],
    dodgingTips: [],
    loadouts: [
      {
        playstyle: 'Aggressive Bleed',
        weapon: 'Rivers of Blood',
        charmsOrRelics: ['Lord of Blood Exultation'],
        skillsOrArts: ['Corpse Piler'],
        defensiveGear: ['Dragoncrest Greatshield Talisman'],
        consumables: ['Freezing Pot'],
        rationale: 'Interrupts Waterfowl Dance.',
      },
    ],
  },
  {
    id: 'b2',
    bossName: 'Nightmare King Grimm',
    gameTitle: 'Hollow Knight',
    genre: 'Metroidvania',
    difficulty: 'Extreme',
    summary: 'High-speed rhythm duel.',
    phases: [],
    positioningTips: [],
    dodgingTips: [],
    loadouts: [
      {
        playstyle: 'Nail DPS',
        weapon: 'Pure Nail',
        charmsOrRelics: ['Quick Slash', 'Unbreakable Strength'],
        skillsOrArts: ['Abyss Shriek'],
        defensiveGear: ['Sharp Shadow'],
        consumables: [],
        rationale: 'Maximizes punish windows.',
      },
    ],
  },
];

test('getUniqueGames returns sorted unique game titles', () => {
  assert.deepEqual(getUniqueGames(guides), ['Elden Ring', 'Hollow Knight']);
});

test('filterBossGuides filters by game title, difficulty, and ranked multi-token terms', () => {
  assert.equal(filterBossGuides(guides, '', 'All').length, 2);
  assert.equal(filterBossGuides(guides, '', 'Elden Ring').length, 1);
  assert.equal(filterBossGuides(guides, '', 'All', 'Extreme')[0].id, 'b2');
  assert.equal(filterBossGuides(guides, 'frostbite haligtree', 'All')[0].id, 'b1');
  assert.equal(filterBossGuides(guides, 'Quick Slash', 'All')[0].id, 'b2');
  assert.equal(filterBossGuides(guides, 'elden bleed', 'All')[0].id, 'b1');
  assert.equal(filterBossGuides(guides, 'waterfowl', 'Hollow Knight').length, 0);
});

test('removeBossGuide removes only the matching boss and updates game tabs', () => {
  const remaining = removeBossGuide(guides, 'b1');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'b2');
  assert.deepEqual(getUniqueGames(remaining), ['Hollow Knight']);

  const unchanged = removeBossGuide(remaining, 'non-existent');
  assert.equal(unchanged.length, 1);
});
