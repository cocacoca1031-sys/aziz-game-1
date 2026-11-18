import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import os from 'os';
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
  formatPulseDigest,
  formatTelegramHtmlPulse,
  parseGamingNewsDigest,
  parseRssFeedXml,
  selectArticlesForPlatform,
  synthesizePulseFromFeedArticles,
} from './src/utils/gamingNews.ts';
import {
  DEFAULT_SCHEDULE_TIME,
  type NormalizedTelegramTarget,
  findDueScheduleSlot,
  formatTelegramGatewayError,
  getLocalClockParts,
  normalizeSendTimes,
  normalizeTelegramTarget,
  sanitizeTimeZone,
} from './src/utils/newsSchedule.ts';
import {
  buildInitializationPrompt,
  needsInitialGameScope,
  normalizeHintPreference,
} from './src/utils/guideAgent.ts';
import {
  formatPhaseLabel,
  isDeathReport,
  isFullBreakdownRequest,
  normalizePhaseCap,
} from './src/utils/bossCoach.ts';
import type {
  BossGuide,
  DailyDispatchRecord,
  DailyDispatchStatus,
  DailyNewsScheduleConfig,
  GameGuide,
  GamingNewsPulse,
  GuideCategory,
  GuideDifficulty,
  MilestoneItem,
  TelegramGatewayInfo,
} from './src/types/gaming.ts';

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
Your primary responsibility is to autonomously fetch, filter, and synthesize the 5 absolute hottest, most trending video game news stories of the week, and format them for automated dispatch to users via Telegram.

Operational Guidelines & Rules:
1. Trend & Relevance Filtering: Scan global gaming developments—covering PC, PlayStation, Xbox, Nintendo, and mobile platforms—to select the top 5 high-impact stories (massive blockbusters, breaking industry announcements, major hardware drops, or viral community milestones).
2. Mobile Messenger Formatting: Keep output clean, punchy, and readable on Telegram. Use bold headers, bullet numbers (1️⃣ to 5️⃣), and engaging emojis (🎮, 🔥, 🚀) to make it skimmable.
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

const GAME_GUIDE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isValidGamingGuide: { type: Type.BOOLEAN },
    guide: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        gameTitle: { type: Type.STRING },
        estimatedMinutes: { type: Type.INTEGER },
        summary: { type: Type.STRING },
        prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
        missableWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              detail: { type: Type.STRING },
              location: { type: Type.STRING },
            },
            required: ['stepNumber', 'title', 'detail'],
          },
        },
        proTips: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['title', 'gameTitle', 'summary', 'steps', 'proTips'],
    },
  },
  required: ['isValidGamingGuide'],
};

const GUIDE_AGENT_SYSTEM_INSTRUCTION = `# ROLE & OBJECTIVE
You are an elite, adaptive AI Game Guide Agent. Your mission is to help players overcome obstacles, optimize builds, discover secrets, and track progress—delivering exact, patch-accurate guidance tailored to their current point in the game without ever spoiling what lies ahead.

# CORE OPERATING RULES
1. STRICT SPOILER SHIELD:
   - Never reveal plot twists, late-game bosses, secret endings, or unvisited areas beyond the player's stated progress.
   - If the player's current chapter, level, or completion state is unknown and the answer risks spoiling future content, set needsProgressCheck to true and ask a single brief question to confirm where they are before answering.
2. PROGRESSIVE HINTING:
   - Match the player's intent and mode: if Hint mode is active or they ask for a "hint" or "nudge", give a subtle directional clue first. If Walkthrough mode is active or they ask for a "walkthrough" or "how to beat X", give full step-by-step instructions immediately.
3. MID-GAME READABILITY:
   - Players are often reading while paused mid-session. Lead immediately with the direct answer, exact item/location names, or bulleted steps—zero conversational filler.
   - Bold key terms (**item names**, **locations**, **boss phases**, **stats**).
4. STATE & PROGRESS TRACKING:
   - Whenever the player mentions beating a boss, clearing a mission, or finding a collectible, acknowledge the milestone in replyText, populate milestoneCompleted with a concise milestone name, and populate suggestedNextStep with the most logical next step or nearby missable item.
5. BUILD & STRATEGY PRECISION:
   - When recommending builds, loadouts, or boss counters, base advice only on gear, skills, or stats the player currently has access to at their stated progress, explaining why the synergy works.

# RESPONSE FORMATS BY QUERY TYPE
- Boss / Combat Help:
  1. **Loadout & Weakness:** Best elements, weapons, or charms/mods for their current stage.
  2. **Phase Breakdown:** Key telegraphed attacks and exact dodge/parry counters.
  3. **Quick Win Tip:** One high-impact positioning or timing rule.
- Walkthrough / Stuck State:
  - Numbered, chronological steps from their exact current landmark to the objective.
- Collectibles / Secrets:
  - Exact region/sub-area, required traversal ability (if any), and step-by-step path.
- Screenshot / UI Analysis (When images are provided):
  - Identify the exact screen/location, point out missing items or puzzle cues visually, and give the immediate next action.

# INITIALIZATION BEHAVIOR
When the player has not specified a game or needs scoping without an obvious game question, ask for: (1) the **Game Title**, (2) their **current progress/chapter**, and (3) whether they want **subtle hints** or **full walkthroughs**.

# DOMAIN GUARDRAIL
If the user asks about a non-gaming topic (cooking, math homework, politics, etc.), set isOffTopic to true and replyText to EXACTLY: "I don't have knowledge about this subject."`;

