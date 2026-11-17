import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Loader2,
  Mic,
  Send,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import type { BossGuide, ChatMessage } from '../types/gaming';
import { filterBossGuides } from '../utils/bossFilter';
import { VOICE_PRESETS, type VoicePresetId } from '../utils/voiceHelpers';
import { BossGuideDetails } from './BossGuideDetails';

interface ChatAssistantViewProps {
  messages: ChatMessage[];
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

const STARTER_PROMPTS: { label: string; prompt: string; category: string }[] = [
  {
    label: 'Malenia boss strategy & bleed build',
    prompt:
      'Give me a phase-by-phase boss strategy and optimized build for Malenia, Blade of Miquella in Elden Ring.',
    category: 'Boss Guide',
  },
  {
    label: 'Nightmare King Grimm dodge guide',
    prompt:
      'How do I beat Nightmare King Grimm in Hollow Knight? Include charm loadout and safe heal windows.',
    category: 'Boss Guide',
  },
  {
    label: '1440p 144Hz GPU & display settings',
    prompt:
      'What is the best GPU tier and monitor setting setup for competitive 1440p 144Hz FPS gaming?',
    category: 'Hardware',
  },
  {
    label: 'Test guardrail: cookie recipe',
    prompt: 'How do I bake chocolate chip cookies?',
    category: 'Off-Topic Test',
  },
];

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const ChatAssistantView: React.FC<ChatAssistantViewProps> = ({
  messages,
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
  const endRef = useRef<HTMLDivElement | null>(null);

  const {
    isRecording,
    isTranscribing,
    elapsedSeconds,
    recorderError,
    startRecording,
    stopAndSend,
    cancelRecording,
    clearRecorderError,
  } = useVoiceRecorder(async (transcript) => {
    await onSendMessage(transcript);
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  const instantMatches = useMemo(() => {
    const q = inputValue.trim();
    if (q.length < 2) return [];
    return filterBossGuides(bossGuides, q, 'All').slice(0, 3);
  }, [bossGuides, inputValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading || isRecording || isTranscribing) return;
    setInputValue('');
    await onSendMessage(trimmed);
  };

  const activeBannerError = recorderError || voiceError;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-118px)] max-w-6xl flex-col px-4 pt-4 pb-24 sm:px-6 lg:grid lg:grid-cols-[1fr_300px] lg:gap-6">
      {/* Main Conversational Column */}
      <div className="flex flex-1 flex-col">
        {/* Compact View Header + Vocal Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div>
            <h1 className="font-display text-xl font-semibold text-white">
              Chat Assistant
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              Text or voice · Video games, boss tactics, loadouts &amp; achievements only
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              aria-label={autoReadVoice ? 'Disable auto-read voice replies' : 'Enable auto-read voice replies'}
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
                aria-label="Clear chat history"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
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

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSpeakText(msg.id, msg.content)}
                      aria-label={isPlayingThis ? 'Stop audio playback' : 'Listen to response'}
                      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

          {/* Mobile Quick Starters (shown inline when chat is fresh) */}
          {messages.length <= 1 && !isLoading && (
            <div className="pt-2 lg:hidden">
              <div className="mb-2 text-xs font-medium text-slate-400">
                Quick Tactical Prompts
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onSendMessage(item.prompt)}
                    className="flex min-h-[48px] flex-col items-start justify-center rounded-xl border border-white/[0.08] bg-[#11151E] px-3.5 py-2.5 text-left transition-colors hover:border-[#00D4FF]/40 hover:bg-[#161C28] cursor-pointer"
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
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Sticky Composer + Instant Boss Match Docked Above Bottom Navigation */}
        <div className="sticky bottom-[70px] z-20 mt-auto space-y-2 pt-2">
          {activeBannerError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-[#1A140B]/95 px-3 py-2 text-xs text-amber-200 backdrop-blur-md"
            >
              <span>{activeBannerError}</span>
              <button
                type="button"
                onClick={() => {
                  clearRecorderError();
                  onClearVoiceError();
                }}
                aria-label="Dismiss voice error"
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-amber-200 hover:bg-white/10 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {instantMatches.length > 0 && !isRecording && (
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

          {isRecording ? (
            <div
              role="region"
              aria-label="Voice recording active"
              className="flex items-center justify-between gap-2 rounded-2xl border border-rose-500/45 bg-[#191116]/95 p-2 shadow-xl backdrop-blur-md"
            >
              <div className="flex items-center gap-2.5 pl-2">
                <Mic className="h-4 w-4 text-rose-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-white">Listening</span>
                <span className="font-mono text-xs tabular-nums text-rose-300">
                  {formatDuration(elapsedSeconds)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 px-3.5 text-xs font-medium text-slate-200 hover:bg-white/10 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={stopAndSend}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#10B981] px-4 text-xs font-semibold text-[#090B10] hover:bg-[#34D399] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Stop &amp; Send</span>
                </button>
              </div>
            </div>
          ) : (
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
                placeholder={
                  isTranscribing
                    ? 'Transcribing voice message...'
                    : 'Ask about bosses, builds, games...'
                }
                disabled={isLoading || isTranscribing}
                className="min-h-[44px] flex-1 bg-transparent px-3 text-sm text-white placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
              />

              <button
                type="button"
                onClick={startRecording}
                disabled={isLoading || isTranscribing}
                aria-label="Start voice input"
                title="Speak your question"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-[#0C0F16] text-slate-200 transition-colors hover:border-[#00D4FF]/50 hover:text-[#00D4FF] disabled:cursor-not-allowed disabled:opacity-40 shrink-0 cursor-pointer"
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#00D4FF]" aria-hidden="true" />
                ) : (
                  <Mic className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || isTranscribing}
                aria-label="Send message"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl bg-[#00D4FF] px-4 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#38DFFF] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Desktop Tactical Quick-Prompt & Guardrail Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:gap-4 lg:pt-1">
        <div className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-4">
          <h2 className="font-display text-sm font-semibold text-white">
            Quick Tactical Prompts
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Tap a query or use the microphone button to speak directly with RADAHN.
          </p>
          <div className="mt-3 space-y-2">
            {STARTER_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={isLoading || isRecording || isTranscribing}
                onClick={() => onSendMessage(item.prompt)}
                className="flex min-h-[48px] w-full flex-col items-start justify-center rounded-xl border border-white/[0.08] bg-[#0C0F16] px-3 py-2.5 text-left transition-colors hover:border-[#00D4FF]/40 hover:bg-[#161C28] disabled:opacity-50 cursor-pointer"
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
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-4">
          <h2 className="font-display text-sm font-semibold text-white">
            Vocal &amp; Guardrail Mode
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            Voice inputs and spoken briefings obey RADAHN’s strict gaming-only guardrail. Switch voices or toggle Auto-Read anytime.
          </p>
        </div>
      </aside>
    </div>
  );
};
