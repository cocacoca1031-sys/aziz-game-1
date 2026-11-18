import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Crosshair,
  Loader2,
  RotateCcw,
  Send,
  ShieldAlert,
  Square,
  Swords,
  Volume2,
} from 'lucide-react';
import type {
  BossCoachMessage,
  BossCoachSessionState,
  BossPhaseCap,
} from '../types/gaming';
import {
  appendBossCoachTurn,
  createDefaultBossCoachState,
  formatCoachLines,
  parseCoachInlineSegments,
} from '../utils/bossCoach';

interface BossCoachPanelProps {
  coachState: BossCoachSessionState;
  onUpdateState: (next: BossCoachSessionState) => void;
  playingVoiceId?: string | null;
  loadingVoiceId?: string | null;
  onSpeakText?: (id: string, text: string) => void;
}

const PHASE_OPTIONS: { id: BossPhaseCap; label: string }[] = [
  { id: 'phase1', label: 'Phase 1' },
  { id: 'phase2', label: 'Phase 2' },
  { id: 'full', label: 'Full Fight' },
];

const QUICK_CALLOUTS = [
  {
    label: 'Death-diagnosis callout',
    prompt: 'I keep getting one-shot by a sweeping combo—give me the telegraph, exact dodge counter, and safe punish window.',
  },
  {
    label: 'Optimize current gear only',
    prompt: 'Optimize my strategy using ONLY my listed current gear—tell me what to swap or equip without late-game farming.',
  },
  {
    label: 'Full fight breakdown',
    prompt: 'Give me a full fight breakdown across all phases with quick prep and #1 survival rule.',
  },
];