const GUIDE_AGENT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isOffTopic: { type: Type.BOOLEAN },
    needsProgressCheck: { type: Type.BOOLEAN },
    replyText: { type: Type.STRING },
    detectedGame: { type: Type.STRING },
    detectedProgress: { type: Type.STRING },
    milestoneCompleted: { type: Type.STRING },
    suggestedNextStep: { type: Type.STRING },
  },
  required: ['isOffTopic', 'replyText'],
};

const BOSS_COACH_SYSTEM_INSTRUCTION = `# ROLE & OBJECTIVE
You are an elite AI Boss Fight Coach. Your sole mission is to help players analyze boss mechanics, survive lethal attack patterns, optimize their current gear/loadouts, and adapt after every attempt—delivering fast, mid-fight tactical callouts without spoiling later phases or story events.

# CORE COACHING RULES
1. PHASE-LOCKED SPOILER SHIELD:
   - Only explain mechanics for the boss phase(s) the player has currently reached (as indicated by Phase Cap).
   - Do not reveal secret second/third phases or surprise transformations unless Phase Cap is "Full Fight Breakdown" or the player explicitly asks for a "full fight breakdown" or confirms they reached that phase.
2. DEATH-DIAGNOSIS LOOP (ADAPTIVE COACHING):
   - Whenever the player reports how they died (e.g., "I keep getting one-shot by the fire sweep"), set isDeathDiagnosis to true and immediately identify:
     - **The Telegraph:** What visual or audio cue happens 0.5-1.5 seconds before that specific move.
     - **The Counter:** Exact directional dodge (e.g., dodge forward-left through the swing, never backward), parry timing, or safe zone.
     - **The Punish Window:** How many hits or heals are safe immediately afterward.
3. MID-ATTEMPT SCANNABILITY:
   - Players are reading between respawns. Keep every response punchy, structured, and under 200 words unless a full multi-phase breakdown is requested.
   - Bold **Attack Names**, **Telegraphs**, **Counters**, and **Elemental/Status Weaknesses**.
4. CURRENT-GEAR OPTIMIZATION:
   - Never tell a player to go farm a late-game item they don't have. Optimize using only the weapons, charms, spells, or stats they listed in Current Gear or can access at their current stage.

# RESPONSE TEMPLATE (USE FOR EVERY BOSS QUERY)
- **Quick Prep & Weakness:** Best damage type, status effect, or defensive charm/item for this fight.
- **Key Moves & Counters (Current Phase):**
  - **[Attack Name]:** *Telegraph* -> *Exact Dodge/Parry* -> *Safe Punish*.
- **#1 Rule to Survive:** One golden positioning or stamina/resource rule that prevents the most common wipe.

# SESSION START BEHAVIOR
If the user names a boss without context, give the **Quick Prep & Weakness**, **Phase 1 Key Moves & Counters**, and **#1 Rule to Survive**, then end by asking: "Which phase or specific attack is killing you right now?"

# DOMAIN GUARDRAIL
If the user asks about a non-gaming topic (cooking, math homework, politics, etc.), set isOffTopic to true and replyText to EXACTLY: "I don't have knowledge about this subject."`;

