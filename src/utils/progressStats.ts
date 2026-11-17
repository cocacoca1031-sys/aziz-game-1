import type { TrackedGame } from '../types/gaming';

export interface GameProgressSummary {
  totalItems: number;
  completedItems: number;
  overallCompletionPct: number;
  storyTotal: number;
  storyCompleted: number;
  storyCompletionPct: number;
  totalAchievements: number;
  unlockedAchievements: number;
}

export interface PortfolioProgressSummary {
  activeGamesCount: number;
  completedGamesCount: number;
  averageCompletionPct: number;
  totalHoursPlayed: number;
  totalUnlockedAchievements: number;
  totalAchievements: number;
}

export function calculateGameProgress(game: TrackedGame): GameProgressSummary {
  const items = game.items ?? [];
  const totalItems = items.length;
  const completedItems = items.filter((item) => item.completed).length;

  const storyItems = items.filter((item) => item.type === 'story');
  const storyTotal = storyItems.length;
  const storyCompleted = storyItems.filter((item) => item.completed).length;

  const achievementItems = items.filter((item) => item.type === 'achievement');
  const totalAchievements = achievementItems.length;
  const unlockedAchievements = achievementItems.filter((item) => item.completed).length;

  const overallCompletionPct =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const storyCompletionPct =
    storyTotal > 0 ? Math.round((storyCompleted / storyTotal) * 100) : overallCompletionPct;

  return {
    totalItems,
    completedItems,
    overallCompletionPct,
    storyTotal,
    storyCompleted,
    storyCompletionPct,
    totalAchievements,
    unlockedAchievements,
  };
}

export function calculatePortfolioStats(games: TrackedGame[]): PortfolioProgressSummary {
  if (games.length === 0) {
    return {
      activeGamesCount: 0,
      completedGamesCount: 0,
      averageCompletionPct: 0,
      totalHoursPlayed: 0,
      totalUnlockedAchievements: 0,
      totalAchievements: 0,
    };
  }

  let totalCompletion = 0;
  let completedGamesCount = 0;
  let totalHoursPlayed = 0;
  let totalUnlockedAchievements = 0;
  let totalAchievements = 0;

  for (const game of games) {
    const summary = calculateGameProgress(game);
    totalCompletion += summary.storyCompletionPct;
    if (summary.overallCompletionPct === 100 && summary.totalItems > 0) {
      completedGamesCount += 1;
    }
    totalHoursPlayed += Math.max(0, game.hoursPlayed);
    totalUnlockedAchievements += summary.unlockedAchievements;
    totalAchievements += summary.totalAchievements;
  }

  return {
    activeGamesCount: games.length,
    completedGamesCount,
    averageCompletionPct: Math.round(totalCompletion / games.length),
    totalHoursPlayed: Math.round(totalHoursPlayed * 10) / 10,
    totalUnlockedAchievements,
    totalAchievements,
  };
}

export function toggleGameItem(
  games: TrackedGame[],
  gameId: string,
  itemId: string
): TrackedGame[] {
  const now = new Date().toISOString();
  return games.map((game) => {
    if (game.id !== gameId) return game;
    return {
      ...game,
      lastUpdated: now,
      items: game.items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ),
    };
  });
}

export function addGameHours(
  games: TrackedGame[],
  gameId: string,
  deltaHours: number
): TrackedGame[] {
  const now = new Date().toISOString();
  return games.map((game) => {
    if (game.id !== gameId) return game;
    const nextHours = Math.max(0, Math.round((game.hoursPlayed + deltaHours) * 10) / 10);
    return {
      ...game,
      hoursPlayed: nextHours,
      lastUpdated: now,
    };
  });
}

export function removeTrackedGame(
  games: TrackedGame[],
  gameId: string
): TrackedGame[] {
  return games.filter((game) => game.id !== gameId);
}
