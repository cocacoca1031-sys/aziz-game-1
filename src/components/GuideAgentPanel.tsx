import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Compass,
  Copy,
  ImagePlus,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import type {
  GuideAgentMessage,
  GuideAgentSessionState,
  GuideHintPreference,
} from '../types/gaming';
import {
  appendGuideAgentTurn,
  createDefaultGuideAgentState,
  parseBoldMarkdownSegments,
} from '../utils/guideAgent';

interface GuideAgentPanelProps {
  agentState: GuideAgentSessionState;
  onUpdateState: (next: GuideAgentSessionState) => void;
  playingVoiceId?: string | null;
  loadingVoiceId?: string | null;
  onSpeakText?: (id: string, text: string) => void;
}

const HINT_MODE_OPTIONS: { id: GuideHintPreference; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'hint', label: 'Hint' },
  { id: 'walkthrough', label: 'Walkthrough' },
];

const QUICK_AGENT_PROMPTS = [
  {
    label: 'Subtle hint without spoilers',
    prompt: 'Give me a subtle spoiler-free hint for my current area.',
  },
  {
    label: 'Boss loadout & dodge counters',
    prompt: 'Give me a boss counter loadout and phase breakdown using only early/current gear.',
  },
  {
    label: 'Log beaten boss & next step',
    prompt: 'I just cleared my current boss/objective. Log this milestone and suggest what next.',
  },
];

