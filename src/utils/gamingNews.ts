import type { GamingNewsItem, GamingNewsSource } from '../types/gaming.ts';
import { sanitizeSpeechText } from './voiceHelpers.ts';

export const NEWS_PLATFORM_OPTIONS = [
  'All Platforms',
  'PC',
  'PlayStation',
  'Xbox',
  'Nintendo',
  'Mobile',
] as const;

export type NewsPlatformFilter = (typeof NEWS_PLATFORM_OPTIONS)[number];

const RANK_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'] as const;

function stripMarkdownBold(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^\[(.*?)\]$/, '$1')
    .trim();
}

export function parseGamingNewsDigest(rawText: string): GamingNewsItem[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  // Normalize numbered markers (1️⃣..5️⃣ or 1. .. 5.) into split tokens
  const lines = normalized.split('\n');
  const items: GamingNewsItem[] = [];
  let current: { rank: number; headline: string; summaryLines: string[] } | null = null;

  const itemStartRegex =
    /^(?:([1-5])️⃣|([1-5])[\.\)])\s+(.+)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip template header lines
    if (
      line.includes('THE GAMING PULSE') ||
      /^[*_]?Your top 5 biggest headlines/i.test(line)
    ) {
      continue;
    }

    const match = line.match(itemStartRegex);
    if (match) {
      if (current) {
        items.push({
          rank: current.rank,
          headline: current.headline,
          summary: current.summaryLines.join(' ').trim(),
        });
      }
      const rank = Number(match[1] || match[2]);
      const headline = stripMarkdownBold(match[3]);
      current = { rank, headline, summaryLines: [] };
      continue;
    }

    if (current) {
      current.summaryLines.push(stripMarkdownBold(line));
    }
  }

  if (current) {
    items.push({
      rank: current.rank,
      headline: current.headline,
      summary: current.summaryLines.join(' ').trim(),
    });
  }

  return items
    .filter((item) => item.headline.length > 0)
    .slice(0, 5)
    .map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
}

export function formatPulseDigest(
  items: GamingNewsItem[],
  platformFilter: string = 'All Platforms'
): string {
  const scopeNote =
    platformFilter && platformFilter !== 'All Platforms'
      ? ` (${platformFilter})`
      : '';

  const header = `🎮 *THE GAMING PULSE*${scopeNote} 🔥\n_Your top 5 biggest headlines this week:_`;

  const blocks = items.slice(0, 5).map((item, idx) => {
    const badge = RANK_EMOJIS[idx] ?? `${idx + 1}.`;
    const cleanHeadline = stripMarkdownBold(item.headline);
    const cleanSummary = item.summary.trim();
    return `${badge} *${cleanHeadline}*\n${cleanSummary}`;
  });

  return [header, ...blocks].join('\n\n');
}

function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatTelegramHtmlPulse(
  items: GamingNewsItem[],
  platformFilter: string = 'All Platforms'
): string {
  const scopeNote =
    platformFilter && platformFilter !== 'All Platforms'
      ? ` (${escapeTelegramHtml(platformFilter)})`
      : '';

  const header = `🎮 <b>THE GAMING PULSE</b>${scopeNote} 🔥\n<i>Your top 5 biggest headlines this week:</i>`;

  const blocks = items.slice(0, 5).map((item, idx) => {
    const badge = RANK_EMOJIS[idx] ?? `${idx + 1}.`;
    const cleanHeadline = escapeTelegramHtml(stripMarkdownBold(item.headline));
    const cleanSummary = escapeTelegramHtml(item.summary.trim());
    return `${badge} <b>${cleanHeadline}</b>\n${cleanSummary}`;
  });

  return [header, ...blocks].join('\n\n');
}

