import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Check,
  Copy,
  History,
  Loader2,
  MessageSquare,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import type { BossGuide, ChatSession } from '../types/gaming';
import { filterBossGuides } from '../utils/bossFilter';
import {
  countUserMessages,
  filterAndSortSessions,
  formatRelativeSessionTime,
} from '../utils/chatHistory';
import { VOICE_PRESETS, type VoicePresetId } from '../utils/voiceHelpers';
import { BossGuideDetails } from './BossGuideDetails';

interface ChatAssistantViewProps {
  sessions: ChatSession[];
  activeSession: ChatSession;
  onSelectSession: (sessionId: string) => void;
  onNewConversation: () => void;
  onDeleteSession: (sessionId: string) => void;
  onTogglePinSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, nextTitle: string) => void;
  onSendMessage: (prompt: string) => Promise<void>;
  onClearChat: () => void;
  onSaveBossGuide: (guide: BossGuide) => void;
  savedBossIds: Set<string>;
  bossGuides: BossGuide[];
  onOpenBossGuide: (bossId: string) => void;
  isLoading: boolean;
  autoReadVoice: boolean;
  onToggleAutoReadVoice: () => void;
  voicePreset: VoicePresetId;
  onChangeVoicePreset: (voice: VoicePresetId) => void;
  playingVoiceId: string | null;
  loadingVoiceId: string | null;
  voiceError: string | null;
  onSpeakText: (id: string, text: string) => void;
  onClearVoiceError: () => void;
}

const STARTER_PROMPTS: {
  label: string;
  prompt: string;
  category: string;
}[] = [
  {
    label: 'Malenia boss strategy & bleed build',
    prompt:
      'Give me a phase-by-phase boss strategy and optimized build for Malenia, Blade of Miquella in Elden Ring.',
    category: 'Boss & Combat',
  },
  {
    label: 'Nightmare King Grimm dodge guide',
    prompt:
      'How do I beat Nightmare King Grimm in Hollow Knight? Include charm loadout and safe heal windows.',
    category: 'Boss & Combat',
  },
  {
    label: '1440p 144Hz GPU & display settings',
    prompt:
      'What is the best GPU tier and monitor setting setup for competitive 1440p 144Hz FPS gaming?',
    category: 'Hardware & Settings',
  },
  {
    label: 'Test guardrail: cookie recipe',
    prompt: 'How do I bake chocolate chip cookies?',
    category: 'Guardrail Check',
  },
];

