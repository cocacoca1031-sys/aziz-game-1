import type { MilestoneItem } from '../types/gaming';
import { extractGameTitleFromPsnUrl, normalizePsnGameUrl } from './psnProfiles.ts';

export interface ParsedGameQuery {
  title: string;
  psnUrl?: string;
}

export interface RawAchievementInput {
  title: string;
  type?: string;
  description?: string;
  grade?: string;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' '));
}

export function resolveGameInput(rawInput: string, optionalUrl?: string): ParsedGameQuery {
  const trimmed = rawInput.trim();
  const explicitUrl = optionalUrl ? normalizePsnGameUrl(optionalUrl) : undefined;
  const inlineUrl = normalizePsnGameUrl(trimmed);
  const psnUrl = explicitUrl ?? inlineUrl;

  let title = '';
  if (inlineUrl) {
    title = extractGameTitleFromPsnUrl(inlineUrl) ?? '';
  } else if (trimmed) {
    title = trimmed;
  } else if (psnUrl) {
    title = extractGameTitleFromPsnUrl(psnUrl) ?? '';
  }

  title = title.replace(/\s+Trophy Guide$/i, '').trim();

  return {
    title,
    psnUrl,
  };
}

export function parsePsnGameTrophiesHtml(html: string): RawAchievementInput[] | null {
  if (!html || /Just a moment|cf-browser-verification|Enable JavaScript and cookies/i.test(html)) {
    return null;
  }

  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  const results: RawAchievementInput[] = [];
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const titleMatch = rowHtml.match(/<a[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch) continue;

    const title = stripTags(titleMatch[1]);
    if (!title) continue;

    const afterTitle = rowHtml.slice((titleMatch.index ?? 0) + titleMatch[0].length);
    const descMatch = afterTitle.match(/<br\s*\/?>\s*([\s\S]*?)<\/td>/i);
    const description = descMatch ? stripTags(descMatch[1]) : '';

    const gradeMatch = rowHtml.match(/title="(Platinum|Gold|Silver|Bronze)"/i);
    const grade = gradeMatch ? gradeMatch[1] : undefined;

    const isStory =
      /defeat|complete\s+chapter|chapter\s+\d+|ending|story|prologue|epilogue|act\s+[i1-4]/i.test(
        `${title} ${description}`
      );

    results.push({
      title,
      type: isStory ? 'story' : 'achievement',
      description,
      grade,
    });
  }

  return results.length >= 3 ? results : null;
}

export function normalizeAchievementsPayload(
  rawItems: RawAchievementInput[],
  seedPrefix = 'ach'
): MilestoneItem[] {
  const seen = new Set<string>();
  const items: MilestoneItem[] = [];

  for (let i = 0; i < rawItems.length; i += 1) {
    const raw = rawItems[i];
    const title = (raw.title || '').trim();
    if (!title) continue;

    const dedupeKey = title.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const type: MilestoneItem['type'] = raw.type === 'story' ? 'story' : 'achievement';
    const rawDesc = (raw.description || '').trim();
    const gradePrefix =
      raw.grade && !rawDesc.toLowerCase().startsWith(raw.grade.toLowerCase())
        ? `${raw.grade} · `
        : '';
    const description = `${gradePrefix}${rawDesc}`.trim() || undefined;

    items.push({
      id: `${seedPrefix}-${i}-${title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 24)}`,
      title,
      type,
      completed: false,
      description,
    });
  }

  return items;
}
