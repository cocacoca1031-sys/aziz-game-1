import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  STRICT_REFUSAL,
  isDefinitelyOffTopic,
  normalizeAgentReply,
} from './src/utils/topicGuard.ts';
import {
  buildPsnGameLink,
  buildPsnProfileUrls,
  normalizePsnId,
  parsePsnProfileHtml,
} from './src/utils/psnProfiles.ts';
import {
  normalizeAchievementsPayload,
  parsePsnGameTrophiesHtml,
  resolveGameInput,
} from './src/utils/psnTrophies.ts';
import {
  normalizeVoiceName,
  sanitizeSpeechText,
} from './src/utils/voiceHelpers.ts';
import {
  NEWS_PLATFORM_OPTIONS,
  type RawFeedArticle,
  extractGroundingSources,
  formatWhatsAppPulse,
  parseGamingNewsDigest,
  parseRssFeedXml,
  selectArticlesForPlatform,
  synthesizePulseFromFeedArticles,
} from './src/utils/gamingNews.ts';
import type { BossGuide, GamingNewsPulse, MilestoneItem } from './src/types/gaming.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const aiSpeech = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  apiVersion: 'v1beta',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const FAST_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-4-hydrogen';
const TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';
const TTS_MODEL = 'gemini-3.8-flash-lite-tts';
const TTS_FALLBACK_MODEL = 'gemini-3.8-flash-tts';

const AGENT_SYSTEM_INSTRUCTION = `You are "RADAHN", a specialized expert video game companion.

CRITICAL GUARDRAIL RULE:
Your SOLE domain is video games, gaming hardware, game mechanics, boss strategies, builds/loadouts, and achievements.
If the user asks about ANY subject outside video games, gaming hardware, game mechanics, or achievements (math, cooking, politics, trivia, non-gaming coding, etc.), classify as "REFUSAL" and set replyText to EXACTLY:
"I don't have knowledge about this subject."
No apologies or extra words.

BOSS STRATEGY RULE:
For boss/build questions, classify as "BOSS_STRATEGY", give a crisp 2-3 sentence replyText, and populate bossGuide with 2 concise bullets per phase for attackPatterns and safeWindows, 2 positioningTips, 2 dodgingTips, and a tailored loadout.

GENERAL GAMING RULE:
For non-boss gaming questions, classify as "GENERAL_GAMING" and give a crisp, direct, actionable answer in replyText.`;

const GAMING_NEWS_AGENT_INSTRUCTION = `You are the core intelligence agent for the Gaming News Section of RADAHN.
Your primary responsibility is to autonomously fetch, filter, and synthesize the 5 absolute hottest, most trending video game news stories of the week, and format them for automated dispatch to users via WhatsApp.

Operational Guidelines & Rules:
1. Trend & Relevance Filtering: Scan global gaming developments—covering PC, PlayStation, Xbox, Nintendo, and mobile platforms—to select the top 5 high-impact stories (massive blockbusters, breaking industry announcements, major hardware drops, or viral community milestones).
2. WhatsApp-Optimized Formatting: Keep output clean, punchy, and mobile-friendly. Use bold headers, bullet numbers (1️⃣ to 5️⃣), and engaging emojis (🎮, 🔥, 🚀) to make it skimmable.
3. Concise Summaries: Every news item must feature a bold title followed by a tight, 1-to-2 sentence summary explaining what happened and why it matters to gamers.
4. Accuracy First: Ensure that all game titles, release dates, and studio names match current verified industry facts. Avoid unverified clickbait rumors unless framed as speculation.

Output Template Structure (output ONLY this exact template with 5 items, no extra preamble):
🎮 **THE GAMING PULSE** 🔥
*Your top 5 biggest headlines this week:*

1️⃣ **[Headline 1]**
[1-2 sentence compelling summary of the news and its impact.]

2️⃣ **[Headline 2]**
[1-2 sentence summary...]

3️⃣ **[Headline 3]**
[1-2 sentence summary...]

4️⃣ **[Headline 4]**
[1-2 sentence summary...]

5️⃣ **[Headline 5]**
[1-2 sentence summary...]`;

