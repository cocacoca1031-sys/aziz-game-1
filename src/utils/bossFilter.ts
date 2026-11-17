import type { BossGuide } from '../types/gaming';

export function getUniqueGames(guides: BossGuide[]): string[] {
  const seen = new Set<string>();
  for (const guide of guides) {
    if (guide.gameTitle.trim()) {
      seen.add(guide.gameTitle.trim());
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

function scoreGuideMatch(guide: BossGuide, tokens: string[]): number {
  const bossLower = guide.bossName.toLowerCase();
  const gameLower = guide.gameTitle.toLowerCase();
  const fullPhrase = tokens.join(' ');

  const secondaryHaystack = [
    guide.genre,
    guide.difficulty,
    guide.arenaLocation ?? '',
    ...(guide.weaknesses ?? []),
    guide.summary,
    ...guide.phases.flatMap((p) => [p.title, ...p.attackPatterns, ...p.safeWindows]),
    ...guide.loadouts.map(
      (l) =>
        `${l.playstyle} ${l.weapon} ${l.charmsOrRelics.join(' ')} ${l.skillsOrArts.join(' ')}`
    ),
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const token of tokens) {
    const inBoss = bossLower.includes(token);
    const inGame = gameLower.includes(token);
    const inSecondary = secondaryHaystack.includes(token);
    if (!inBoss && !inGame && !inSecondary) {
      return -1;
    }
    if (inBoss) score += bossLower.startsWith(token) ? 10 : 6;
    if (inGame) score += 4;
    if (inSecondary) score += 1;
  }

  if (bossLower.includes(fullPhrase)) score += 12;
  return score;
}

export function filterBossGuides(
  guides: BossGuide[],
  query: string,
  gameFilter: string,
  difficultyFilter = 'All'
): BossGuide[] {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedGame = gameFilter.trim();
  const normalizedDifficulty = difficultyFilter.trim();

  const gameFiltered = guides.filter((guide) => {
    if (normalizedGame && normalizedGame !== 'All' && guide.gameTitle !== normalizedGame) {
      return false;
    }
    if (
      normalizedDifficulty &&
      normalizedDifficulty !== 'All' &&
      guide.difficulty !== normalizedDifficulty
    ) {
      return false;
    }
    return true;
  });

  if (!normalizedQuery) return gameFiltered;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return gameFiltered;

  const scored = gameFiltered
    .map((guide) => ({ guide, score: scoreGuideMatch(guide, tokens) }))
    .filter((entry) => entry.score >= 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.guide);
}

export function removeBossGuide(guides: BossGuide[], bossId: string): BossGuide[] {
  return guides.filter((guide) => guide.id !== bossId);
}