export function buildTelegramShareUrl(digestMessage: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent('https://t.me')}&text=${encodeURIComponent(
    digestMessage
  )}`;
}

export function extractGroundingSources(
  chunks: Array<{ web?: { uri?: string; title?: string } }> | undefined
): GamingNewsSource[] {
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const sources: GamingNewsSource[] = [];

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri?.trim();
    if (!uri || !/^https?:\/\//i.test(uri)) continue;
    if (seen.has(uri)) continue;
    seen.add(uri);
    const title = (chunk.web?.title || uri).trim();
    sources.push({ title, url: uri });
    if (sources.length >= 8) break;
  }

  return sources;
}

export function buildNewsBriefingScript(items: GamingNewsItem[]): string {
  if (items.length === 0) return '';
  const parts = ['The Gaming Pulse. Your top five gaming headlines this week.'];
  for (const item of items.slice(0, 5)) {
    parts.push(`Number ${item.rank}: ${item.headline}. ${item.summary}`);
  }
  return sanitizeSpeechText(parts.join(' '), 1400);
}

export interface RawFeedArticle {
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  platformHint: string;
  publishedMs: number;
}

function decodeHtmlAndStripTags(input: string): string {
  const withoutCdata = input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  const withoutTags = withoutCdata.replace(/<[^>]+>/g, ' ');
  return withoutTags
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;|&#8230;|&#x2026;/gi, '...')
    .replace(/&rsquo;|&#8217;|&#x2019;/gi, '’')
    .replace(/&lsquo;|&#8216;|&#x2018;/gi, '‘')
    .replace(/&ldquo;|&#8220;|&#x201c;/gi, '“')
    .replace(/&rdquo;|&#8221;|&#x201d;/gi, '”')
    .replace(/&ndash;|&#8211;|&#x2013;/gi, '–')
    .replace(/&mdash;|&#8212;|&#x2014;/gi, '—')
    .replace(/&trade;/gi, '™')
    .replace(/&reg;/gi, '®')
    .replace(/&copy;/gi, '©')
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&aacute;/g, 'á')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&uuml;/g, 'ü')
    .replace(/&ouml;/g, 'ö')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&deg;/g, '°')
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractXmlTag(block: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  return match ? match[1] : '';
}

function extractAtomOrRssLink(block: string): string {
  const linkTag = extractXmlTag(block, 'link').trim();
  const decoded = decodeHtmlAndStripTags(linkTag);
  if (/^https?:\/\//i.test(decoded)) {
    return decoded;
  }
  const attrMatch = block.match(/<link[^>]+href=["'](https?:\/\/[^"']+)["']/i);
  return attrMatch ? attrMatch[1].trim() : '';
}

function toTwoSentences(text: string): string {
  const clean = text.trim();
  if (!clean) return 'Full coverage and platform impact details are available in the source report.';
  const sentences = clean.match(/(?:[^.!?]|[.!?](?=\S))+[.!?]+(?=\s|$)/g);
  if (sentences && sentences.length > 0) {
    const joined = sentences.slice(0, 2).join(' ').trim();
    return joined.length <= 260 ? joined : `${joined.slice(0, 257).trim()}...`;
  }
  if (/[.!?…]$/.test(clean)) {
    return clean.length <= 240 ? clean : `${clean.slice(0, 237).trim()}...`;
  }
  return clean.length <= 220 ? `${clean}.` : `${clean.slice(0, 217).trim()}...`;
}

export function parseRssFeedXml(
  xml: string,
  sourceName: string,
  platformHint = 'Multiplatform'
): RawFeedArticle[] {
  if (!xml || !xml.trim()) return [];
  const blocks = [
    ...(xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []),
    ...(xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []),
  ];

  const articles: RawFeedArticle[] = [];
  for (const block of blocks.slice(0, 12)) {
    const title = decodeHtmlAndStripTags(extractXmlTag(block, 'title'));
    const rawDesc =
      extractXmlTag(block, 'description') ||
      extractXmlTag(block, 'summary') ||
      extractXmlTag(block, 'content:encoded') ||
      extractXmlTag(block, 'content');
    const summary = toTwoSentences(decodeHtmlAndStripTags(rawDesc));
    const url = extractAtomOrRssLink(block);
    const dateRaw =
      decodeHtmlAndStripTags(extractXmlTag(block, 'pubDate')) ||
      decodeHtmlAndStripTags(extractXmlTag(block, 'updated')) ||
      decodeHtmlAndStripTags(extractXmlTag(block, 'published'));
    const parsedDate = Date.parse(dateRaw);

    if (!title || !url || !/^https?:\/\//i.test(url)) continue;
    articles.push({
      title,
      summary,
      url,
      sourceName,
      platformHint,
      publishedMs: Number.isNaN(parsedDate) ? Date.now() : parsedDate,
    });
  }

  return articles;
}

const PLATFORM_MATCH_REGEX: Record<string, RegExp> = {
  PC: /\b(pc|steam|valve|nvidia|rtx|radeon|amd|epic games|windows|mod|gpu)\b/i,
  PlayStation: /\b(ps5|ps4|playstation|sony|dualsense|ps plus|psvr|state of play)\b/i,
  Xbox: /\b(xbox|game pass|microsoft|series x|series s|phil spencer)\b/i,
  Nintendo: /\b(nintendo|switch|switch 2|zelda|mario|pokemon|pokémon|metroid|kirby|splatoon)\b/i,
  Mobile: /\b(mobile|ios|android|iphone|ipad|app store|google play|gacha|genshin|honkai)\b/i,
};

export function selectArticlesForPlatform(
  articles: RawFeedArticle[],
  platformFilter: string,
  limit = 16
): RawFeedArticle[] {
  const seenTitles = new Set<string>();
  const deduped = [...articles]
    .sort((a, b) => b.publishedMs - a.publishedMs)
    .filter((art) => {
      const key = art.title.toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

  if (platformFilter !== 'All Platforms') {
    const matcher = PLATFORM_MATCH_REGEX[platformFilter];
    const targetHint = platformFilter.toLowerCase();
    const tier1 = deduped.filter(
      (a) =>
        a.platformHint.toLowerCase() === targetHint ||
        (matcher ? matcher.test(a.title) : false)
    );
    const tier1Urls = new Set(tier1.map((a) => a.url));
    const tier2 = deduped.filter(
      (a) => !tier1Urls.has(a.url) && (matcher ? matcher.test(a.summary) : false)
    );
    const matchedUrls = new Set([...tier1, ...tier2].map((a) => a.url));
    const tier3 = deduped.filter((a) => !matchedUrls.has(a.url));
    return [...tier1, ...tier2, ...tier3].slice(0, limit);
  }

  // Interleave across distinct outlets so All Platforms stays balanced
  const bySource = new Map<string, RawFeedArticle[]>();
  for (const art of deduped) {
    const bucket = bySource.get(art.sourceName) ?? [];
    bucket.push(art);
    bySource.set(art.sourceName, bucket);
  }

  const interleaved: RawFeedArticle[] = [];
  const queues = Array.from(bySource.values());
  let round = 0;
  while (interleaved.length < limit) {
    let addedInRound = false;
    for (const q of queues) {
      if (round < q.length && interleaved.length < limit) {
        interleaved.push(q[round]);
        addedInRound = true;
      }
    }
    if (!addedInRound) break;
    round += 1;
  }

  return interleaved;
}

export function synthesizePulseFromFeedArticles(
  articles: RawFeedArticle[],
  platformFilter: string
): {
  items: GamingNewsItem[];
  sources: GamingNewsSource[];
  digestMessage: string;
} {
  const selected = selectArticlesForPlatform(articles, platformFilter, 8);
  const top5 = selected.slice(0, 5);
  const items: GamingNewsItem[] = top5.map((art, idx) => ({
    rank: idx + 1,
    headline: art.title,
    summary: art.summary,
  }));

  const sources: GamingNewsSource[] = selected.slice(0, 6).map((art) => ({
    title: `${art.sourceName}: ${art.title}`,
    url: art.url,
  }));

  return {
    items,
    sources,
    digestMessage: formatPulseDigest(items, platformFilter),
  };
}
