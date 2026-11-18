import test from 'node:test';
import assert from 'node:assert/strict';
import type { DailyNewsScheduleConfig } from '../types/gaming';
import {
  buildTelegramTargetUrl,
  findDueScheduleSlot,
  formatLastRunSummary,
  formatTelegramGatewayError,
  getLocalClockParts,
  getNextRunLabel,
  normalizeSendTimes,
  normalizeTelegramTarget,
} from './newsSchedule';

test('normalizeTelegramTarget validates usernames, t.me links, phones, and numeric chat IDs', () => {
  assert.equal(normalizeTelegramTarget('@alex_gamer').kind, 'username');
  assert.equal(normalizeTelegramTarget('https://t.me/radahn_news').normalized, '@radahn_news');
  assert.equal(normalizeTelegramTarget('+1 555-123-4567').normalized, '+15551234567');
  assert.equal(normalizeTelegramTarget('-1001234567890').kind, 'chat_id');
  assert.equal(normalizeTelegramTarget('ab').valid, false);
  assert.equal(normalizeTelegramTarget('').valid, false);
});

test('normalizeSendTimes sorts deduplicated HH:MM slots and defaults to 09:00', () => {
  assert.deepEqual(normalizeSendTimes(['21:00', '09:00', 'bad', '09:00', '14:30']), [
    '09:00',
    '14:30',
    '21:00',
  ]);
  assert.deepEqual(normalizeSendTimes([]), ['09:00']);
});

test('findDueScheduleSlot triggers each configured daily time once per local date for Telegram', () => {
  const config: DailyNewsScheduleConfig = {
    enabled: true,
    telegramTarget: '@alex_gamer',
    platformFilter: 'All Platforms',
    sendTimes: ['09:00', '18:30'],
    timeZone: 'UTC',
    lastDispatchedSlotKeys: [],
  };

  assert.equal(findDueScheduleSlot(config, new Date('2026-11-17T08:59:00Z')), null);

  const due9 = findDueScheduleSlot(config, new Date('2026-11-17T09:05:00Z'));
  assert.equal(due9?.slot, '09:00');
  assert.equal(due9?.slotKey, '2026-11-17@09:00');

  const after9 = {
    ...config,
    lastDispatchedSlotKeys: ['2026-11-17@09:00'],
  };
  assert.equal(findDueScheduleSlot(after9, new Date('2026-11-17T18:29:00Z')), null);

  const due1830 = findDueScheduleSlot(after9, new Date('2026-11-17T18:30:00Z'));
  assert.equal(due1830?.slot, '18:30');
});

test('getLocalClockParts and getNextRunLabel compute next multi-time slot accurately', () => {
  const utc830 = new Date('2026-11-17T08:30:00Z');
  const paris = getLocalClockParts(utc830, 'Europe/Paris');
  assert.equal(paris.hour, 9);
  assert.equal(paris.minute, 30);

  const label = getNextRunLabel(
    {
      enabled: true,
      telegramTarget: '@alex_gamer',
      platformFilter: 'All Platforms',
      sendTimes: ['09:00', '20:00'],
      timeZone: 'Europe/Paris',
      lastDispatchedSlotKeys: ['2026-11-17@09:00'],
    },
    utc830
  );
  assert.ok(label.startsWith('Today at 20:00'));
});

test('buildTelegramTargetUrl supports username, phone, and share URL fallback', () => {
  const userUrl = buildTelegramTargetUrl('@radahn_fan', '🎮 Pulse');
  assert.ok(userUrl.startsWith('https://t.me/radahn_fan?text='));

  const phoneUrl = buildTelegramTargetUrl('+1 (555) 987-6543', '🎮 Pulse');
  assert.ok(phoneUrl.startsWith('https://t.me/+15559876543?text='));

  const chatIdUrl = buildTelegramTargetUrl('123456789', '🎮 Pulse');
  assert.ok(chatIdUrl.startsWith('https://t.me/share/url?'));
});

test('formatTelegramGatewayError and formatLastRunSummary return concise user messages', () => {
  const tgChatNotFound = formatTelegramGatewayError('@radahn_gamer', 400, 'Bad Request: chat not found');
  assert.ok(tgChatNotFound.includes('@radahn_gamer'));
  assert.ok(tgChatNotFound.includes('Chat ID'));

  assert.equal(
    formatLastRunSummary('failed', 'noisy detail'),
    'Digest ready · Use Send via Telegram below'
  );
  assert.equal(formatLastRunSummary('sent_via_api', 'ok'), 'Sent via Telegram Bot');
});
