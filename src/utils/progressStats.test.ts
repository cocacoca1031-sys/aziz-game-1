import test from 'node:test';
import assert from 'node:assert/strict';
import type { TrackedGame } from '../types/gaming';
import {
  addGameHours,
  calculateGameProgress,
  calculatePortfolioStats,
  removeTrackedGame,
  toggleGameItem,
} from './progressStats';

const sampleGames: TrackedGame[] = [
  {
    id: 'g1',
    title: 'Elden Ring',
    platform: 'PS5',
    genre: 'Action RPG',
    hoursPlayed: 64.5,
    lastUpdated: '2026-11-10T00:00:00Z',
    items: [
      { id: 'i1', title: 'Defeat Margit', type: 'story', completed: true },
      { id: 'i2', title: 'Defeat Radahn', type: 'story', completed: false },
      { id: 'a1', title: 'Shardbearer Godrick', type: 'achievement', completed: true },
      { id: 'a2', title: 'Elden Lord', type: 'achievement', completed: false },
    ],
  },
  {
    id: 'g2',
    title: 'Hollow Knight',
    platform: 'PC',
    genre: 'Metroidvania',
    hoursPlayed: 35.5,
    lastUpdated: '2026-11-11T00:00:00Z',
    items: [
      { id: 'i3', title: 'Reach City of Tears', type: 'story', completed: true },
      { id: 'a3', title: 'Pure Vessel', type: 'achievement', completed: true },
    ],
  },
];

test('calculateGameProgress computes story % and achievement counts accurately', () => {
  const g1 = calculateGameProgress(sampleGames[0]);
  assert.equal(g1.storyCompletionPct, 50);
  assert.equal(g1.overallCompletionPct, 50);
  assert.equal(g1.unlockedAchievements, 1);
  assert.equal(g1.totalAchievements, 2);

  const g2 = calculateGameProgress(sampleGames[1]);
  assert.equal(g2.storyCompletionPct, 100);
  assert.equal(g2.overallCompletionPct, 100);
  assert.equal(g2.unlockedAchievements, 1);
});

test('calculatePortfolioStats aggregates hours, completion, and achievements', () => {
  const stats = calculatePortfolioStats(sampleGames);
  assert.equal(stats.activeGamesCount, 2);
  assert.equal(stats.completedGamesCount, 1);
  assert.equal(stats.averageCompletionPct, 75);
  assert.equal(stats.totalHoursPlayed, 100);
  assert.equal(stats.totalUnlockedAchievements, 2);
  assert.equal(stats.totalAchievements, 3);
});

test('toggleGameItem and addGameHours update immutable state accurately', () => {
  const toggled = toggleGameItem(sampleGames, 'g1', 'i2');
  const g1After = calculateGameProgress(toggled[0]);
  assert.equal(g1After.storyCompletionPct, 100);
  assert.equal(g1After.overallCompletionPct, 75);

  const withHours = addGameHours(toggled, 'g1', 2.5);
  assert.equal(withHours[0].hoursPlayed, 67);
  const clamped = addGameHours(withHours, 'g1', -200);
  assert.equal(clamped[0].hoursPlayed, 0);
});

test('removeTrackedGame removes only the matching game and recalculates portfolio stats', () => {
  const afterRemove = removeTrackedGame(sampleGames, 'g1');
  assert.equal(afterRemove.length, 1);
  assert.equal(afterRemove[0].id, 'g2');

  const statsAfter = calculatePortfolioStats(afterRemove);
  assert.equal(statsAfter.activeGamesCount, 1);
  assert.equal(statsAfter.completedGamesCount, 1);
  assert.equal(statsAfter.totalHoursPlayed, 35.5);

  const unchanged = removeTrackedGame(afterRemove, 'missing-id');
  assert.equal(unchanged.length, 1);

  const empty = removeTrackedGame(afterRemove, 'g2');
  assert.equal(empty.length, 0);
  assert.equal(calculatePortfolioStats(empty).activeGamesCount, 0);
});