function renderFormattedText(content: string): React.ReactNode {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1" />;
        }
        const segments = parseBoldMarkdownSegments(line);
        return (
          <p key={lineIdx} className="leading-relaxed">
            {segments.map((seg, segIdx) =>
              seg.bold ? (
                <strong key={segIdx} className="font-semibold text-white">
                  {seg.text}
                </strong>
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

export const GuideAgentPanel: React.FC<GuideAgentPanelProps> = ({
  agentState,
  onUpdateState,
  playingVoiceId,
  loadingVoiceId,
  onSpeakText,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Screenshot upload state
  const [attachedImageBase64, setAttachedImageBase64] = useState('');
  const [attachedMimeType, setAttachedMimeType] = useState('image/png');
  const [attachedPreviewUrl, setAttachedPreviewUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentState.messages.length, isSending]);

  const handleAttachFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Attach a valid PNG, JPEG, or WebP screenshot.');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setErrorMsg('Screenshot must be under 6 MB.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx === -1) return;
      setAttachedPreviewUrl(dataUrl);
      setAttachedMimeType(file.type || 'image/png');
      setAttachedImageBase64(dataUrl.slice(commaIdx + 1));
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleAttachFile(file);
          return;
        }
      }
    }
  };

  const clearAttachment = () => {
    setAttachedImageBase64('');
    setAttachedPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const sendToAgent = async (overrideText?: string) => {
    const text = (overrideText ?? promptInput).trim();
    const hasImg = Boolean(attachedImageBase64);
    if ((!text && !hasImg) || isSending) return;

    setErrorMsg(null);
    if (!overrideText) setPromptInput('');

    const imageBase64ToSend = attachedImageBase64;
    const imageMimeToSend = attachedMimeType;
    const previewToShow = attachedPreviewUrl;
    clearAttachment();

    const userMsg: GuideAgentMessage = {
      id: `ga-user-${Date.now()}`,
      role: 'user',
      content: text || 'Analyze this game screenshot and guide me without spoilers.',
      imagePreviewUrl: previewToShow || undefined,
      timestamp: new Date().toISOString(),
    };

    setIsSending(true);
    try {
      const res = await fetch('/api/guide-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          gameTitle: agentState.gameTitle,
          currentProgress: agentState.currentProgress,
          hintPreference: agentState.hintPreference,
          milestones: agentState.milestones,
          history: agentState.messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          imageBase64: imageBase64ToSend || undefined,
          imageMimeType: imageBase64ToSend ? imageMimeToSend : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Unable to reach Guide Agent right now.');
        return;
      }

      const agentMsg: GuideAgentMessage = {
        id: `ga-agent-${Date.now()}`,
        role: 'agent',
        content: data.replyText || 'Tell me your **Game Title** and **current progress** to begin.',
        milestoneCompleted: data.milestoneCompleted || undefined,
        suggestedNextStep: data.suggestedNextStep || undefined,
        needsProgressCheck: Boolean(data.needsProgressCheck),
        isRefusal: data.kind === 'refusal' || Boolean(data.isOffTopic),
        timestamp: new Date().toISOString(),
      };

      const nextState = appendGuideAgentTurn(agentState, userMsg, agentMsg, {
        detectedGame: data.detectedGame,
        detectedProgress: data.detectedProgress,
        milestoneCompleted: data.milestoneCompleted,
      });
      onUpdateState(nextState);
    } catch {
      setErrorMsg('Network error reaching Guide Agent.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendToAgent();
  };

  return (
    <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[328px_1fr] lg:items-start">
      {/* Spoiler Shield & Session State Sidebar */}
      <aside
        aria-label="Guide Agent Spoiler Shield & Progress"
        className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-4 sm:p-5"
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-white">
              Spoiler Shield &amp; Progress
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onUpdateState(createDefaultGuideAgentState())}
            aria-label="Reset Guide Agent session"
            title="Start fresh Guide Agent session"
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          <div>
            <label
              htmlFor="guide-agent-game"
              className="block text-xs font-medium text-slate-300"
            >
              Game Title
            </label>
            <input
              id="guide-agent-game"
              type="text"
              value={agentState.gameTitle}
              onChange={(e) =>
                onUpdateState({
                  ...agentState,
                  gameTitle: e.target.value,
                  updatedAt: new Date().toISOString(),
                })
              }
              placeholder="e.g. Elden Ring, Hollow Knight"
              className="mt-1.5 min-h-[42px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3 text-xs text-white placeholder:text-slate-500 focus:border-[#00D4FF] focus:outline-none sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="guide-agent-progress"
              className="block text-xs font-medium text-slate-300"
            >
              Current Chapter / Boss / Area
            </label>
            <input
              id="guide-agent-progress"
              type="text"
              value={agentState.currentProgress}
              onChange={(e) =>
                onUpdateState({
                  ...agentState,
                  currentProgress: e.target.value,
                  updatedAt: new Date().toISOString(),
                })
              }
              placeholder="e.g. Just entered Stormveil Castle"
              className="mt-1.5 min-h-[42px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3 text-xs text-white placeholder:text-slate-500 focus:border-[#00D4FF] focus:outline-none sm:text-sm"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-300">
              Hint Preference
            </span>
            <div
              role="group"
              aria-label="Guidance detail mode"
              className="mt-1.5 flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#090B10] p-1"
            >
              {HINT_MODE_OPTIONS.map((opt) => {
                const active = agentState.hintPreference === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onUpdateState({
                        ...agentState,
                        hintPreference: opt.id,
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    className={`min-h-[36px] flex-1 rounded-lg px-2.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
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

          {/* Tracked Session Milestones */}
          <div className="border-t border-white/[0.08] pt-3">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-medium">Logged Milestones</span>
              <span className="font-mono text-slate-400 tabular-nums">
                {agentState.milestones.length}
              </span>
            </div>

            {agentState.milestones.length === 0 ? (
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Mention beaten bosses, cleared quests, or found items—the agent tracks them automatically.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {agentState.milestones.map((milestone, idx) => (
                  <li
                    key={`${milestone}-${idx}`}
                    className="flex items-start justify-between gap-2 rounded-lg border border-white/[0.06] bg-[#090B10] px-2.5 py-2 text-xs text-slate-200"
                  >
                    <span className="flex items-start gap-1.5">
                      <CheckCircle2
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]"
                        aria-hidden="true"
                      />
                      <span>{milestone}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState({
                          ...agentState,
                          milestones: agentState.milestones.filter((_, i) => i !== idx),
                        })
                      }
                      aria-label={`Remove milestone ${milestone}`}
                      className="text-slate-500 hover:text-white cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>

      {/* Live Guide Agent Conversation Feed */}
      <div className="flex min-w-0 flex-col rounded-2xl border border-white/[0.08] bg-[#11151E] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              {agentState.gameTitle.trim()
                ? `${agentState.gameTitle} Guide Agent`
                : 'Adaptive AI Game Guide Agent'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {agentState.currentProgress.trim()
                ? `Spoiler Shield at: ${agentState.currentProgress}`
                : 'Patch-accurate, spoiler-safe guidance & screenshot analysis'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div aria-live="polite" className="mt-4 max-h-[460px] space-y-4 overflow-y-auto pr-1">
          {agentState.messages.map((msg) => {
            const isUser = msg.role === 'user';
            const voiceId = `guide-agent-${msg.id}`;
            const isPlayingThis = playingVoiceId === voiceId;
            const isLoadingThis = loadingVoiceId === voiceId;
            const isCopied = copiedId === msg.id;

            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[88%] space-y-2 rounded-2xl rounded-br-sm border border-[#00D4FF]/25 bg-[#122030] px-4 py-3 text-sm text-white sm:max-w-[78%]">
                    {msg.imagePreviewUrl && (
                      <img
                        src={msg.imagePreviewUrl}
                        alt="Uploaded game screenshot"
                        className="max-h-44 w-auto rounded-lg border border-white/10 object-contain"
                      />
                    )}
                    <p className="leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              );
            }

            if (msg.isRefusal) {
              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    data-testid="guide-agent-refusal"
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
                  {renderFormattedText(msg.content)}

                  {msg.milestoneCompleted && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#10B981]/35 bg-[#0D1A17] px-3 py-2 text-xs text-[#10B981]">
                      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Milestone logged: {msg.milestoneCompleted}</span>
                    </div>
                  )}

                  {msg.suggestedNextStep && (
                    <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-white/[0.07] bg-[#11151E] px-3 py-2 text-xs text-slate-300">
                      <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00D4FF]" aria-hidden="true" />
                      <span>
                        <strong className="font-semibold text-white">Next logical step: </strong>
                        {msg.suggestedNextStep}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {onSpeakText && (
                      <button
                        type="button"
                        onClick={() => onSpeakText(voiceId, msg.content.replace(/\*\*/g, ''))}
                        aria-label={isPlayingThis ? 'Stop audio playback' : 'Listen to guide reply'}
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
                      onClick={() => handleCopy(msg.id, msg.content.replace(/\*\*/g, ''))}
                      aria-label="Copy guide response"
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
                Analyzing stage &amp; checking spoiler shield...
              </div>
            </div>
          )}

          <div ref={feedEndRef} />
        </div>

        {/* Quick Prompts */}
        {agentState.messages.length <= 1 && !isSending && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {QUICK_AGENT_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                type="button"
                onClick={() => void sendToAgent(qp.prompt)}
                className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#090B10] px-3 py-2 text-left text-xs font-medium text-slate-200 transition-colors hover:border-[#00D4FF]/40 hover:text-white cursor-pointer"
              >
                {qp.label}
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

        {/* Attached Screenshot Preview */}
        {attachedPreviewUrl && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#00D4FF]/35 bg-[#090B10] p-2.5">
            <div className="flex items-center gap-3">
              <img
                src={attachedPreviewUrl}
                alt="Attached screenshot preview"
                className="h-12 w-16 rounded-lg object-cover"
              />
              <span className="text-xs text-slate-300">
                Screenshot attached for visual UI &amp; puzzle analysis
              </span>
            </div>
            <button
              type="button"
              onClick={clearAttachment}
              aria-label="Remove attached screenshot"
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Prompt Input & Screenshot Upload */}
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-[#090B10] p-1.5"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            aria-label="Upload game screenshot"
            onChange={(e) => handleAttachFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach game screenshot"
            title="Attach or paste screenshot for UI/puzzle analysis"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#11151E] text-slate-300 transition-colors hover:border-[#00D4FF]/40 hover:text-[#00D4FF] cursor-pointer"
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
          </button>

          <label htmlFor="guide-agent-prompt-input" className="sr-only">
            Ask Guide Agent
          </label>
          <input
            id="guide-agent-prompt-input"
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onPaste={handlePaste}
            placeholder="Ask for a hint, boss counter, collectible path, or paste a screenshot..."
            disabled={isSending}
            className="min-h-[44px] min-w-0 flex-1 bg-transparent px-2 text-sm text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={(!promptInput.trim() && !attachedImageBase64) || isSending}
            aria-label="Send guide question"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#00D4FF] px-4 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#38DFFF] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap cursor-pointer"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