function renderCoachText(content: string): React.ReactNode {
  const lines = formatCoachLines(content);
  return (
    <div className="space-y-2">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1" />;
        }
        const segments = parseCoachInlineSegments(line);
        return (
          <p key={lineIdx} className="leading-relaxed">
            {segments.map((seg, segIdx) =>
              seg.bold ? (
                <strong key={segIdx} className="font-semibold text-white">
                  {seg.text}
                </strong>
              ) : seg.italic ? (
                <em key={segIdx} className="not-italic font-medium text-[#00D4FF]">
                  {seg.text}
                </em>
              ) : (
                <React.Fragment key={segIdx}>{seg.text}</React.Fragment>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

export const BossCoachPanel: React.FC<BossCoachPanelProps> = ({
  coachState,
  onUpdateState,
  playingVoiceId,
  loadingVoiceId,
  onSpeakText,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const feedEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [coachState.messages.length, isSending]);

  const handleCopy = async (id: string, text: string) => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok && typeof document !== 'undefined') {
      try {
        const el = document.createElement('textarea');
        el.value = text;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        ok = document.execCommand('copy');
        document.body.removeChild(el);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((cur) => (cur === id ? null : cur));
      }, 2000);
    }
  };

  const sendCallout = async (overrideText?: string) => {
    const text = (overrideText ?? promptInput).trim();
    if (!text || isSending) return;

    setErrorMsg(null);
    if (!overrideText) setPromptInput('');

    const userMsg: BossCoachMessage = {
      id: `bc-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setIsSending(true);
    try {
      const res = await fetch('/api/boss-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          bossName: coachState.bossName,
          gameTitle: coachState.gameTitle,
          reachedPhase: coachState.reachedPhase,
          currentGear: coachState.currentGear,
          history: coachState.messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Unable to reach Boss Fight Coach right now.');
        return;
      }

      const agentMsg: BossCoachMessage = {
        id: `bc-agent-${Date.now()}`,
        role: 'agent',
        content: data.replyText || 'Name a boss and tell me what attack hit you.',
        phaseUsed: data.phaseUsed,
        isDeathDiagnosis: Boolean(data.isDeathDiagnosis),
        isRefusal: data.kind === 'refusal' || Boolean(data.isOffTopic),
        timestamp: new Date().toISOString(),
      };

      const nextState = appendBossCoachTurn(coachState, userMsg, agentMsg, {
        detectedBoss: data.detectedBoss,
        detectedGame: data.detectedGame,
        isDeathDiagnosis: Boolean(data.isDeathDiagnosis),
      });
      onUpdateState(nextState);
    } catch {
      setErrorMsg('Network error reaching Boss Fight Coach.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendCallout();
  };

  return (
    <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[328px_1fr] lg:items-start">
      {/* Phase-Locked Spoiler Shield & Gear Sidebar */}
      <aside
        aria-label="Boss Coach Fight Context & Gear"
        className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-4 sm:p-5"
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-[#00D4FF]" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-white">
              Fight Lock &amp; Gear
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onUpdateState(createDefaultBossCoachState())}
            aria-label="Reset Boss Coach session"
            title="Start fresh coaching session"
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          <div>
            <label
              htmlFor="boss-coach-boss"
              className="block text-xs font-medium text-slate-300"
            >
              Target Boss
            </label>
            <input
              id="boss-coach-boss"
              type="text"
              value={coachState.bossName}
              onChange={(e) =>
                onUpdateState({
                  ...coachState,
                  bossName: e.target.value,
                  updatedAt: new Date().toISOString(),
                })
              }
              placeholder="e.g. Malenia, Nightmare King Grimm"
              className="mt-1.5 min-h-[42px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3 text-xs text-white placeholder:text-slate-500 focus:border-[#00D4FF] focus:outline-none sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="boss-coach-game"
              className="block text-xs font-medium text-slate-300"
            >
              Game Title
            </label>
            <input
              id="boss-coach-game"
              type="text"
              value={coachState.gameTitle}
              onChange={(e) =>
                onUpdateState({
                  ...coachState,
                  gameTitle: e.target.value,
                  updatedAt: new Date().toISOString(),
                })
              }
              placeholder="e.g. Elden Ring, Hollow Knight"
              className="mt-1.5 min-h-[42px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3 text-xs text-white placeholder:text-slate-500 focus:border-[#00D4FF] focus:outline-none sm:text-sm"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-300">
              Phase-Locked Spoiler Shield
            </span>
            <div
              role="group"
              aria-label="Reached boss phase cap"
              className="mt-1.5 flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#090B10] p-1"
            >
              {PHASE_OPTIONS.map((opt) => {
                const active = coachState.reachedPhase === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onUpdateState({
                        ...coachState,
                        reachedPhase: opt.id,
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    className={`min-h-[36px] flex-1 rounded-lg px-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#182232] text-[#00D4FF]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="boss-coach-gear"
              className="block text-xs font-medium text-slate-300"
            >
              Your Current Gear / Build
            </label>
            <textarea
              id="boss-coach-gear"
              rows={3}
              value={coachState.currentGear}
              onChange={(e) =>
                onUpdateState({
                  ...coachState,
                  currentGear: e.target.value,
                  updatedAt: new Date().toISOString(),
                })
              }
              placeholder="e.g. +14 Uchigatana, Medium Shield, 30 Vigor (no late-game farming)"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#090B10] p-3 text-xs leading-relaxed text-white placeholder:text-slate-500 focus:border-[#00D4FF] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.08] pt-3 text-xs text-slate-400 tabular-nums">
            <span>Death-diagnosis calls</span>
            <span className="font-mono font-semibold text-[#10B981]">
              {coachState.attemptsLogged} logged
            </span>
          </div>
        </div>
      </aside>

      {/* Coaching Callout Feed */}
      <div className="flex min-w-0 flex-col rounded-2xl border border-white/[0.08] bg-[#11151E] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              {coachState.bossName.trim()
                ? `${coachState.bossName} Fight Coach`
                : 'AI Boss Fight Coach'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {coachState.reachedPhase === 'phase1'
                ? 'Spoiler Shield: Phase 1 mechanics only'
                : coachState.reachedPhase === 'phase2'
                ? 'Spoiler Shield: Phases 1–2 unlocked'
                : 'Full multi-phase fight breakdown unlocked'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div aria-live="polite" className="mt-4 max-h-[460px] space-y-4 overflow-y-auto pr-1">
          {coachState.messages.map((msg) => {
            const isUser = msg.role === 'user';
            const voiceId = `boss-coach-${msg.id}`;
            const isPlayingThis = playingVoiceId === voiceId;
            const isLoadingThis = loadingVoiceId === voiceId;
            const isCopied = copiedId === msg.id;

            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-br-sm border border-[#00D4FF]/25 bg-[#122030] px-4 py-3 text-sm leading-relaxed text-white sm:max-w-[78%]">
                    {msg.content}
                  </div>
                </div>
              );
            }

            if (msg.isRefusal) {
              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    data-testid="boss-coach-refusal"
                    className="max-w-[88%] rounded-2xl rounded-bl-sm border border-amber-500/35 bg-[#16130E] px-4 py-3 text-sm font-medium text-amber-100 sm:max-w-[78%]"
                  >
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex justify-start">
                <div className="w-full max-w-[96%] rounded-2xl rounded-bl-sm border border-white/[0.08] bg-[#090B10] p-4 text-sm text-slate-200 sm:max-w-[92%]">
                  {msg.isDeathDiagnosis && (
                    <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-[#10B981]">
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Death-Diagnosis Counter Adaptation</span>
                    </div>
                  )}

                  {renderCoachText(msg.content)}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {onSpeakText && (
                      <button
                        type="button"
                        onClick={() =>
                          onSpeakText(
                            voiceId,
                            msg.content
                              .replace(/\*\*([^*]+)\*\*/g, '$1')
                              .replace(/\*([^*]+)\*/g, '$1')
                          )
                        }
                        aria-label={isPlayingThis ? 'Stop audio playback' : 'Listen to coach callout'}
                        className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isPlayingThis
                            ? 'border-[#00D4FF]/50 bg-[#00D4FF]/15 text-[#00D4FF]'
                            : 'border-white/10 bg-[#11151E] text-slate-300 hover:border-[#00D4FF]/40 hover:text-white'
                        }`}
                      >
                        {isLoadingThis ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00D4FF]" aria-hidden="true" />
                            <span>Generating...</span>
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
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          msg.id,
                          msg.content
                            .replace(/\*\*([^*]+)\*\*/g, '$1')
                            .replace(/\*([^*]+)\*/g, '$1')
                        )
                      }
                      aria-label="Copy boss coach callout"
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/10 bg-[#11151E] px-3 text-xs font-medium text-slate-300 hover:border-[#00D4FF]/40 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
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
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-white/[0.08] bg-[#090B10] px-4 py-3 text-xs font-medium text-slate-300">
                Diagnosing pattern &amp; locking punish window...
              </div>
            </div>
          )}

          <div ref={feedEndRef} />
        </div>

        {/* Quick Tactical Callouts */}
        {coachState.messages.length <= 1 && !isSending && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {QUICK_CALLOUTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => void sendCallout(item.prompt)}
                className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#090B10] px-3 py-2 text-left text-xs font-medium text-slate-200 transition-colors hover:border-[#00D4FF]/40 hover:text-white cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-rose-500/40 bg-[#1B1014] px-3.5 py-2.5 text-xs text-rose-200"
          >
            {errorMsg}
          </div>
        )}

        {/* Prompt Bar */}
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-[#090B10] p-1.5"
        >
          <Swords className="ml-2.5 h-4 w-4 shrink-0 text-[#00D4FF]" aria-hidden="true" />
          <label htmlFor="boss-coach-input" className="sr-only">
            Report death or ask Boss Fight Coach
          </label>
          <input
            id="boss-coach-input"
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Name a boss or report what attack killed you..."
            disabled={isSending}
            className="min-h-[44px] min-w-0 flex-1 bg-transparent px-2 text-sm text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={!promptInput.trim() || isSending}
            aria-label="Send to Boss Coach"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#00D4FF] px-4 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#38DFFF] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap cursor-pointer"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Coach Me</span>
          </button>
        </form>
      </div>
    </div>
  );
};
