import test from 'node:test';
import assert from 'node:assert/strict';
import type { GameGuide } from '../types/gaming';
import {
  buildGuideBriefingScript,
  calculateGuideProgress,
  filterGameGuides,
  getUniqueGuideGames,
  removeGameGuide,
  toggleGuideBookmark,
  toggleGuideStep,
} from './guideFilter';

const SAMPLE_GUIDES: GameGuide[] = [
  {
    id: 'g-1',
    title: 'Scadutree Blessing Optimal Route',
    gameTitle: 'Elden Ring',
    category: 'Secrets & Collectibles',
    difficulty: 'Intermediate',
    estimatedMinutes: 20,
    summary: 'Collect early Scadutree Fragments before fighting Rellana.',
    prerequisites: ['Defeat Mohg, Lord of Blood'],
    missableWarnings: ['Advancing to Shadow Keep breaks NPC quests.'],
    steps: [
      {
        id: 's-1',
        stepNumber: 1,
        title: 'Gravesite Plain Church',
        detail: 'Grab two fragments at the Church of Consolation.',
        location: 'Southeast Gravesite Plain',
        completed: true,
      },
      {
        id: 's-2',
        stepNumber: 2,
        title: 'Castle Front Cross',
        detail: 'Loot the fragment beside Miquella Cross before Castle Ensis.',
        location: 'Castle Front Site of Grace',
        completed: false,
      },
    ],
    proTips: ['Reach Blessing +5 before Castle Ensis.'],
    bookmarked: true,
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
  {
    id: 'g-2',
    title: 'Deflection & Mikiri Mastery',
    gameTitle: 'Sekiro: Shadows Die Twice',
    category: 'Mechanics & Combat',
    difficulty: 'Beginner',
    estimatedMinutes: 15,
    summary: 'Master posture damage and perilous thrust counters.',
    prerequisites: ['Unlock Mikiri Counter skill'],
    missableWarnings: [],
    steps: [
      {
        id: 's-3',
        stepNumber: 1,
        title: 'Practice with Hanbei',
        detail: 'Drill consecutive deflect timing without spamming guard.',
        completed: false,
      },
    ],
    proTips: ['Watch the blade flash, not the kanji symbol.'],
    bookmarked: false,
    updatedAt: '2026-11-17T00:00:00.000Z',
  },
];

test('filterGameGuides filters by query, category, and bookmarked flag', () => {
  assert.equal(filterGameGuides(SAMPLE_GUIDES, '').length, 2);
  assert.equal(filterGameGuides(SAMPLE_GUIDES, 'Scadutree').length, 1);
  assert.equal(filterGameGuides(SAMPLE_GUIDES, '', 'Mechanics & Combat').length, 1);
  assert.equal(filterGameGuides(SAMPLE_GUIDES, '', 'All', true).length, 1);
  assert.equal(filterGameGuides(SAMPLE_GUIDES, 'Hanbei', 'Mechanics & Combat').length, 1);
  assert.equal(getUniqueGuideGames(SAMPLE_GUIDES).join(', '), 'Elden Ring, Sekiro: Shadows Die Twice');
});

test('toggleGuideStep and calculateGuideProgress update step completion accurately', () => {
  const initial = calculateGuideProgress(SAMPLE_GUIDES[0]);
  assert.deepEqual(initial, { completedCount: 1, totalCount: 2, percent: 50 });

  const updated = toggleGuideStep(SAMPLE_GUIDES, 'g-1', 's-2');
  const nextProgress = calculateGuideProgress(updated[0]);
  assert.deepEqual(nextProgress, { completedCount: 2, totalCount: 2, percent: 100 });
});

test('toggleGuideBookmark, removeGameGuide, and buildGuideBriefingScript behave cleanly', () => {
  const toggled = toggleGuideBookmark(SAMPLE_GUIDES, 'g-2');
  assert.equal(toggled[1].bookmarked, true);

  const remaining = removeGameGuide(toggled, 'g-1');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'g-2');

  const script = buildGuideBriefingScript(SAMPLE_GUIDES[0]);
  assert.ok(script.includes('Scadutree Blessing Optimal Route'));
  assert.ok(script.includes('Step 1: Gravesite Plain Church'));
});
