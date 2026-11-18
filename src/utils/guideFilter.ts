import type { GameGuide, GuideCategory } from '../types/gaming';

export const GUIDE_CATEGORY_OPTIONS: readonly ('All' | GuideCategory)[] = [
  'All',
  'Story Walkthrough',
  'Secrets & Collectibles',
  'Trophy Roadmap',
  'Mechanics & Combat',
  'Beginner Essentials',
];

export function getUniqueGuideGames(guides: GameGuide[]): string[] {
  const set = new Set<string>();
  for (const guide of guides) {
    if (guide.gameTitle.trim()) {
      set.add(guide.gameTitle.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function filterGameGuides(
  guides: GameGuide[],
  query: string,
  selectedCategory: 'All' | GuideCategory = 'All',
  bookmarkedOnly = false
): GameGuide[] {
  const normalizedQuery = query.trim().toLowerCase();
  const tokens = normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : [];

  return guides.filter((guide) => {
    if (selectedCategory !== 'All' && guide.category !== selectedCategory) {
      return false;
    }
    if (bookmarkedOnly && !guide.bookmarked) {
      return false;
    }
    if (tokens.length === 0) {
      return true;
    }

    const haystack = [
      guide.title,
      guide.gameTitle,
      guide.category,
      guide.difficulty,
      guide.summary,
      ...guide.prerequisites,
      ...guide.missableWarnings,
      ...guide.proTips,
      ...guide.steps.map((s) => `${s.title} ${s.detail} ${s.location ?? ''}`),
    ]
      .join(' ')
      .toLowerCase();

    return tokens.every((token) => haystack.includes(token));
  });
}

export function calculateGuideProgress(guide: GameGuide): {
  completedCount: number;
  totalCount: number;
  percent: number;
} {
  const totalCount = guide.steps.length;
  if (totalCount === 0) {
    return { completedCount: 0, totalCount: 0, percent: 0 };
  }
  const completedCount = guide.steps.filter((step) => Boolean(step.completed)).length;
  const percent = Math.round((completedCount / totalCount) * 100);
  return { completedCount, totalCount, percent };
}

export function toggleGuideStep(
  guides: GameGuide[],
  guideId: string,
  stepId: string
): GameGuide[] {
  const now = new Date().toISOString();
  return guides.map((guide) => {
    if (guide.id !== guideId) return guide;
    return {
      ...guide,
      updatedAt: now,
      steps: guide.steps.map((step) =>
        step.id === stepId ? { ...step, completed: !step.completed } : step
      ),
    };
  });
}

export function toggleGuideBookmark(guides: GameGuide[], guideId: string): GameGuide[] {
  return guides.map((guide) =>
    guide.id === guideId ? { ...guide, bookmarked: !guide.bookmarked } : guide
  );
}

export function removeGameGuide(guides: GameGuide[], guideId: string): GameGuide[] {
  return guides.filter((guide) => guide.id !== guideId);
}

export function buildGuideBriefingScript(guide: GameGuide): string {
  const stepTitles = guide.steps
    .slice(0, 4)
    .map((step) => `Step ${step.stepNumber}: ${step.title}. ${step.detail}`)
    .join(' ');

  const tip = guide.proTips[0] ? ` Key tip: ${guide.proTips[0]}` : '';
  return `${guide.title} for ${guide.gameTitle}. ${guide.summary} ${stepTitles}${tip}`.trim();
}