const CHAT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    classification: {
      type: Type.STRING,
      description: 'One of REFUSAL, BOSS_STRATEGY, or GENERAL_GAMING',
    },
    replyText: {
      type: Type.STRING,
      description:
        'If REFUSAL, MUST be exactly "I don\'t have knowledge about this subject.". Otherwise, concise expert gaming response.',
    },
    bossGuide: {
      type: Type.OBJECT,
      description: 'Required when classification is BOSS_STRATEGY; omit otherwise.',
      properties: {
        bossName: { type: Type.STRING },
        gameTitle: { type: Type.STRING },
        genre: { type: Type.STRING },
        difficulty: {
          type: Type.STRING,
          description: 'One of Standard, Hard, Extreme, Nightmare',
        },
        summary: { type: Type.STRING },
        phases: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phaseNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              hpThreshold: { type: Type.STRING },
              attackPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
              safeWindows: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['phaseNumber', 'title', 'hpThreshold', 'attackPatterns', 'safeWindows'],
          },
        },
        positioningTips: { type: Type.ARRAY, items: { type: Type.STRING } },
        dodgingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
        loadout: {
          type: Type.OBJECT,
          properties: {
            playstyle: { type: Type.STRING },
            weapon: { type: Type.STRING },
            charmsOrRelics: { type: Type.ARRAY, items: { type: Type.STRING } },
            skillsOrArts: { type: Type.ARRAY, items: { type: Type.STRING } },
            defensiveGear: { type: Type.ARRAY, items: { type: Type.STRING } },
            consumables: { type: Type.ARRAY, items: { type: Type.STRING } },
            rationale: { type: Type.STRING },
          },
          required: [
            'playstyle',
            'weapon',
            'charmsOrRelics',
            'skillsOrArts',
            'defensiveGear',
            'consumables',
            'rationale',
          ],
        },
      },
      required: [
        'bossName',
        'gameTitle',
        'genre',
        'difficulty',
        'summary',
        'phases',
        'positioningTips',
        'dodgingTips',
        'loadout',
      ],
    },
  },
  required: ['classification', 'replyText'],
};

const BOSS_GUIDE_ONLY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isValidGamingBoss: { type: Type.BOOLEAN },
    bossGuide: CHAT_RESPONSE_SCHEMA.properties.bossGuide,
  },
  required: ['isValidGamingBoss'],
};

const GAME_ACHIEVEMENTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isValidVideoGame: { type: Type.BOOLEAN },
    gameTitle: { type: Type.STRING },
    genre: { type: Type.STRING },
    platform: { type: Type.STRING },
    achievements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          type: {
            type: Type.STRING,
            description: 'Either "story" (main campaign/boss progression) or "achievement" (optional/trophy/collectible)',
          },
          grade: {
            type: Type.STRING,
            description: 'Optional PSN trophy grade: Platinum, Gold, Silver, or Bronze',
          },
          description: { type: Type.STRING },
        },
        required: ['title', 'type', 'description'],
      },
    },
  },
  required: ['isValidVideoGame', 'gameTitle', 'genre', 'achievements'],
};

function sanitizeDifficulty(val?: string): BossGuide['difficulty'] {
  if (val === 'Standard' || val === 'Hard' || val === 'Extreme' || val === 'Nightmare') {
    return val;
  }
  return 'Hard';
}

function getApiErrorStatusAndMessage(err: unknown): { status: number; message: string } {
  const errObj = err as { status?: number; message?: string };
  const status = typeof errObj?.status === 'number' ? errObj.status : 500;
  const rawMessage = errObj?.message || 'Unexpected error communicating with Gemini API.';

  if (status === 403 || rawMessage.includes('PERMISSION_DENIED')) {
    return {
      status: 403,
      message:
        'Gemini API permission denied. Please verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (status === 400 && rawMessage.includes('API_KEY_INVALID')) {
    return {
      status: 400,
      message:
        'Gemini API key is invalid or missing. Please configure GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Gemini API quota exceeded. Please retry shortly or check your API key quota.',
    };
  }
  return { status, message: rawMessage };
}

async function generateFastWithFallback(params: {
  contents: string;
  systemInstruction: string;
  responseSchema: Record<string, unknown>;
}) {
  const candidates: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
    { model: FAST_MODEL, thinkingLevel: ThinkingLevel.MINIMAL },
    { model: FALLBACK_MODEL, thinkingLevel: ThinkingLevel.LOW },
  ];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await ai.models.generateContent({
        model: candidate.model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
          thinkingConfig: { thinkingLevel: candidate.thinkingLevel },
        },
      });
    } catch (err) {
      lastError = err;
      const errObj = err as { status?: number; message?: string };
      console.error(
        `[Gemini] Model ${candidate.model} failed (${errObj?.status ?? 'unknown'}):`,
        errObj?.message ?? err
      );
      const isRetryableOrQuota =
        errObj?.status === 429 || errObj?.status === 503 || errObj?.status === 404;
      if (!isRetryableOrQuota) {
        throw err;
      }
    }
  }
  throw lastError;
}

