export const PSN_PROFILES_BASE_URL = 'https://psnprofiles.com/';

export interface PsnProfileUrls {
  profileUrl: string;
  trophyLogUrl: string;
  advisorUrl: string;
  guidesUrl: string;
}

export interface PsnSyncedStats {
  psnId: string;
  level?: number;
  completionPct?: string;
  platinum?: number;
  gold?: number;
  silver?: number;
  bronze?: number;
}

const RESERVED_PSN_SEGMENTS = new Set([
  'games',
  'guides',
  'trophies',
  'leaderboard',
  'sessions',
  'forums',
  'search',
  'series',
]);

export function normalizePsnId(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  let candidate = trimmed;

  if (/^https?:\/\//i.test(candidate) || /^psnprofiles\.com\//i.test(candidate)) {
    const withProtocol = /^https?:\/\//i.test(candidate)
      ? candidate
      : `https://${candidate}`;
    try {
      const parsed = new URL(withProtocol);
      const host = parsed.hostname.toLowerCase();
      if (host !== 'psnprofiles.com' && host !== 'www.psnprofiles.com') {
        return null;
      }
      const segments = parsed.pathname
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);
      if (segments.length === 0) return null;
      const first = segments[0];
      if (RESERVED_PSN_SEGMENTS.has(first.toLowerCase())) {
        return null;
      }
      candidate = decodeURIComponent(first);
    } catch {
      return null;
    }
  }

  candidate = candidate.replace(/^@+/, '').trim();
  if (!/^[A-Za-z0-9_-]{3,16}$/.test(candidate)) {
    return null;
  }

  return candidate;
}

export function buildPsnProfileUrls(psnId: string): PsnProfileUrls {
  const safeId = encodeURIComponent(psnId);
  return {
    profileUrl: `https://psnprofiles.com/${safeId}`,
    trophyLogUrl: `https://psnprofiles.com/${safeId}/log`,
    advisorUrl: `https://psnprofiles.com/${safeId}/advisor`,
    guidesUrl: 'https://psnprofiles.com/guides',
  };
}

export function normalizePsnGameUrl(rawInput: string): string | undefined {
  const trimmed = rawInput.trim();
  if (!trimmed) return undefined;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^psnprofiles\.com\//i.test(trimmed)
    ? `https://${trimmed}`
    : '';

  if (!withProtocol) return undefined;

  try {
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'psnprofiles.com' && host !== 'www.psnprofiles.com') {
      return undefined;
    }
    parsed.protocol = 'https:';
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function buildPsnGameLink(gameTitle: string, customUrl?: string): string {
  const normalizedCustom = customUrl ? normalizePsnGameUrl(customUrl) : undefined;
  if (normalizedCustom) return normalizedCustom;

  const trimmedTitle = gameTitle.trim();
  if (!trimmedTitle) return PSN_PROFILES_BASE_URL;

  return `https://psnprofiles.com/search/games?q=${encodeURIComponent(trimmedTitle)}`;
}

export function extractGameTitleFromPsnUrl(rawUrl: string): string | null {
  const normalized = normalizePsnGameUrl(rawUrl);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    const match = parsed.pathname.match(/^\/(?:trophies|guide)\/\d+-([a-z0-9-]+)\/?/i);
    if (!match || !match[1]) return null;

    return match[1]
      .split('-')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch {
    return null;
  }
}

export function parsePsnProfileHtml(html: string, psnId: string): PsnSyncedStats | null {
  if (!html || /Just a moment|cf-browser-verification|Enable JavaScript and cookies/i.test(html)) {
    return null;
  }

  const readInt = (pattern: RegExp): number | undefined => {
    const match = html.match(pattern);
    if (!match || !match[1]) return undefined;
    const num = Number.parseInt(match[1].replace(/,/g, ''), 10);
    return Number.isFinite(num) ? num : undefined;
  };

  const platinum = readInt(/class="platinum"[^>]*>\s*([\d,]+)/i);
  const gold = readInt(/class="gold"[^>]*>\s*([\d,]+)/i);
  const silver = readInt(/class="silver"[^>]*>\s*([\d,]+)/i);
  const bronze = readInt(/class="bronze"[^>]*>\s*([\d,]+)/i);
  const level = readInt(/class="level"[^>]*>\s*([\d,]+)/i);
  const completionMatch = html.match(/Completion[^0-9]*([\d.]+%)/i);

  if (
    platinum === undefined &&
    gold === undefined &&
    silver === undefined &&
    bronze === undefined
  ) {
    return null;
  }

  return {
    psnId,
    level,
    completionPct: completionMatch?.[1],
    platinum,
    gold,
    silver,
    bronze,
  };
}
