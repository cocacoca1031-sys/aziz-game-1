import type { ChatMessage, ChatSession, ChatTopicFocus } from '../types/gaming.ts';

export const CHAT_TOPIC_FOCUS_OPTIONS: readonly ChatTopicFocus[] = [
  'All Topics',
  'Boss & Combat',
  'Builds & Gear',
  'Hardware & Settings',
  'Achievements',
] as const;

export const DEFAULT_SESSION_TITLE = 'New Conversation';

export function deriveSessionTitle(rawPrompt: string): string {
  const clean = rawPrompt.replace(/\s+/g, ' ').trim();
  if (!clean) return DEFAULT_SESSION_TITLE;
  if (clean.length <= 44) return clean;
  const sliced = clean.slice(0, 41).trimEnd();
  const lastSpace = sliced.lastIndexOf(' ');
  const clipped = lastSpace >= 22 ? sliced.slice(0, lastSpace) : sliced;
  return `${clipped}...`;
}

export function createChatSession(
  welcomeMessages: ChatMessage[],
  topicFocus: ChatTopicFocus = 'All Topics',
  now: Date = new Date()
): ChatSession {
  const iso = now.toISOString();
  const suffix = Math.random().toString(36).slice(2, 7);
  return {
    id: `chat-${now.getTime()}-${suffix}`,
    title: DEFAULT_SESSION_TITLE,
    pinned: false,
    topicFocus,
    messages: welcomeMessages.map((msg) => ({ ...msg })),
    createdAt: iso,
    updatedAt: iso,
  };
}

export function appendMessagesToSession(
  sessions: ChatSession[],
  sessionId: string,
  newMessages: ChatMessage[],
  now: Date = new Date()
): ChatSession[] {
  const iso = now.toISOString();
  return sessions.map((session) => {
    if (session.id !== sessionId) return session;
    const mergedMessages = [...session.messages, ...newMessages];
    const firstUserMsg = mergedMessages.find((m) => m.role === 'user');
    const shouldAutoTitle =
      session.title === DEFAULT_SESSION_TITLE || session.title.trim() === '';
    const nextTitle =
      shouldAutoTitle && firstUserMsg
        ? deriveSessionTitle(firstUserMsg.content)
        : session.title;

    return {
      ...session,
      title: nextTitle,
      messages: mergedMessages,
      updatedAt: iso,
    };
  });
}

export function toggleSessionPin(
  sessions: ChatSession[],
  sessionId: string
): ChatSession[] {
  return sessions.map((session) =>
    session.id === sessionId ? { ...session, pinned: !session.pinned } : session
  );
}

export function renameChatSession(
  sessions: ChatSession[],
  sessionId: string,
  rawTitle: string
): ChatSession[] {
  const clean = rawTitle.replace(/\s+/g, ' ').trim().slice(0, 64);
  if (!clean) return sessions;
  return sessions.map((session) =>
    session.id === sessionId ? { ...session, title: clean } : session
  );
}

export function setSessionTopicFocus(
  sessions: ChatSession[],
  sessionId: string,
  topicFocus: ChatTopicFocus
): ChatSession[] {
  return sessions.map((session) =>
    session.id === sessionId ? { ...session, topicFocus } : session
  );
}

export function deleteChatSession(
  sessions: ChatSession[],
  sessionId: string,
  welcomeMessages: ChatMessage[],
  now: Date = new Date()
): { sessions: ChatSession[]; nextActiveId: string } {
  const remaining = sessions.filter((s) => s.id !== sessionId);
  if (remaining.length === 0) {
    const fresh = createChatSession(welcomeMessages, 'All Topics', now);
    return {
      sessions: [fresh],
      nextActiveId: fresh.id,
    };
  }
  const sorted = filterAndSortSessions(remaining, '');
  return {
    sessions: remaining,
    nextActiveId: sorted[0].id,
  };
}

export function filterAndSortSessions(
  sessions: ChatSession[],
  rawQuery: string
): ChatSession[] {
  const q = rawQuery.trim().toLowerCase();
  const filtered = q
    ? sessions.filter((session) => {
        if (session.title.toLowerCase().includes(q)) return true;
        if (session.topicFocus.toLowerCase().includes(q)) return true;
        return session.messages.some((m) => m.content.toLowerCase().includes(q));
      })
    : [...sessions];

  return filtered.sort((a, b) => {
    const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinDiff !== 0) return pinDiff;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
}

export function countUserMessages(session: ChatSession): number {
  return session.messages.filter((m) => m.role === 'user').length;
}

export function formatRelativeSessionTime(
  iso: string,
  now: Date = new Date()
): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return 'Just now';
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - ts) / 1000));
  if (diffSeconds < 60) return 'Just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  try {
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Earlier';
  }
}

export function migrateLegacyChatMessages(
  legacyMessages: ChatMessage[],
  welcomeMessages: ChatMessage[],
  now: Date = new Date()
): ChatSession[] {
  const hasUserInteraction = legacyMessages.some((m) => m.role === 'user');
  if (!hasUserInteraction) {
    return [createChatSession(welcomeMessages, 'All Topics', now)];
  }
  const firstUser = legacyMessages.find((m) => m.role === 'user');
  const lastMsg = legacyMessages[legacyMessages.length - 1];
  const createdAt = legacyMessages[0]?.timestamp || now.toISOString();
  const updatedAt = lastMsg?.timestamp || now.toISOString();
  return [
    {
      id: `chat-legacy-${now.getTime()}`,
      title: firstUser ? deriveSessionTitle(firstUser.content) : DEFAULT_SESSION_TITLE,
      pinned: false,
      topicFocus: 'All Topics',
      messages: legacyMessages,
      createdAt,
      updatedAt,
    },
  ];
}