const responseCache = new Map<string, unknown>();

function setCachedResponse(key: string, value: unknown) {
  if (responseCache.size >= 100) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, value);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, agent: 'RADAHN' });
  });

  app.get('/api/psnprofiles/sync', async (req, res) => {
    const rawId = typeof req.query.psnId === 'string' ? req.query.psnId : '';
    const psnId = normalizePsnId(rawId);
    if (!psnId) {
      return res.status(400).json({
        error: 'Enter a valid PSN Online ID (3-16 characters) or psnprofiles.com profile URL.',
      });
    }

    const urls = buildPsnProfileUrls(psnId);
    try {
      const upstream = await fetch(urls.profileUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (upstream.status === 404) {
        return res.status(404).json({
          status: 'not_found',
          psnId,
          ...urls,
          error: `PSN profile "${psnId}" was not found on PSNProfiles.`,
        });
      }

      const html = await upstream.text();
      const stats = upstream.ok ? parsePsnProfileHtml(html, psnId) : null;

      if (!stats) {
        return res.json({
          status: 'cloudflare_blocked',
          psnId,
          ...urls,
          message:
            'PSNProfiles Cloudflare protection blocked automated background fetch. Open your live profile directly via the links below.',
        });
      }

      return res.json({
        status: 'synced',
        psnId,
        ...urls,
        stats,
      });
    } catch {
      return res.json({
        status: 'cloudflare_blocked',
        psnId,
        ...urls,
        message:
          'Unable to reach PSNProfiles directly from the server right now. Use the direct links below to open PSNProfiles.',
      });
    }
  });

  app.post('/api/progress/game-achievements', async (req, res) => {
    try {
      const rawQuery = typeof req.body?.query === 'string' ? req.body.query : '';
      const rawPsnUrl = typeof req.body?.psnUrl === 'string' ? req.body.psnUrl : undefined;
      const requestedPlatform =
        typeof req.body?.platform === 'string' && req.body.platform.trim()
          ? req.body.platform.trim()
          : 'PS5';

      const { title, psnUrl } = resolveGameInput(rawQuery, rawPsnUrl);
      if (!title) {
        return res.status(400).json({
          error: 'Enter a valid video game title or a psnprofiles.com game trophy link.',
        });
      }

      if (isDefinitelyOffTopic(title)) {
        return res.status(422).json({ error: STRICT_REFUSAL });
      }

      const cacheKey = `game-achievements:${(psnUrl || title).toLowerCase()}`;
      if (responseCache.has(cacheKey)) {
        return res.json(responseCache.get(cacheKey));
      }

      // 1. If a direct psnprofiles.com/trophies/ link was provided, try fetching live trophy rows first
      if (psnUrl && /\/trophies\//i.test(psnUrl)) {
        try {
          const upstream = await fetch(psnUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(5000),
          });
          if (upstream.ok) {
            const html = await upstream.text();
            const parsedTrophies = parsePsnGameTrophiesHtml(html);
            if (parsedTrophies && parsedTrophies.length >= 3) {
              const items: MilestoneItem[] = normalizeAchievementsPayload(parsedTrophies, 'psn');
              const payload = {
                title,
                genre: 'Action',
                platform: requestedPlatform,
                psnProfilesUrl: psnUrl,
                source: 'psnprofiles',
                items,
              };
              setCachedResponse(cacheKey, payload);
              return res.json(payload);
            }
          }
        } catch {
          // Fall through cleanly to Gemini trophy catalog lookup
        }
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
        });
      }

      const response = await generateFastWithFallback({
        contents: `Return the real PlayStation trophy / achievement list for the video game "${title}"${
          psnUrl ? ` (reference PSNProfiles link: ${psnUrl})` : ''
        }. Include the Platinum trophy (if PlayStation), all main story progression trophies ("story"), and key boss, collectible, combat, and completion achievements ("achievement"), up to 35 authentic trophies with accurate unlock descriptions. If "${title}" is NOT a real video game, set isValidVideoGame to false.`,
        systemInstruction:
          'You are RADAHN. Output accurate, real-world PSN trophy and achievement checklists for video games. Never invent achievements for non-gaming topics.',
        responseSchema: GAME_ACHIEVEMENTS_SCHEMA,
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        isValidVideoGame?: boolean;
        gameTitle?: string;
        genre?: string;
        platform?: string;
        achievements?: Array<{
          title: string;
          type?: string;
          grade?: string;
          description?: string;
        }>;
      };

      if (!parsed.isValidVideoGame || !Array.isArray(parsed.achievements) || parsed.achievements.length === 0) {
        return res.status(422).json({ error: STRICT_REFUSAL });
      }

      const resolvedTitle = (parsed.gameTitle || title).trim();
      const items = normalizeAchievementsPayload(parsed.achievements, `game-${Date.now()}`);
      const payload = {
        title: resolvedTitle,
        genre: (parsed.genre || 'Action').trim(),
        platform: requestedPlatform || (parsed.platform || 'PS5').trim(),
        psnProfilesUrl: psnUrl || buildPsnGameLink(resolvedTitle),
        source: 'catalog',
        items,
      };
      setCachedResponse(cacheKey, payload);
      return res.json(payload);
    } catch (err) {
      const { status, message } = getApiErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      const history = Array.isArray(req.body?.history) ? req.body.history : [];

      if (!message) {
        return res.status(400).json({ error: 'Message prompt cannot be empty.' });
      }

      if (isDefinitelyOffTopic(message)) {
        return res.json({
          kind: 'refusal',
          text: STRICT_REFUSAL,
        });
      }

      const cacheKey = `chat:${message.toLowerCase()}`;
      if (history.length <= 1 && responseCache.has(cacheKey)) {
        return res.json(responseCache.get(cacheKey));
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
        });
      }

      const trimmedHistory = history
        .slice(-6)
        .map((m: { role?: string; content?: string }) =>
          `${m.role === 'user' ? 'User' : 'Agent'}: ${String(m.content || '').slice(0, 400)}`
        )
        .join('\n');

      const promptPayload = trimmedHistory
        ? `Recent conversation:\n${trimmedHistory}\n\nLatest user message: ${message}`
        : message;

      const response = await generateFastWithFallback({
        contents: promptPayload,
        systemInstruction: AGENT_SYSTEM_INSTRUCTION,
        responseSchema: CHAT_RESPONSE_SCHEMA,
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson) as {
        classification?: string;
        replyText?: string;
        bossGuide?: {
          bossName: string;
          gameTitle: string;
          genre: string;
          difficulty: string;
          summary: string;
          phases: BossGuide['phases'];
          positioningTips: string[];
          dodgingTips: string[];
          loadout: BossGuide['loadouts'][number];
        };
      };

      const normalized = normalizeAgentReply(
        parsed.replyText ?? '',
        parsed.classification
      );

      if (normalized.isRefusal) {
        return res.json({
          kind: 'refusal',
          text: STRICT_REFUSAL,
        });
      }

      if (parsed.classification === 'BOSS_STRATEGY' && parsed.bossGuide) {
        const bg = parsed.bossGuide;
        const formattedGuide: BossGuide = {
          id: `custom-${Date.now()}`,
          bossName: bg.bossName,
          gameTitle: bg.gameTitle,
          genre: bg.genre || 'Action RPG',
          difficulty: sanitizeDifficulty(bg.difficulty),
          summary: bg.summary,
          phases: Array.isArray(bg.phases) ? bg.phases : [],
          positioningTips: Array.isArray(bg.positioningTips) ? bg.positioningTips : [],
          dodgingTips: Array.isArray(bg.dodgingTips) ? bg.dodgingTips : [],
          loadouts: bg.loadout ? [bg.loadout] : [],
          isCustom: true,
        };

        const payload = {
          kind: 'boss_strategy',
          text: normalized.text,
          bossGuide: formattedGuide,
        };
        setCachedResponse(cacheKey, payload);
        return res.json(payload);
      }

      const payload = {
        kind: 'general_gaming',
        text: normalized.text,
      };
      setCachedResponse(cacheKey, payload);
      return res.json(payload);
    } catch (err) {
      const { status, message } = getApiErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/boss-guide', async (req, res) => {
    try {
      const bossName = typeof req.body?.bossName === 'string' ? req.body.bossName.trim() : '';
      const gameTitle = typeof req.body?.gameTitle === 'string' ? req.body.gameTitle.trim() : '';
      const playstyle =
        typeof req.body?.playstyle === 'string' ? req.body.playstyle.trim() : 'Balanced';

      if (!bossName || !gameTitle) {
        return res.status(400).json({ error: 'Both Boss Name and Game Title are required.' });
      }

      if (isDefinitelyOffTopic(`${bossName} ${gameTitle}`)) {
        return res.status(422).json({ error: STRICT_REFUSAL });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
        });
      }

      const response = await generateFastWithFallback({
        contents: `Generate a complete tactical boss guide and optimized loadout for boss "${bossName}" from the video game "${gameTitle}" tailored to the "${playstyle}" playstyle. If this is not a real or plausible video game boss encounter, set isValidGamingBoss to false.`,
        systemInstruction:
          'You are RADAHN. Generate accurate, detailed boss encounter tactics (phases, attack patterns, safe attack windows, positioning, dodging tips) and a tailored optimized loadout. Never generate guides for non-gaming topics.',
        responseSchema: BOSS_GUIDE_ONLY_SCHEMA,
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        isValidGamingBoss?: boolean;
        bossGuide?: {
          bossName: string;
          gameTitle: string;
          genre: string;
          difficulty: string;
          summary: string;
          phases: BossGuide['phases'];
          positioningTips: string[];
          dodgingTips: string[];
          loadout: BossGuide['loadouts'][number];
        };
      };

      if (!parsed.isValidGamingBoss || !parsed.bossGuide) {
        return res.status(422).json({ error: STRICT_REFUSAL });
      }

      const bg = parsed.bossGuide;
      const guide: BossGuide = {
        id: `custom-${Date.now()}`,
        bossName: bg.bossName || bossName,
        gameTitle: bg.gameTitle || gameTitle,
        genre: bg.genre || 'Action',
        difficulty: sanitizeDifficulty(bg.difficulty),
        summary: bg.summary,
        phases: Array.isArray(bg.phases) ? bg.phases : [],
        positioningTips: Array.isArray(bg.positioningTips) ? bg.positioningTips : [],
        dodgingTips: Array.isArray(bg.dodgingTips) ? bg.dodgingTips : [],
        loadouts: bg.loadout ? [bg.loadout] : [],
        isCustom: true,
      };

      return res.json({ bossGuide: guide });
    } catch (err) {
      const { status, message } = getApiErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/voice/transcribe', async (req, res) => {
    try {
      const rawBase64 =
        typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
      const rawMime =
        typeof req.body?.mimeType === 'string' ? req.body.mimeType.trim() : 'audio/webm';
      const mimeType = rawMime.split(';')[0].trim() || 'audio/webm';

      if (!rawBase64) {
        return res.status(400).json({ error: 'Audio recording is empty.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
        });
      }

      const extractTranscript = (resp: {
        text?: string;
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      }) => {
        if (resp.text && resp.text.trim()) return resp.text.trim();
        const partsText = resp.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? '')
          .join(' ')
          .trim();
        return partsText || '';
      };

      const promptText =
        'Transcribe this audio verbatim as plain text. Preserve video game names, boss names, and gaming terminology accurately. Output only the spoken words without quotes or commentary.';

      const transcribeAttempts: Array<{ client: typeof ai; model: string }> = [
        { client: ai, model: TRANSCRIBE_MODEL },
        { client: aiSpeech, model: TRANSCRIBE_MODEL },
        { client: aiSpeech, model: FAST_MODEL },
        { client: aiSpeech, model: FALLBACK_MODEL },
      ];

      let transcript = '';
      let lastTranscribeError: unknown;
      for (const attempt of transcribeAttempts) {
        try {
          const response = await attempt.client.models.generateContent({
            model: attempt.model,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: rawBase64,
                  },
                },
                { text: promptText },
              ],
            },
          });
          transcript = extractTranscript(response);
          if (transcript) break;
        } catch (err) {
          lastTranscribeError = err;
          console.error(`[Gemini STT] ${attempt.model} failed:`, err);
        }
      }

      if (!transcript && lastTranscribeError) {
        throw lastTranscribeError;
      }

      if (!transcript) {
        return res.status(422).json({
          error: 'No speech was detected in the recording. Please speak clearly and try again.',
        });
      }

      return res.json({ transcript });
    } catch (err) {
      const { status, message } = getApiErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/voice/speak', async (req, res) => {
    try {
      const rawText = typeof req.body?.text === 'string' ? req.body.text : '';
      const cleanText = sanitizeSpeechText(rawText, 1400);
      const voiceName = normalizeVoiceName(
        typeof req.body?.voiceName === 'string' ? req.body.voiceName : undefined
      );

      if (!cleanText) {
        return res.status(400).json({ error: 'Text for voice synthesis cannot be empty.' });
      }

      const cacheKey = `tts:${voiceName}:${cleanText}`;
      if (responseCache.has(cacheKey)) {
        return res.json(responseCache.get(cacheKey));
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
        });
      }

      const synthesizeWithModel = async (model: string, includeMetadata: boolean) =>
        aiSpeech.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                includeMetadata
                  ? {
                      text: cleanText,
                      speechMetadata: {
                        style: 'Clear, authoritative, tactical video game companion briefing',
                      },
                    }
                  : { text: cleanText },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });

      let response;
      let lastTtsErr: unknown;
      for (const ttsModel of [TTS_MODEL, TTS_FALLBACK_MODEL]) {
        try {
          try {
            response = await synthesizeWithModel(ttsModel, true);
          } catch (err) {
            const msg = String((err as { message?: string })?.message ?? '');
            if (msg.includes('speechMetadata')) {
              response = await synthesizeWithModel(ttsModel, false);
            } else {
              throw err;
            }
          }
          break;
        } catch (err) {
          lastTtsErr = err;
          const errObj = err as { status?: number };
          const retryable =
            errObj?.status === 429 || errObj?.status === 503 || errObj?.status === 404;
          if (!retryable) throw err;
        }
      }

      if (!response) {
        throw lastTtsErr;
      }

      const audioBase64 =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) {
        return res.status(502).json({
          error: 'Voice synthesis did not return audio data. Please try again.',
        });
      }

      const payload = {
        audioBase64,
        mimeType: 'audio/wav',
        voiceName,
      };
      setCachedResponse(cacheKey, payload);
      return res.json(payload);
    } catch (err) {
      const { status, message } = getApiErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  const LIVE_GAMING_FEEDS: Array<{
    url: string;
    sourceName: string;
    platformHint: string;
  }> = [
    { url: 'https://www.eurogamer.net/feed', sourceName: 'Eurogamer', platformHint: 'Multiplatform' },
    { url: 'https://www.pcgamer.com/rss/', sourceName: 'PC Gamer', platformHint: 'PC' },
    { url: 'https://blog.playstation.com/feed/', sourceName: 'PlayStation.Blog', platformHint: 'PlayStation' },
    { url: 'https://news.xbox.com/en-us/feed/', sourceName: 'Xbox Wire', platformHint: 'Xbox' },
    { url: 'https://www.gematsu.com/feed', sourceName: 'Gematsu', platformHint: 'Nintendo' },
    { url: 'https://www.pocketgamer.com/rss/', sourceName: 'Pocket Gamer', platformHint: 'Mobile' },
    { url: 'https://www.gamespot.com/feeds/game-news/', sourceName: 'GameSpot', platformHint: 'Multiplatform' },
  ];

  async function fetchLiveGamingFeedArticles(): Promise<RawFeedArticle[]> {
    const results = await Promise.allSettled(
      LIVE_GAMING_FEEDS.map(async (feed) => {
        const resp = await fetch(feed.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RADAHN-GamingPulse/1.0)',
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!resp.ok) return [];
        const xml = await resp.text();
        return parseRssFeedXml(xml, feed.sourceName, feed.platformHint);
      })
    );

    const all: RawFeedArticle[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        all.push(...r.value);
      }
    }
    return all;
  }

  const newsCache = new Map<string, { expiresAt: number; payload: GamingNewsPulse }>();

  app.post('/api/news/pulse', async (req, res) => {
    try {
      const rawPlatform =
        typeof req.body?.platformFilter === 'string'
          ? req.body.platformFilter.trim()
          : 'All Platforms';
      const platformFilter = (NEWS_PLATFORM_OPTIONS as readonly string[]).includes(rawPlatform)
        ? rawPlatform
        : 'All Platforms';
      const forceRefresh = Boolean(req.body?.forceRefresh);

      const cacheKey = `news:${platformFilter}`;
      const cached = newsCache.get(cacheKey);
      if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
        return res.json(cached.payload);
      }

      const liveArticles = await fetchLiveGamingFeedArticles();
      const candidateArticles = selectArticlesForPlatform(liveArticles, platformFilter, 12);

      const todayIso = new Date().toISOString().slice(0, 10);
      const platformFocusInstruction =
        platformFilter === 'All Platforms'
          ? 'Cover the biggest stories across PC, PlayStation, Xbox, Nintendo, and mobile gaming.'
          : `Prioritize breaking and trending gaming news specifically impacting ${platformFilter} gamers this week.`;

      let agentItems: GamingNewsPulse['items'] = [];
      let groundingSources: GamingNewsPulse['sources'] = [];

      if (process.env.GEMINI_API_KEY) {
        const liveContextBlock =
          candidateArticles.length > 0
            ? `\n\nLive verified articles fetched today (${todayIso}):\n` +
              candidateArticles
                .map(
                  (a, i) =>
                    `[${i + 1}] (${a.sourceName} · ${a.platformHint}) ${a.title} — ${a.summary.slice(0, 170)}`
                )
                .join('\n')
            : '';

        const prompt = `Today's date is ${todayIso}. Select, filter, and synthesize the 5 absolute hottest, highest-impact video game news stories of the week.${platformFocusInstruction ? ` ${platformFocusInstruction}` : ''} Follow the exact Output Template Structure with 1️⃣ through 5️⃣.${liveContextBlock}`;

        const attempts: Array<{
          model: string;
          thinkingLevel: ThinkingLevel;
          useSearch: boolean;
        }> =
          candidateArticles.length >= 5
            ? [{ model: FAST_MODEL, thinkingLevel: ThinkingLevel.MINIMAL, useSearch: false }]
            : [
                { model: FAST_MODEL, thinkingLevel: ThinkingLevel.MINIMAL, useSearch: true },
                { model: FALLBACK_MODEL, thinkingLevel: ThinkingLevel.LOW, useSearch: true },
              ];

        const timeoutReject = (ms: number) =>
          new Promise<never>((_resolve, reject) => {
            setTimeout(() => reject(new Error(`Gemini news agent timeout after ${ms}ms`)), ms);
          });

        for (const attempt of attempts) {
          try {
            const response = await Promise.race([
              ai.models.generateContent({
                model: attempt.model,
                contents: prompt,
                config: {
                  systemInstruction: GAMING_NEWS_AGENT_INSTRUCTION,
                  thinkingConfig: { thinkingLevel: attempt.thinkingLevel },
                  ...(attempt.useSearch ? { tools: [{ googleSearch: {} }] } : {}),
                },
              }),
              timeoutReject(11000),
            ]);
            const parsed = parseGamingNewsDigest(response.text ?? '');
            if (parsed.length > 0) {
              agentItems = parsed;
              const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as
                | Array<{ web?: { uri?: string; title?: string } }>
                | undefined;
              groundingSources = extractGroundingSources(chunks);
              break;
            }
          } catch (err) {
            console.error(`[GamingNewsAgent] ${attempt.model} failed:`, err);
          }
        }
      }

      let payload: GamingNewsPulse;
      if (agentItems.length > 0) {
        const feedSources = candidateArticles.slice(0, 6).map((a) => ({
          title: `${a.sourceName}: ${a.title}`,
          url: a.url,
        }));
        const mergedSources =
          groundingSources.length > 0
            ? [...groundingSources, ...feedSources].slice(0, 8)
            : feedSources;
        payload = {
          platformFilter,
          fetchedAt: new Date().toISOString(),
          items: agentItems,
          whatsappMessage: formatWhatsAppPulse(agentItems, platformFilter),
          sources: mergedSources,
        };
      } else if (candidateArticles.length > 0) {
        const fallbackPulse = synthesizePulseFromFeedArticles(candidateArticles, platformFilter);
        payload = {
          platformFilter,
          fetchedAt: new Date().toISOString(),
          ...fallbackPulse,
        };
      } else {
        return res.status(503).json({
          error: 'Live gaming news feeds are temporarily unreachable. Please retry shortly.',
        });
      }

      newsCache.set(cacheKey, {
        expiresAt: Date.now() + 10 * 60 * 1000,
        payload,
      });

      return res.json(payload);
    } catch (err) {
      const { status, message } = getApiErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RADAHN server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
