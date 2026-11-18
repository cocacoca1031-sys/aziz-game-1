import test from 'node:test';
import assert from 'node:assert/strict';
import type { ChatMessage } from '../types/gaming';
import {
  DEFAULT_SESSION_TITLE,
  appendMessagesToSession,
  countUserMessages,
  createChatSession,
  deleteChatSession,
  deriveSessionTitle,
  filterAndSortSessions,
  formatRelativeSessionTime,
  migrateLegacyChatMessages,
  renameChatSession,
  setSessionTopicFocus,
  toggleSessionPin,
} from './chatHistory';

const WELCOME: ChatMessage[] = [
  {
    id: 'welcome-1',
    role: 'agent',
    kind: 'general_gaming',
    timestamp: '2026-11-18T00:00:00Z',
    content: 'RADAHN ready.',
  },
];

test('createChatSession and deriveSessionTitle auto-title cleanly from first user prompt', () => {
  const session = createChatSession(WELCOME, 'Boss & Combat', new Date('2026-11-18T01:00:00Z'));
  assert.equal(session.title, DEFAULT_SESSION_TITLE);
  assert.equal(session.topicFocus, 'Boss & Combat');
  assert.equal(session.messages.length, 1);

  const userMsg: ChatMessage = {
    id: 'u-1',
    role: 'user',
    kind: 'general_gaming',
    content: 'How do I dodge Malenia Waterfowl Dance at close range in Elden Ring?',
    timestamp: '2026-11-18T01:02:00Z',
  };

  const updated = appendMessagesToSession(
    [session],
    session.id,
    [userMsg],
    new Date('2026-11-18T01:02:00Z')
  );
  assert.ok(updated[0].title.startsWith('How do I dodge Malenia'));
  assert.ok(updated[0].title.length <= 44);
  assert.equal(countUserMessages(updated[0]), 1);
  assert.equal(deriveSessionTitle('   '), DEFAULT_SESSION_TITLE);
});

test('filterAndSortSessions prioritizes pinned sessions and filters by content or title', () => {
  const s1 = createChatSession(WELCOME, 'Boss & Combat', new Date('2026-11-18T01:00:00Z'));
  const s2 = createChatSession(WELCOME, 'Hardware & Settings', new Date('2026-11-18T02:00:00Z'));

  let list = renameChatSession([s1, s2], s1.id, 'Sekiro Isshin Parry Guide');
  list = renameChatSession(list, s2.id, 'OLED 240Hz HDR Calibration');
  list = toggleSessionPin(list, s1.id);

  const sorted = filterAndSortSessions(list, '');
  assert.equal(sorted[0].id, s1.id);
  assert.equal(sorted[1].id, s2.id);

  const matched = filterAndSortSessions(list, 'hdr');
  assert.equal(matched.length, 1);
  assert.equal(matched[0].id, s2.id);
});

test('deleteChatSession falls back cleanly to a fresh session when deleting the last thread', () => {
  const s1 = createChatSession(WELCOME, 'All Topics', new Date('2026-11-18T01:00:00Z'));
  const result = deleteChatSession([s1], s1.id, WELCOME, new Date('2026-11-18T03:00:00Z'));
  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0].title, DEFAULT_SESSION_TITLE);
  assert.notEqual(result.nextActiveId, s1.id);
});

test('setSessionTopicFocus, formatRelativeSessionTime, and migrateLegacyChatMessages work cleanly', () => {
  const base = createChatSession(WELCOME, 'All Topics', new Date('2026-11-18T01:00:00Z'));
  const focused = setSessionTopicFocus([base], base.id, 'Builds & Gear');
  assert.equal(focused[0].topicFocus, 'Builds & Gear');

  assert.equal(
    formatRelativeSessionTime('2026-11-18T02:55:00Z', new Date('2026-11-18T03:00:00Z')),
    '5m ago'
  );
  assert.equal(
    formatRelativeSessionTime('2026-11-18T02:59:45Z', new Date('2026-11-18T03:00:00Z')),
    'Just now'
  );

  const migrated = migrateLegacyChatMessages(
    [
      ...WELCOME,
      {
        id: 'u-legacy',
        role: 'user',
        kind: 'general_gaming',
        content: 'Best bleed talismans for Shadow of the Erdtree',
        timestamp: '2026-11-18T00:10:00Z',
      },
    ],
    WELCOME
  );
  assert.equal(migrated.length, 1);
  assert.ok(migrated[0].title.includes('Best bleed talismans'));
});
