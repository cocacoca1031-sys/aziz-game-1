import type { BossGuide } from '../types/gaming.ts';

export const VOICE_PRESETS = [
  { id: 'Fenrir', label: 'Fenrir (Commanding)' },
  { id: 'Charon', label: 'Charon (Gravelly)' },
  { id: 'Kore', label: 'Kore (Crisp)' },
  { id: 'Puck', label: 'Puck (Energetic)' },
  { id: 'Zephyr', label: 'Zephyr (Calm)' },
] as const;

export type VoicePresetId = (typeof VOICE_PRESETS)[number]['id'];

export const DEFAULT_VOICE_PRESET: VoicePresetId = 'Fenrir';

const ALLOWED_VOICE_SET = new Set<string>(VOICE_PRESETS.map((v) => v.id));

export function normalizeVoiceName(voice?: string): VoicePresetId {
  if (voice && ALLOWED_VOICE_SET.has(voice)) {
    return voice as VoicePresetId;
  }
  return DEFAULT_VOICE_PRESET;
}

export function sanitizeSpeechText(text: string, maxChars = 1400): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  const sliced = cleaned.slice(0, maxChars);
  const lastPeriod = Math.max(
    sliced.lastIndexOf('. '),
    sliced.lastIndexOf('! '),
    sliced.lastIndexOf('? ')
  );
  if (lastPeriod > maxChars * 0.5) {
    return sliced.slice(0, lastPeriod + 1).trim();
  }
  return `${sliced.trim()}...`;
}

export function buildBossBriefingScript(guide: BossGuide): string {
  const parts: string[] = [
    `${guide.bossName}, from ${guide.gameTitle}. Difficulty: ${guide.difficulty}.`,
  ];

  if (guide.arenaLocation) {
    parts.push(`Arena: ${guide.arenaLocation}.`);
  }

  parts.push(guide.summary);

  if (guide.weaknesses && guide.weaknesses.length > 0) {
    parts.push(`Key counters: ${guide.weaknesses.join(', ')}.`);
  }

  for (const phase of guide.phases.slice(0, 3)) {
    const topPattern = phase.attackPatterns[0] ?? '';
    const topWindow = phase.safeWindows[0] ?? '';
    parts.push(
      `Phase ${phase.phaseNumber}, ${phase.title} (${phase.hpThreshold}). ${topPattern} Safe window: ${topWindow}`
    );
  }

  if (guide.dodgingTips[0]) {
    parts.push(`Evade tip: ${guide.dodgingTips[0]}`);
  }

  const primaryLoadout = guide.loadouts[0];
  if (primaryLoadout) {
    parts.push(
      `Recommended ${primaryLoadout.playstyle} weapon: ${primaryLoadout.weapon}.`
    );
  }

  return sanitizeSpeechText(parts.join(' '), 1400);
}

export function getSpeechSynthesisProfile(voiceName: VoicePresetId): {
  pitch: number;
  rate: number;
} {
  switch (voiceName) {
    case 'Charon':
      return { pitch: 0.78, rate: 0.95 };
    case 'Kore':
      return { pitch: 1.06, rate: 1.02 };
    case 'Puck':
      return { pitch: 1.12, rate: 1.06 };
    case 'Zephyr':
      return { pitch: 0.98, rate: 0.96 };
    case 'Fenrir':
    default:
      return { pitch: 0.85, rate: 0.98 };
  }
}