export const ChatAssistantView: React.FC<ChatAssistantViewProps> = ({
  sessions,
  activeSession,
  onSelectSession,
  onNewConversation,
  onDeleteSession,
  onTogglePinSession,
  onRenameSession,
  onSendMessage,
  onClearChat,
  onSaveBossGuide,
  savedBossIds,
  bossGuides,
  onOpenBossGuide,
  isLoading,
  autoReadVoice,
  onToggleAutoReadVoice,
  voicePreset,
  onChangeVoicePreset,
  playingVoiceId,
  loadingVoiceId,
  voiceError,
  onSpeakText,
  onClearVoiceError,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const messages = activeSession.messages;
  const userMessageCount = countUserMessages(activeSession);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession.id, messages.length, isLoading]);

  const sortedSessions = useMemo(
    () => filterAndSortSessions(sessions, historySearch),
    [sessions, historySearch]
  );

  const pinnedSessions = useMemo(
    () => sortedSessions.filter((s) => Boolean(s.pinned)),
    [sortedSessions]
  );

  const recentSessions = useMemo(
    () => sortedSessions.filter((s) => !s.pinned),
    [sortedSessions]
  );

  const instantMatches = useMemo(() => {
    const q = inputValue.trim();
    if (q.length < 2) return [];
    return filterBossGuides(bossGuides, q, 'All').slice(0, 3);
  }, [bossGuides, inputValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    setInputValue('');
    await onSendMessage(trimmed);
  };

  const handleCopyMessage = async (msgId: string, text: string) => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const el = document.createElement('textarea');
        el.value = text;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        copied = document.execCommand('copy');
        document.body.removeChild(el);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setCopiedMsgId(msgId);
      window.setTimeout(() => {
        setCopiedMsgId((current) => (current === msgId ? null : current));
      }, 2000);
    }
  };

  const handleStartRename = (session: ChatSession) => {
    setRenamingSessionId(session.id);
    setRenameDraft(session.title);
  };

  const handleCommitRename = (sessionId: string) => {
    if (renameDraft.trim()) {
      onRenameSession(sessionId, renameDraft);
    }
    setRenamingSessionId(null);
    setRenameDraft('');
  };

  const handleSelectThread = (sessionId: string) => {
    onSelectSession(sessionId);
    setIsMobileHistoryOpen(false);
  };

  const handleCreateNewThread = () => {
    onNewConversation();
    setIsMobileHistoryOpen(false);
  };

  const renderSessionRow = (session: ChatSession) => {
    const isActive = session.id === activeSession.id;
    const isRenaming = renamingSessionId === session.id;
    const msgCount = countUserMessages(session);
    const relativeTime = formatRelativeSessionTime(session.updatedAt);

    if (isRenaming) {
      return (
        <div
          key={session.id}
          className="rounded-xl border border-[#00D4FF]/50 bg-[#0D1622] p-2"
        >
          <input
            type="text"
            value={renameDraft}
            autoFocus
            aria-label="Rename conversation title"
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCommitRename(session.id);
              } else if (e.key === 'Escape') {
                setRenamingSessionId(null);
              }
            }}
            className="w-full rounded-lg border border-white/15 bg-[#090B10] px-2.5 py-1.5 text-xs text-white focus:border-[#00D4FF] focus:outline-none"
          />
          <div className="mt-1.5 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setRenamingSessionId(null)}
              className="min-h-[30px] rounded-lg px-2.5 text-[11px] font-medium text-slate-300 hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleCommitRename(session.id)}
              className="min-h-[30px] rounded-lg bg-[#00D4FF] px-2.5 text-[11px] font-semibold text-[#090B10] hover:bg-[#38DFFF] cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={session.id}
        className={`group rounded-xl border px-3 py-2.5 transition-colors ${
          isActive
            ? 'border-[#00D4FF]/45 bg-[#122030]'
            : 'border-transparent bg-transparent hover:border-white/10 hover:bg-[#161C28]'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => handleSelectThread(session.id)}
            aria-current={isActive ? 'true' : undefined}
            className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
          >
            <MessageSquare
              className={`h-3.5 w-3.5 shrink-0 ${
                isActive ? 'text-[#00D4FF]' : 'text-slate-400'
              }`}
              aria-hidden="true"
            />
            <span
              className={`truncate text-xs font-medium ${
                isActive ? 'text-white' : 'text-slate-200'
              }`}
            >
              {session.title}
            </span>
          </button>

          <div
            className={`flex shrink-0 items-center gap-0.5 transition-opacity ${
              isActive
                ? 'opacity-100'
                : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={() => onTogglePinSession(session.id)}
              aria-label={session.pinned ? `Unpin ${session.title}` : `Pin ${session.title}`}
              title={session.pinned ? 'Unpin conversation' : 'Pin conversation'}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                session.pinned
                  ? 'text-amber-300 hover:bg-white/10'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {session.pinned ? (
                <PinOff className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Pin className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleStartRename(session)}
              aria-label={`Rename ${session.title}`}
              title="Rename conversation"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onDeleteSession(session.id)}
              aria-label={`Delete ${session.title}`}
              title="Delete conversation"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSelectThread(session.id)}
          tabIndex={-1}
          className="mt-1 flex w-full items-center gap-1.5 pl-5 text-left text-[11px] text-slate-400 tabular-nums cursor-pointer"
        >
          <span className="shrink-0">
            {msgCount === 0 ? 'Empty' : `${msgCount} ${msgCount === 1 ? 'ask' : 'asks'}`}
          </span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{relativeTime}</span>
        </button>
      </div>
    );
  };

  const renderHistoryContent = () => (
    <div className="flex h-full flex-col">
      <div className="space-y-2.5 border-b border-white/[0.08] p-3.5">
        <button
          type="button"
          onClick={handleCreateNewThread}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#00D4FF] px-4 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#38DFFF] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>New Conversation</span>
        </button>

        <div className="relative flex items-center">
          <Search
            className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400"
            aria-hidden="true"
          />
          <label htmlFor="chat-history-search" className="sr-only">
            Search conversation history
          </label>
          <input
            id="chat-history-search"
            type="text"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search history..."
            className="min-h-[38px] w-full rounded-xl border border-white/10 bg-[#090B10] py-1.5 pr-8 pl-8 text-xs text-white placeholder:text-slate-500 focus:border-[#00D4FF] focus:outline-none"
          />
          {historySearch && (
            <button
              type="button"
              onClick={() => setHistorySearch('')}
              aria-label="Clear history search"
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {sortedSessions.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-[#090B10] p-4 text-center">
            <p className="text-xs font-medium text-slate-300">No matching conversations</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Try another boss, game, or build keyword.
            </p>
          </div>
        ) : (
          <>
            {pinnedSessions.length > 0 && (
              <div>
                <div className="mb-1.5 px-2 text-[11px] font-medium text-slate-400 tabular-nums">
                  Pinned · {pinnedSessions.length}
                </div>
                <div className="space-y-1">
                  {pinnedSessions.map((session) => renderSessionRow(session))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-1.5 px-2 text-[11px] font-medium text-slate-400 tabular-nums">
                {pinnedSessions.length > 0 ? 'Recent' : 'History'} · {recentSessions.length}
              </div>
              <div className="space-y-1">
                {recentSessions.map((session) => renderSessionRow(session))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-118px)] max-w-7xl flex-col px-4 pt-4 pb-24 sm:px-6 lg:grid lg:grid-cols-[296px_1fr] lg:gap-6">
      {/* Desktop Conversation History Sidebar */}
      <aside
        aria-label="Conversation History"
        className="hidden lg:sticky lg:top-[72px] lg:flex lg:max-h-[calc(100dvh-160px)] lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border lg:border-white/[0.08] lg:bg-[#11151E]"
      >
        {renderHistoryContent()}
      </aside>

      {/* Mobile Conversation History Drawer */}
      {isMobileHistoryOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Conversation History Drawer"
        >
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileHistoryOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[88%] max-w-[330px] flex-col border-r border-white/10 bg-[#11151E] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#00D4FF]" aria-hidden="true" />
                <span className="font-display text-sm font-semibold text-white">
                  Chat History
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileHistoryOpen(false)}
                aria-label="Close history drawer"
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1">{renderHistoryContent()}</div>
          </aside>
        </div>
      )}

      {/* Main Conversational Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Compact Workspace Header + Thread & Voice Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsMobileHistoryOpen(true)}
              aria-label="Open chat history"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-[#11151E] px-3 text-xs font-medium text-slate-200 hover:border-[#00D4FF]/40 hover:text-white whitespace-nowrap shrink-0 lg:hidden cursor-pointer"
            >
              <History className="h-4 w-4 text-[#00D4FF]" aria-hidden="true" />
              <span>History</span>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                ({sessions.length})
              </span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="max-w-[220px] truncate font-display text-lg font-semibold text-white sm:max-w-md sm:text-xl">
                  {activeSession.title}
                </h1>
              </div>
              <div className="mt-0.5 text-xs text-slate-400 tabular-nums">
                {userMessageCount === 0
                  ? 'Ready for gaming intel'
                  : `${userMessageCount} ${userMessageCount === 1 ? 'question' : 'questions'}`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCreateNewThread}
              aria-label="Start new conversation"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#00D4FF]/40 bg-[#0D1A26] px-3 text-xs font-semibold text-[#00D4FF] transition-colors hover:bg-[#00D4FF]/15 whitespace-nowrap shrink-0 lg:hidden cursor-pointer"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>New</span>
            </button>

            <label htmlFor="radahn-voice-preset" className="sr-only">
              Select RADAHN voice
            </label>
            <select
              id="radahn-voice-preset"
              value={voicePreset}
              onChange={(e) => onChangeVoicePreset(e.target.value as VoicePresetId)}
              aria-label="Select RADAHN voice"
              className="min-h-[44px] rounded-lg border border-white/10 bg-[#11151E] px-2.5 text-xs font-medium text-slate-200 focus:border-[#00D4FF] focus:outline-none cursor-pointer"
            >
              {VOICE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onToggleAutoReadVoice}
              aria-pressed={autoReadVoice}
              aria-label={
                autoReadVoice ? 'Disable auto-read voice replies' : 'Enable auto-read voice replies'
              }
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                autoReadVoice
                  ? 'border-[#00D4FF]/45 bg-[#00D4FF]/15 text-[#00D4FF]'
                  : 'border-white/10 bg-[#11151E] text-slate-300 hover:border-white/20 hover:text-white'
              }`}
            >
              {autoReadVoice ? (
                <>
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  <span>Auto-Read On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                  <span>Auto-Read Off</span>
                </>
              )}
            </button>

            {messages.length > 1 && (
              <button
                type="button"
                onClick={onClearChat}
                aria-label="Reset current conversation"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Feed */}
        <div aria-live="polite" className="flex-1 space-y-4 py-5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isRefusal = msg.kind === 'refusal';
            const isError = msg.kind === 'error';
            const isPlayingThis = playingVoiceId === msg.id;
            const isLoadingThis = loadingVoiceId === msg.id;
            const isCopied = copiedMsgId === msg.id;

            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-[#00D4FF]/25 bg-[#122030] px-4 py-3 text-sm leading-relaxed text-white sm:max-w-[75%]">
                    {msg.content}
                  </div>
                </div>
              );
            }

            if (isRefusal) {
              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    data-testid="agent-refusal-message"
                    className="max-w-[88%] rounded-2xl rounded-bl-sm border border-amber-500/35 bg-[#16130E] px-4 py-3 text-sm font-medium text-amber-100 sm:max-w-[78%]"
                  >
                    <p>{msg.content}</p>
                    <div className="mt-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => onSpeakText(msg.id, msg.content)}
                        aria-label={isPlayingThis ? 'Stop audio playback' : 'Listen to response'}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-500/25 px-2.5 text-xs font-medium text-amber-200 hover:bg-amber-500/10 cursor-pointer"
                      >
                        {isLoadingThis ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : isPlayingThis ? (
                          <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>{isLoadingThis ? 'Loading...' : isPlayingThis ? 'Stop' : 'Listen'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            if (isError) {
              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    role="alert"
                    className="max-w-[88%] rounded-2xl rounded-bl-sm border border-rose-500/40 bg-[#1B1014] px-4 py-3 text-sm text-rose-200 sm:max-w-[78%]"
                  >
                    {msg.content}
                  </div>
                </div>
              );
            }

            const alreadySaved = msg.bossGuide ? savedBossIds.has(msg.bossGuide.id) : false;

            return (
              <div key={msg.id} className="flex justify-start">
                <div className="w-full max-w-[96%] rounded-2xl rounded-bl-sm border border-white/[0.08] bg-[#11151E] p-4 text-sm leading-relaxed text-slate-200 sm:max-w-[90%]">
                  <p className="whitespace-pre-line">{msg.content}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSpeakText(msg.id, msg.content)}
                      aria-label={isPlayingThis ? 'Stop audio playback' : 'Listen to response'}
                      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isPlayingThis
                          ? 'border-[#00D4FF]/50 bg-[#00D4FF]/15 text-[#00D4FF]'
                          : 'border-white/10 bg-[#0C0F16] text-slate-300 hover:border-[#00D4FF]/40 hover:text-white'
                      }`}
                    >
                      {isLoadingThis ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00D4FF]" aria-hidden="true" />
                          <span>Generating Audio...</span>
                        </>
                      ) : isPlayingThis ? (
                        <>
                          <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                          <span>Stop Audio</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5 text-[#00D4FF]" aria-hidden="true" />
                          <span>Listen</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      aria-label="Copy response"
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/10 bg-[#0C0F16] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-[#00D4FF]/40 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
                          <span className="text-[#10B981]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {msg.bossGuide && (
                    <div className="mt-4 border-t border-white/[0.08] pt-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#10B981]">
                          Structured Boss Dossier &amp; Loadout
                        </span>
                        <button
                          type="button"
                          disabled={alreadySaved}
                          onClick={() => msg.bossGuide && onSaveBossGuide(msg.bossGuide)}
                          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            alreadySaved
                              ? 'border border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                              : 'bg-[#00D4FF] text-[#090B10] hover:bg-[#38DFFF]'
                          }`}
                        >
                          {alreadySaved ? (
                            <>
                              <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
                              Saved to Boss Hub
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                              Save to Boss Hub
                            </>
                          )}
                        </button>
                      </div>
                      <BossGuideDetails
                        guide={msg.bossGuide}
                        compact
                        playingVoiceId={playingVoiceId}
                        loadingVoiceId={loadingVoiceId}
                        onSpeakText={onSpeakText}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-white/[0.08] bg-[#11151E] px-4 py-3 text-xs font-medium text-slate-300">
                Fetching tactical intel...
              </div>
            </div>
          )}

          {/* Quick Tactical Prompts on Fresh Conversations */}
          {messages.length <= 1 && !isLoading && (
            <section aria-label="Quick Tactical Prompts" className="pt-2">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-300">
                  Quick Tactical Prompts
                </h2>
                <span className="text-[11px] text-slate-500">
                  Start a focused thread in one tap
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      void onSendMessage(item.prompt);
                    }}
                    className="flex min-h-[54px] flex-col items-start justify-center rounded-xl border border-white/[0.08] bg-[#11151E] px-3.5 py-2.5 text-left transition-colors hover:border-[#00D4FF]/40 hover:bg-[#161C28] cursor-pointer"
                  >
                    <span className="text-[11px] font-medium text-[#00D4FF]">
                      {item.category}
                    </span>
                    <span className="mt-0.5 text-xs font-medium text-slate-100">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div ref={endRef} />
        </div>

        {/* Sticky Composer + Instant Boss Match Docked Above Bottom Navigation */}
        <div className="sticky bottom-[70px] z-20 mt-auto space-y-2 pt-2">
          {voiceError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-[#1A140B]/95 px-3 py-2 text-xs text-amber-200 backdrop-blur-md"
            >
              <span>{voiceError}</span>
              <button
                type="button"
                onClick={onClearVoiceError}
                aria-label="Dismiss voice error"
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-amber-200 hover:bg-white/10 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {instantMatches.length > 0 && (
            <div
              aria-label="Instant local boss matches"
              className="flex items-center gap-2 overflow-x-auto rounded-xl border border-[#10B981]/30 bg-[#0D1517]/95 px-3 py-2 backdrop-blur-md"
            >
              <Zap className="h-3.5 w-3.5 shrink-0 text-[#10B981]" aria-hidden="true" />
              <span className="text-[11px] font-medium text-[#10B981] whitespace-nowrap shrink-0">
                Instant Hub:
              </span>
              {instantMatches.map((guide) => (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => onOpenBossGuide(guide.id)}
                  className="min-h-[32px] rounded-lg border border-white/10 bg-[#11151E] px-2.5 text-xs font-medium text-white hover:border-[#00D4FF]/50 hover:text-[#00D4FF] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {guide.bossName}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-[#11151E]/95 p-1.5 shadow-xl backdrop-blur-md"
          >
            <label htmlFor="chat-prompt-input" className="sr-only">
              Ask RADAHN
            </label>
            <input
              id="chat-prompt-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about bosses, builds, games..."
              disabled={isLoading}
              className="min-h-[44px] flex-1 bg-transparent px-3 text-sm text-white placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send message"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl bg-[#00D4FF] px-4 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#38DFFF] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
