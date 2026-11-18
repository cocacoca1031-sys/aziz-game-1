import type {
  BossCoachMessage,
  BossCoachSessionState,
  BossPhaseCap,
} from '../types/gaming.ts';

export const BOSS_COACH_WELCOME_MESSAGE: BossCoachMessage = {
  id: 'boss-coach-welcome',
  role: 'agent',
  content:
    'AI Boss Fight Coach ready with **Phase-Locked Spoiler Shield** active. Name any **boss** for quick prep & Phase 1 counters—or paste **what attack killed you** and **your current gear** for instant mid-attempt adaptation.',
  timestamp: '2026-11-18T00:00:00.000Z',
};

export function createDefaultBossCoachState(
  overrides?: Partial<BossCoachSessionState>
): BossCoachSessionState {
  return {
    bossName: '',
    gameTitle: '',
    reachedPhase: 'phase1',
    currentGear: '',
    attemptsLogged: 0,
    messages: [BOSS_COACH_WELCOME_MESSAGE],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function normalizePhaseCap(val?: string): BossPhaseCap {
  if (val === 'phase1' || val === 'phase2' || val === 'full') {
    return val;
  }
  return 'phase1';
}

export function formatPhaseLabel(phase: BossPhaseCap): string {
  if (phase === 'phase1') return 'Phase 1 Only';
  if (phase === 'phase2') return 'Up to Phase 2';
  return 'Full Fight Breakdown';
}

const DEATH_DIAGNOSIS_RE =
  /\b(died|killed|killing me|one[- ]shot|oneshot|wiped|destroy(?:ed|s) me|keep getting hit|keeps hitting|cant dodge|can't dodge|stuck on)\b/i;

export function isDeathReport(message: string): boolean {
  return DEATH_DIAGNOSIS_RE.test(message);
}

const FULL_BREAKDOWN_RE =
  /\b(full fight breakdown|full breakdown|all phases|every phase|show all phases)\b/i;

export function isFullBreakdownRequest(message: string): boolean {
  return FULL_BREAKDOWN_RE.test(message);
}

export function appendBossCoachTurn(
  state: BossCoachSessionState,
  userMessage: BossCoachMessage,
  agentMessage: BossCoachMessage,
  updates?: {
    detectedBoss?: string;
    detectedGame?: string;
    isDeathDiagnosis?: boolean;
  }
): BossCoachSessionState {
  const nextBoss =
    updates?.detectedBoss && updates.detectedBoss.trim() && !state.bossName.trim()
      ? updates.detectedBoss.trim()
      : state.bossName;

  const nextGame =
    updates?.detectedGame && updates.detectedGame.trim() && !state.gameTitle.trim()
      ? updates.detectedGame.trim()
      : state.gameTitle;

  const countedAttempt =
    updates?.isDeathDiagnosis || isDeathReport(userMessage.content) ? 1 : 0;

  return {
    ...state,
    bossName: nextBoss,
    gameTitle: nextGame,
    attemptsLogged: state.attemptsLogged + countedAttempt,
    messages: [...state.messages, userMessage, agentMessage],
    updatedAt: new Date().toISOString(),
  };
}

export interface CoachInlineSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

export function formatCoachLines(content: string): string[] {
  const expanded = content
    .replace(/\r\n/g, '\n')
    .replace(/\s+(?=\*\*(?:Key Moves & Counters|The Telegraph|The Counter|The Punish Window|#1 Rule to Survive))/g, '\n')
    .replace(/\s+(?=-\s+\*\*)/g, '\n');
  return expanded.split('\n');
}

export function parseCoachInlineSegments(line: string): CoachInlineSegment[] {
  const segments: CoachInlineSegment[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;

  for (const match of line.matchAll(tokenRegex)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      segments.push({ text: line.slice(lastIndex, idx), bold: false, italic: false });
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      segments.push({ text: token.slice(2, -2), bold: true, italic: false });
    } else {
      segments.push({ text: token.slice(1, -1), bold: false, italic: true });
    }
    lastIndex = idx + token.length;
  }

  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), bold: false, italic: false });
  }

  return segments.length > 0 ? segments : [{ text: line, bold: false, italic: false }];
}

