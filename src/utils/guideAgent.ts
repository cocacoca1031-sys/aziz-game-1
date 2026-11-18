import type {
  GuideAgentMessage,
  GuideAgentSessionState,
  GuideHintPreference,
} from '../types/gaming.ts';

export const GUIDE_AGENT_WELCOME_MESSAGE: GuideAgentMessage = {
  id: 'guide-agent-welcome',
  role: 'agent',
  content:
    'Guide Agent online with Spoiler Shield active. Tell me:\n1. **Game Title** you are playing\n2. **Your current progress / chapter** (so I never spoil what is ahead)\n3. Whether you want **subtle hints** or **full walkthroughs**\n\nYou can also attach or paste a **screenshot** of your map, boss, puzzle, or loadout.',
  timestamp: '2026-11-18T00:00:00.000Z',
};

export function createDefaultGuideAgentState(
  overrides?: Partial<GuideAgentSessionState>
): GuideAgentSessionState {
  return {
    gameTitle: '',
    currentProgress: '',
    hintPreference: 'auto',
    milestones: [],
    messages: [GUIDE_AGENT_WELCOME_MESSAGE],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const VAGUE_GREETING_RE =
  /^(hi|hello|hey|yo|sup|help|help me|stuck|i am stuck|i'm stuck|start|guide me|what should i do|what next|where do i go)[!.?\s]*$/i;

export function needsInitialGameScope(
  message: string,
  gameTitle: string,
  hasImage: boolean
): boolean {
  if (hasImage) return false;
  if (gameTitle.trim().length > 0) return false;
  return VAGUE_GREETING_RE.test(message.trim());
}

export function buildInitializationPrompt(): string {
  return 'Before I guide you without spoilers, tell me:\n1. **Game Title** you are playing\n2. **Current progress or chapter** (boss, zone, or quest)\n3. Whether you want **subtle hints** or **full walkthroughs**';
}

export function normalizeHintPreference(val?: string): GuideHintPreference {
  if (val === 'hint' || val === 'walkthrough' || val === 'auto') {
    return val;
  }
  return 'auto';
}

export function appendGuideAgentTurn(
  state: GuideAgentSessionState,
  userMessage: GuideAgentMessage,
  agentMessage: GuideAgentMessage,
  updates?: {
    detectedGame?: string;
    detectedProgress?: string;
    milestoneCompleted?: string;
  }
): GuideAgentSessionState {
  const nextGameTitle =
    updates?.detectedGame && updates.detectedGame.trim() && !state.gameTitle.trim()
      ? updates.detectedGame.trim()
      : state.gameTitle;

  const nextProgress =
    updates?.detectedProgress && updates.detectedProgress.trim()
      ? updates.detectedProgress.trim()
      : state.currentProgress;

  const trimmedMilestone = updates?.milestoneCompleted?.trim() ?? '';
  const hasMilestone =
    trimmedMilestone.length > 0 &&
    !state.milestones.some((m) => m.toLowerCase() === trimmedMilestone.toLowerCase());

  const nextMilestones = hasMilestone
    ? [...state.milestones, trimmedMilestone]
    : state.milestones;

  return {
    ...state,
    gameTitle: nextGameTitle,
    currentProgress: nextProgress,
    milestones: nextMilestones,
    messages: [...state.messages, userMessage, agentMessage],
    updatedAt: new Date().toISOString(),
  };
}

export interface TextSegment {
  text: string;
  bold: boolean;
}

export function parseBoldMarkdownSegments(text: string): TextSegment[] {
  if (!text) return [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const segments: TextSegment[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      segments.push({ text: part.slice(2, -2), bold: true });
    } else {
      segments.push({ text: part, bold: false });
    }
  }
  return segments;
}
