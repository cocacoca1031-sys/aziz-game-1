import type {
  DailyDispatchStatus,
  DailyNewsScheduleConfig,
} from '../types/gaming.ts';

export const DEFAULT_SCHEDULE_TIME = '09:00';
export const PRESET_SCHEDULE_TIMES = ['09:00', '12:00', '18:00', '21:00'] as const;

export type TelegramTargetKind = 'username' | 'phone' | 'chat_id' | 'invalid';

export interface NormalizedTelegramTarget {
  valid: boolean;
  kind: TelegramTargetKind;
  normalized: string;
  apiChatId?: string;
  error?: string;
}

export function normalizeTelegramTarget(rawInput: string): NormalizedTelegramTarget {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      valid: false,
      kind: 'invalid',
      normalized: '',
      error: 'Enter your Telegram @username, phone number (+15551234567), or numeric Chat ID.',
    };
  }

  const tmeMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?t\.me\/(@?[a-zA-Z0-9_]{5,32})\/?$/i);
  const candidate = tmeMatch ? `@${tmeMatch[1].replace(/^@/, '')}` : trimmed;

  if (/^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(candidate)) {
    return {
      valid: true,
      kind: 'username',
      normalized: candidate,
      apiChatId: candidate,
    };
  }

  if (/^-?\d{5,16}$/.test(candidate) && !candidate.startsWith('+')) {
    return {
      valid: true,
      kind: 'chat_id',
      normalized: candidate,
      apiChatId: candidate,
    };
  }

  const digits = candidate.replace(/[^\d]/g, '');
  if (digits.length >= 7 && digits.length <= 15 && /^[+\d\s().-]+$/.test(candidate)) {
    return {
      valid: true,
      kind: 'phone',
      normalized: `+${digits}`,
    };
  }

  return {
    valid: false,
    kind: 'invalid',
    normalized: trimmed,
    error: 'Use a valid Telegram @username (5+ chars), phone (+15551234567), or numeric Chat ID.',
  };
}

export function isValidTimeSlot(raw: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(raw.trim());
}

export function normalizeSendTimes(rawTimes: unknown): string[] {
  if (!Array.isArray(rawTimes)) {
    return [DEFAULT_SCHEDULE_TIME];
  }
  const unique = new Set<string>();
  for (const item of rawTimes) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (isValidTimeSlot(trimmed)) {
      unique.add(trimmed);
    }
  }
  if (unique.size === 0) {
    return [DEFAULT_SCHEDULE_TIME];
  }
  return Array.from(unique).sort();
}

export interface LocalClockParts {
  localDate: string;
  hour: number;
  minute: number;
  timeZone: string;
}

export function sanitizeTimeZone(rawTimeZone?: string): string {
  const candidate = (rawTimeZone || '').trim();
  if (!candidate) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return 'UTC';
  }
}

export function getLocalClockParts(now: Date, rawTimeZone?: string): LocalClockParts {
  const timeZone = sanitizeTimeZone(rawTimeZone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const map = new Map<string, string>();
  for (const p of parts) {
    if (p.type !== 'literal') {
      map.set(p.type, p.value);
    }
  }

  const year = map.get('year') ?? '1970';
  const month = map.get('month') ?? '01';
  const day = map.get('day') ?? '01';
  const rawHour = Number(map.get('hour') ?? '0');
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(map.get('minute') ?? '0');

  return {
    localDate: `${year}-${month}-${day}`,
    hour,
    minute,
    timeZone,
  };
}

export interface DueScheduleMatch {
  slot: string;
  slotKey: string;
  localDate: string;
}

export function findDueScheduleSlot(
  config: DailyNewsScheduleConfig,
  now: Date = new Date()
): DueScheduleMatch | null {
  if (!config.enabled) return null;
  const targetCheck = normalizeTelegramTarget(config.telegramTarget);
  if (!targetCheck.valid) return null;

  const slots = normalizeSendTimes(config.sendTimes);
  const local = getLocalClockParts(now, config.timeZone);
  const currentMinutes = local.hour * 60 + local.minute;
  const completedKeys = new Set(config.lastDispatchedSlotKeys ?? []);

  for (const slot of slots) {
    const [hh, mm] = slot.split(':').map(Number);
    const slotMinutes = hh * 60 + mm;
    const slotKey = `${local.localDate}@${slot}`;
    if (currentMinutes >= slotMinutes && !completedKeys.has(slotKey)) {
      return {
        slot,
        slotKey,
        localDate: local.localDate,
      };
    }
  }

  return null;
}

export function getNextRunLabel(
  config: DailyNewsScheduleConfig,
  now: Date = new Date()
): string {
  if (!config.enabled) return 'Paused';
  const slots = normalizeSendTimes(config.sendTimes);
  const local = getLocalClockParts(now, config.timeZone);
  const currentMinutes = local.hour * 60 + local.minute;
  const completedKeys = new Set(config.lastDispatchedSlotKeys ?? []);

  for (const slot of slots) {
    const [hh, mm] = slot.split(':').map(Number);
    const slotMinutes = hh * 60 + mm;
    const slotKey = `${local.localDate}@${slot}`;
    if (slotMinutes > currentMinutes && !completedKeys.has(slotKey)) {
      return `Today at ${slot} (${local.timeZone})`;
    }
    if (slotMinutes === currentMinutes && !completedKeys.has(slotKey)) {
      return `Now · ${slot} (${local.timeZone})`;
    }
  }

  return `Tomorrow at ${slots[0]} (${local.timeZone})`;
}

export function buildTelegramTargetUrl(targetRaw: string, message: string): string {
  const target = normalizeTelegramTarget(targetRaw);
  const encodedText = encodeURIComponent(message);

  if (target.kind === 'username') {
    const handle = target.normalized.replace(/^@/, '');
    return `https://t.me/${handle}?text=${encodedText}`;
  }

  if (target.kind === 'phone') {
    const digits = target.normalized.replace(/[^\d]/g, '');
    return `https://t.me/+${digits}?text=${encodedText}`;
  }

  return `https://t.me/share/url?url=${encodeURIComponent('https://t.me')}&text=${encodedText}`;
}

export function formatTelegramGatewayError(
  targetLabel: string,
  status: number,
  description?: string
): string {
  const desc = (description || '').replace(/[\r\n]+/g, ' ').trim();
  if (/chat not found|user not found|peer_id_invalid/i.test(desc)) {
    return `Telegram Bot couldn't reach ${targetLabel} directly (message your bot first or use a numeric Chat ID)`;
  }
  if (status === 401 || /unauthorized/i.test(desc)) {
    return `Telegram Bot authentication failed (HTTP ${status || 401})`;
  }
  if (/bot was blocked/i.test(desc)) {
    return `Telegram Bot is blocked by ${targetLabel}`;
  }
  return `Telegram error: ${(desc || `HTTP ${status}`).slice(0, 90)}`;
}

export function formatLastRunSummary(status?: DailyDispatchStatus, detail?: string): string {
  if (status === 'sent_via_api') {
    return 'Sent via Telegram Bot';
  }
  if (status === 'failed') {
    return 'Digest ready · Use Send via Telegram below';
  }
  if (status === 'ready_for_dispatch') {
    return 'Digest ready for Telegram';
  }
  return detail || 'Prepared Top 5 digest';
}