const BOSS_COACH_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isOffTopic: { type: Type.BOOLEAN },
    isDeathDiagnosis: { type: Type.BOOLEAN },
    detectedBoss: { type: Type.STRING },
    detectedGame: { type: Type.STRING },
    replyText: { type: Type.STRING },
  },
  required: ['isOffTopic', 'replyText'],
};

function sanitizeDifficulty(val?: string): BossGuide['difficulty'] {
  if (val === 'Standard' || val === 'Hard' || val === 'Extreme' || val === 'Nightmare') {
    return val;
  }
  return 'Hard';
}

function sanitizeGuideCategory(val?: string): GuideCategory {
  if (
    val === 'Story Walkthrough' ||
    val === 'Secrets & Collectibles' ||
    val === 'Trophy Roadmap' ||
    val === 'Mechanics & Combat' ||
    val === 'Beginner Essentials'
  ) {
    return val;
  }
  return 'Story Walkthrough';
}

function sanitizeGuideDifficulty(val?: string): GuideDifficulty {
  if (val === 'Beginner' || val === 'Intermediate' || val === 'Advanced') {
    return val;
  }
  return 'Intermediate';
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
  contents: string | { parts: Array<Record<string, unknown>> };
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
      const rawFocus =
        typeof req.body?.topicFocus === 'string' ? req.body.topicFocus.trim() : 'All Topics';
      const topicFocus = [
        'All Topics',
        'Boss & Combat',
        'Builds & Gear',
        'Hardware & Settings',
        'Achievements',
      ].includes(rawFocus)
        ? rawFocus
        : 'All Topics';

      if (!message) {
        return res.status(400).json({ error: 'Message prompt cannot be empty.' });
      }

      if (isDefinitelyOffTopic(message)) {
        return res.json({
          kind: 'refusal',
          text: STRICT_REFUSAL,
        });
      }

      const cacheKey = `chat:${topicFocus}:${message.toLowerCase()}`;
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

      const focusDirective =
        topicFocus !== 'All Topics'
          ? `\nPreferred tactical focus for this thread: ${topicFocus}.`
          : '';

      const promptPayload = trimmedHistory
        ? `Recent conversation:\n${trimmedHistory}${focusDirective}\n\nLatest user message: ${message}`
        : `${message}${focusDirective}`;

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

  app.post('/api/guide', async (req, res) => {
    try {
      const gameTitle = typeof req.body?.gameTitle === 'string' ? req.body.gameTitle.trim() : '';
      const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
      const category = sanitizeGuideCategory(
        typeof req.body?.category === 'string' ? req.body.category.trim() : undefined
      );
      const difficulty = sanitizeGuideDifficulty(
        typeof req.body?.difficulty === 'string' ? req.body.difficulty.trim() : undefined
      );

      if (!gameTitle || !topic) {
        return res.status(400).json({ error: 'Both Game Title and Guide Topic are required.' });
      }

      if (isDefinitelyOffTopic(`${gameTitle} ${topic}`)) {
        return res.json({ kind: 'refusal', error: STRICT_REFUSAL });
      }

      const cacheKey = `guide:${gameTitle.toLowerCase()}:${topic.toLowerCase()}:${category}:${difficulty}`;
      if (responseCache.has(cacheKey)) {
        return res.json(responseCache.get(cacheKey));
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
        });
      }

      const response = await generateFastWithFallback({
        contents: `Generate a detailed, accurate, step-by-step video game guide for "${gameTitle}" covering "${topic}". Category: ${category}. Experience level: ${difficulty}. Include 4 to 6 ordered actionable steps with specific locations where applicable, any missable warnings, prerequisites, and 2 concise pro tips. If this is NOT a real video game or gaming topic, set isValidGamingGuide to false.`,
        systemInstruction:
          'You are RADAHN, an expert video game guide author. Output accurate walkthrough steps, missable warnings, and mechanics tips exclusively for real video games. Never generate guides for non-gaming topics.',
        responseSchema: GAME_GUIDE_SCHEMA,
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        isValidGamingGuide?: boolean;
        guide?: {
          title?: string;
          gameTitle?: string;
          estimatedMinutes?: number;
          summary?: string;
          prerequisites?: string[];
          missableWarnings?: string[];
          steps?: Array<{
            stepNumber?: number;
            title?: string;
            detail?: string;
            location?: string;
          }>;
          proTips?: string[];
        };
      };

      if (!parsed.isValidGamingGuide || !parsed.guide || !Array.isArray(parsed.guide.steps) || parsed.guide.steps.length === 0) {
        return res.json({ kind: 'refusal', error: STRICT_REFUSAL });
      }

      const raw = parsed.guide;
      const nowIso = new Date().toISOString();
      const baseId = `custom-guide-${Date.now()}`;
      const guide: GameGuide = {
        id: baseId,
        title: (raw.title || topic).trim(),
        gameTitle: (raw.gameTitle || gameTitle).trim(),
        category,
        difficulty,
        estimatedMinutes:
          typeof raw.estimatedMinutes === 'number' && raw.estimatedMinutes > 0
            ? Math.min(120, Math.round(raw.estimatedMinutes))
            : 15,
        summary: (raw.summary || `Step-by-step ${category.toLowerCase()} guide for ${gameTitle}.`).trim(),
        prerequisites: Array.isArray(raw.prerequisites)
          ? raw.prerequisites.filter((p) => typeof p === 'string' && p.trim().length > 0)
          : [],
        missableWarnings: Array.isArray(raw.missableWarnings)
          ? raw.missableWarnings.filter((w) => typeof w === 'string' && w.trim().length > 0)
          : [],
        steps: (raw.steps ?? []).map((step, idx) => ({
          id: `${baseId}-step-${idx + 1}`,
          stepNumber: typeof step.stepNumber === 'number' ? step.stepNumber : idx + 1,
          title: (step.title || `Step ${idx + 1}`).trim(),
          detail: (step.detail || '').trim(),
          location: typeof step.location === 'string' && step.location.trim() ? step.location.trim() : undefined,
          completed: false,
        })),
        proTips: Array.isArray(raw.proTips)
          ? raw.proTips.filter((t) => typeof t === 'string' && t.trim().length > 0)
          : [],
        bookmarked: true,
        isCustom: true,
        updatedAt: nowIso,
      };

      const payload = { guide };
      setCachedResponse(cacheKey, payload);
      return res.json(payload);
    } catch (err) {
      const { status, message } = getApiErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/guide-agent', async (req, res) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      const gameTitle = typeof req.body?.gameTitle === 'string' ? req.body.gameTitle.trim() : '';
      const currentProgress =
        typeof req.body?.currentProgress === 'string' ? req.body.currentProgress.trim() : '';
      const hintPreference = normalizeHintPreference(
        typeof req.body?.hintPreference === 'string' ? req.body.hintPreference : undefined
      );
      const milestones = Array.isArray(req.body?.milestones)
        ? req.body.milestones
            .filter((m: unknown) => typeof m === 'string' && m.trim().length > 0)
            .slice(-12)
        : [];
      const history = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];
      const imageBase64 =
        typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64.trim() : '';
      const imageMimeType =
        typeof req.body?.imageMimeType === 'string' && req.body.imageMimeType.startsWith('image/')
          ? req.body.imageMimeType.trim()
          : 'image/png';

      const hasImage = imageBase64.length > 0;
      if (!message && !hasImage) {
        return res.status(400).json({ error: 'Enter a question or attach a screenshot first.' });
      }

      if (message && !hasImage && isDefinitelyOffTopic(message)) {
        return res.json({
          kind: 'refusal',
          isOffTopic: true,
          replyText: STRICT_REFUSAL,
        });
      }

      if (needsInitialGameScope(message, gameTitle, hasImage)) {
        return res.json({
          kind: 'initialization',
          isOffTopic: false,
          needsProgressCheck: true,
          replyText: buildInitializationPrompt(),
        });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
        });
      }

      const modeDirective =
        hintPreference === 'hint'
          ? 'Hint Mode (subtle directional clue first; zero late-area spoilers)'
          : hintPreference === 'walkthrough'
          ? 'Walkthrough Mode (full step-by-step instructions within current stage)'
          : 'Auto (subtle hint if player asks for a hint/nudge; full walkthrough if stuck or asking how to beat/reach)';

      const historyText = history
        .map((m: { role?: string; content?: string }) =>
          `${m.role === 'user' ? 'Player' : 'Guide Agent'}: ${String(m.content || '').slice(0, 450)}`
        )
        .join('\n');

      const promptText = [
        `Active Game Title: ${gameTitle || 'Not set yet (detect if player mentions one, otherwise ask during initialization)'}`,
        `Current Progress / Spoiler Shield Boundary: ${currentProgress || 'Unknown'}`,
        `Guidance Mode: ${modeDirective}`,
        milestones.length > 0 ? `Completed Milestones: ${milestones.join(' | ')}` : '',
        historyText ? `Recent Session History:\n${historyText}` : '',
        `Player Query: ${message || 'Analyze this screenshot and tell me what to do next without spoiling ahead.'}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const contentsPayload = hasImage
        ? {
            parts: [
              {
                inlineData: {
                  mimeType: imageMimeType,
                  data: imageBase64,
                },
              },
              { text: promptText },
            ],
          }
        : promptText;

      const response = await generateFastWithFallback({
        contents: contentsPayload,
        systemInstruction: GUIDE_AGENT_SYSTEM_INSTRUCTION,
        responseSchema: GUIDE_AGENT_RESPONSE_SCHEMA,
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        isOffTopic?: boolean;
        needsProgressCheck?: boolean;
        replyText?: string;
        detectedGame?: string;
        detectedProgress?: string;
        milestoneCompleted?: string;
        suggestedNextStep?: string;
      };

      if (parsed.isOffTopic) {
        return res.json({
          kind: 'refusal',
          isOffTopic: true,
          replyText: STRICT_REFUSAL,
        });
      }

      return res.json({
        kind: 'guide_reply',
        isOffTopic: false,
        needsProgressCheck: Boolean(parsed.needsProgressCheck),
        replyText: (parsed.replyText || buildInitializationPrompt()).trim(),
        detectedGame: typeof parsed.detectedGame === 'string' ? parsed.detectedGame.trim() : '',
        detectedProgress:
          typeof parsed.detectedProgress === 'string' ? parsed.detectedProgress.trim() : '',
        milestoneCompleted:
          typeof parsed.milestoneCompleted === 'string' ? parsed.milestoneCompleted.trim() : '',
        suggestedNextStep:
          typeof parsed.suggestedNextStep === 'string' ? parsed.suggestedNextStep.trim() : '',
      });
    } catch (err) {
      const { status, message } = getApiErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/boss-coach', async (req, res) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      const bossName = typeof req.body?.bossName === 'string' ? req.body.bossName.trim() : '';
      const gameTitle = typeof req.body?.gameTitle === 'string' ? req.body.gameTitle.trim() : '';
      const currentGear =
        typeof req.body?.currentGear === 'string' ? req.body.currentGear.trim() : '';
      const requestedPhase = normalizePhaseCap(
        typeof req.body?.reachedPhase === 'string' ? req.body.reachedPhase : undefined
      );
      const effectivePhase = isFullBreakdownRequest(message) ? 'full' : requestedPhase;
      const history = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];

      if (!message) {
        return res.status(400).json({ error: 'Enter a boss name, attack, or gear question.' });
      }

      if (isDefinitelyOffTopic(message)) {
        return res.json({
          kind: 'refusal',
          isOffTopic: true,
          replyText: STRICT_REFUSAL,
        });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
        });
      }

      const historyText = history
        .map((m: { role?: string; content?: string }) =>
          `${m.role === 'user' ? 'Player' : 'Boss Coach'}: ${String(m.content || '').slice(0, 400)}`
        )
        .join('\n');

      const promptText = [
        `Target Boss: ${bossName || 'Not locked yet (detect from player query if mentioned)'}`,
        `Game Title: ${gameTitle || 'Not specified yet'}`,
        `Phase Cap (Strict Spoiler Shield): ${formatPhaseLabel(effectivePhase)}`,
        `Player Current Gear / Build: ${currentGear || 'Not specified — suggest universally early/mid accessible counters only, never late-game farming'}`,
        historyText ? `Recent Coaching Turns:\n${historyText}` : '',
        `Player Callout: ${message}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await generateFastWithFallback({
        contents: promptText,
        systemInstruction: BOSS_COACH_SYSTEM_INSTRUCTION,
        responseSchema: BOSS_COACH_RESPONSE_SCHEMA,
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        isOffTopic?: boolean;
        isDeathDiagnosis?: boolean;
        detectedBoss?: string;
        detectedGame?: string;
        replyText?: string;
      };

      if (parsed.isOffTopic) {
        return res.json({
          kind: 'refusal',
          isOffTopic: true,
          replyText: STRICT_REFUSAL,
        });
      }

      return res.json({
        kind: 'coach_reply',
        isOffTopic: false,
        phaseUsed: effectivePhase,
        isDeathDiagnosis: Boolean(parsed.isDeathDiagnosis) || isDeathReport(message),
        detectedBoss: typeof parsed.detectedBoss === 'string' ? parsed.detectedBoss.trim() : '',
        detectedGame: typeof parsed.detectedGame === 'string' ? parsed.detectedGame.trim() : '',
        replyText: (parsed.replyText || 'Name a boss and tell me which attack is hitting you.').trim(),
      });
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

  async function generateGamingNewsPulse(
    rawPlatform: string,
    forceRefresh = false
  ): Promise<GamingNewsPulse> {
    const platformFilter = (NEWS_PLATFORM_OPTIONS as readonly string[]).includes(rawPlatform)
      ? rawPlatform
      : 'All Platforms';

    const cacheKey = `news:${platformFilter}`;
    const cached = newsCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.payload;
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
        digestMessage: formatPulseDigest(agentItems, platformFilter),
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
      throw new Error('Live gaming news feeds are temporarily unreachable. Please retry shortly.');
    }

    newsCache.set(cacheKey, {
      expiresAt: Date.now() + 10 * 60 * 1000,
      payload,
    });

    return payload;
  }

  function getTelegramGatewayInfo(): TelegramGatewayInfo {
    const provider = process.env.TELEGRAM_BOT_TOKEN ? 'telegram_bot' : 'none';
    return {
      configured: provider !== 'none',
      provider,
    };
  }

  async function dispatchTelegramChannel(
    target: NormalizedTelegramTarget,
    telegramHtml: string
  ): Promise<{ sent: boolean; failed: boolean; detail: string }> {
    const gw = getTelegramGatewayInfo();

    if (gw.provider === 'telegram_bot') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN!;
      const chatId = target.apiChatId || process.env.TELEGRAM_DEFAULT_CHAT_ID || '';

      if (!chatId) {
        return {
          sent: false,
          failed: false,
          detail: `Telegram digest ready for ${target.normalized}`,
        };
      }

      try {
        const resp = await fetch(
          `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: telegramHtml,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
            }),
          }
        );

        const body = (await resp.json().catch(() => ({}))) as {
          ok?: boolean;
          description?: string;
        };

        if (!resp.ok || !body.ok) {
          return {
            sent: false,
            failed: true,
            detail: formatTelegramGatewayError(target.normalized, resp.status, body.description),
          };
        }

        return {
          sent: true,
          failed: false,
          detail: `Telegram sent to ${target.normalized}`,
        };
      } catch (err) {
        return {
          sent: false,
          failed: true,
          detail: `Telegram failed: ${err instanceof Error ? err.message : 'Network error'}`,
        };
      }
    }

    return {
      sent: false,
      failed: false,
      detail: `Telegram digest ready for ${target.normalized}`,
    };
  }

  const SCHEDULE_STORE_PATH = path.join(os.tmpdir(), 'radahn-news-schedules-telegram-v1.json');
  const DEFAULT_SCHEDULE_ID = 'default';

  const DEFAULT_NEWS_SCHEDULE: DailyNewsScheduleConfig = {
    enabled: false,
    telegramTarget: '',
    platformFilter: 'All Platforms',
    sendTimes: [DEFAULT_SCHEDULE_TIME],
    timeZone: 'UTC',
    lastDispatchedSlotKeys: [],
    lastDeliveryStatus: 'idle',
    lastDispatch: null,
  };

  function loadScheduleMap(): Map<string, DailyNewsScheduleConfig> {
    const map = new Map<string, DailyNewsScheduleConfig>();
    try {
      if (fs.existsSync(SCHEDULE_STORE_PATH)) {
        const raw = fs.readFileSync(SCHEDULE_STORE_PATH, 'utf8');
        const parsed = JSON.parse(raw) as Record<string, DailyNewsScheduleConfig>;
        for (const [k, v] of Object.entries(parsed)) {
          if (v && typeof v === 'object') {
            map.set(k, {
              ...DEFAULT_NEWS_SCHEDULE,
              ...v,
              sendTimes: normalizeSendTimes(v.sendTimes),
            });
          }
        }
      }
    } catch {
      // Fall back to fresh in-memory schedule store
    }
    return map;
  }

  const scheduleStore = loadScheduleMap();

  function persistScheduleMap() {
    try {
      const obj = Object.fromEntries(scheduleStore.entries());
      fs.writeFileSync(SCHEDULE_STORE_PATH, JSON.stringify(obj, null, 2), 'utf8');
    } catch {
      // Ignore write failures in read-only environments
    }
  }

  let scheduleRunInFlight = false;

  async function executeScheduledDispatch(
    scheduleKey: string,
    config: DailyNewsScheduleConfig,
    scheduledSlot = 'manual',
    slotKey?: string,
    forceRefresh = true,
    persistSchedule = true
  ): Promise<{ schedule: DailyNewsScheduleConfig; pulse: GamingNewsPulse }> {
    const targetCheck = normalizeTelegramTarget(config.telegramTarget);
    if (!targetCheck.valid) {
      throw new Error(targetCheck.error || 'Enter a valid Telegram @username, phone number, or Chat ID.');
    }

    const pulse = await generateGamingNewsPulse(config.platformFilter, forceRefresh);
    const telegramHtml = formatTelegramHtmlPulse(pulse.items, pulse.platformFilter);
    const result = await dispatchTelegramChannel(targetCheck, telegramHtml);

    const status: DailyDispatchStatus = result.sent
      ? 'sent_via_api'
      : result.failed
        ? 'failed'
        : 'ready_for_dispatch';

    const detail =
      status === 'failed'
        ? `${result.detail}. Digest is ready — use the Send via Telegram button below to open Telegram immediately.`
        : result.detail;

    const clock = getLocalClockParts(new Date(), config.timeZone);
    const nowIso = new Date().toISOString();

    const dispatchRecord: DailyDispatchRecord = {
      dispatchedAt: nowIso,
      localDate: clock.localDate,
      scheduledSlot,
      telegramTarget: targetCheck.normalized,
      platformFilter: pulse.platformFilter,
      status,
      detail,
      digestMessage: pulse.digestMessage,
      items: pulse.items,
    };

    const nextSlotKeys = slotKey
      ? Array.from(new Set([...(config.lastDispatchedSlotKeys ?? []), slotKey])).slice(-20)
      : config.lastDispatchedSlotKeys ?? [];

    const updated: DailyNewsScheduleConfig = {
      ...config,
      telegramTarget: targetCheck.normalized,
      sendTimes: normalizeSendTimes(config.sendTimes),
      lastDispatchedSlotKeys: nextSlotKeys,
      lastDispatchedAt: nowIso,
      lastDeliveryStatus: status,
      lastDeliveryDetail: detail,
      lastDispatch: dispatchRecord,
    };

    if (persistSchedule) {
      scheduleStore.set(scheduleKey, updated);
      persistScheduleMap();
    }

    return { schedule: updated, pulse };
  }

  async function checkDueDailySchedules() {
    if (scheduleRunInFlight) return;
    scheduleRunInFlight = true;
    try {
      const now = new Date();
      for (const [key, config] of scheduleStore.entries()) {
        const due = findDueScheduleSlot(config, now);
        if (due) {
          try {
            await executeScheduledDispatch(key, config, due.slot, due.slotKey, true, true);
          } catch (err) {
            console.error('[DailyNewsScheduler] Dispatch error:', err);
          }
        }
      }
    } finally {
      scheduleRunInFlight = false;
    }
  }

  const dailySchedulerTimer = setInterval(() => {
    void checkDueDailySchedules();
  }, 30_000);
  if (typeof dailySchedulerTimer.unref === 'function') {
    dailySchedulerTimer.unref();
  }

  app.post('/api/news/pulse', async (req, res) => {
    try {
      const rawPlatform =
        typeof req.body?.platformFilter === 'string'
          ? req.body.platformFilter.trim()
          : 'All Platforms';
      const forceRefresh = Boolean(req.body?.forceRefresh);
      const payload = await generateGamingNewsPulse(rawPlatform, forceRefresh);
      return res.json(payload);
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('unreachable')
          ? err.message
          : null;
      if (msg) {
        return res.status(503).json({ error: msg });
      }
      const { status, message } = getApiErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  app.get('/api/news/schedule', (_req, res) => {
    const schedule = scheduleStore.get(DEFAULT_SCHEDULE_ID) ?? DEFAULT_NEWS_SCHEDULE;
    return res.json({
      schedule,
      gateway: getTelegramGatewayInfo(),
    });
  });

  app.put('/api/news/schedule', (req, res) => {
    try {
      const existing = scheduleStore.get(DEFAULT_SCHEDULE_ID) ?? DEFAULT_NEWS_SCHEDULE;
      const enabled = Boolean(req.body?.enabled);
      const rawTelegram =
        typeof req.body?.telegramTarget === 'string'
          ? req.body.telegramTarget.trim()
          : existing.telegramTarget;

      const targetCheck = normalizeTelegramTarget(rawTelegram);
      if (enabled && !targetCheck.valid) {
        return res.status(400).json({
          error:
            targetCheck.error ||
            'Enter a valid Telegram @username, phone number, or numeric Chat ID.',
        });
      }

      const rawPlatform =
        typeof req.body?.platformFilter === 'string'
          ? req.body.platformFilter.trim()
          : existing.platformFilter;
      const platformFilter = (NEWS_PLATFORM_OPTIONS as readonly string[]).includes(rawPlatform)
        ? rawPlatform
        : 'All Platforms';

      const sendTimes = normalizeSendTimes(req.body?.sendTimes ?? existing.sendTimes);
      const timeZone = sanitizeTimeZone(
        typeof req.body?.timeZone === 'string' ? req.body.timeZone : existing.timeZone
      );

      const updated: DailyNewsScheduleConfig = {
        ...existing,
        enabled,
        telegramTarget: targetCheck.valid ? targetCheck.normalized : rawTelegram,
        platformFilter,
        sendTimes,
        timeZone,
      };

      scheduleStore.set(DEFAULT_SCHEDULE_ID, updated);
      persistScheduleMap();

      return res.json({
        schedule: updated,
        gateway: getTelegramGatewayInfo(),
      });
    } catch (err) {
      const { status, message } = getApiErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/news/schedule/run-now', async (req, res) => {
    try {
      const existing = scheduleStore.get(DEFAULT_SCHEDULE_ID) ?? DEFAULT_NEWS_SCHEDULE;
      const rawTelegram =
        typeof req.body?.telegramTarget === 'string'
          ? req.body.telegramTarget.trim()
          : existing.telegramTarget;

      const targetCheck = normalizeTelegramTarget(rawTelegram);
      if (!targetCheck.valid) {
        return res.status(400).json({
          error:
            targetCheck.error ||
            'Enter a valid Telegram @username, phone number, or numeric Chat ID first.',
        });
      }

      const rawPlatform =
        typeof req.body?.platformFilter === 'string'
          ? req.body.platformFilter.trim()
          : existing.platformFilter;
      const platformFilter = (NEWS_PLATFORM_OPTIONS as readonly string[]).includes(rawPlatform)
        ? rawPlatform
        : 'All Platforms';

      const sendTimes = normalizeSendTimes(req.body?.sendTimes ?? existing.sendTimes);
      const timeZone = sanitizeTimeZone(
        typeof req.body?.timeZone === 'string' ? req.body.timeZone : existing.timeZone
      );
      const slot =
        typeof req.body?.scheduledSlot === 'string' ? req.body.scheduledSlot.trim() : 'manual';
      const slotKey =
        typeof req.body?.slotKey === 'string' ? req.body.slotKey.trim() : undefined;

      // Preserve current enabled state on manual immediate send unless slotKey indicates scheduled run
      const keepEnabled = slotKey ? true : existing.enabled;

      const targetConfig: DailyNewsScheduleConfig = {
        ...existing,
        enabled: keepEnabled,
        telegramTarget: targetCheck.normalized,
        platformFilter,
        sendTimes,
        timeZone,
      };

      const { schedule, pulse } = await executeScheduledDispatch(
        DEFAULT_SCHEDULE_ID,
        targetConfig,
        slot,
        slotKey,
        true,
        true
      );

      return res.json({
        schedule,
        pulse,
        gateway: getTelegramGatewayInfo(),
      });
    } catch (err) {
      const { status, message } = getApiErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  const httpServer = http.createServer(app);
  const isProd = process.env.NODE_ENV === 'production';
  const hmrDisabled = process.env.DISABLE_HMR === 'true';

  if (!isProd) {
    if (hmrDisabled) {
      const noopViteClient = `
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) { return url; }
export class ErrorOverlay {}
`;
      app.get('/@vite/client', (_req, res) => {
        res.type('application/javascript').send(noopViteClient);
      });
    }

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
        allowedHosts: true,
      },
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
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`RADAHN server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
