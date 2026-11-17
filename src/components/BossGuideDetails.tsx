import React, { useState } from 'react';
import { Compass, Loader2, Shield, Sparkles, Square, Swords, Volume2, X } from 'lucide-react';
import type { BossGuide, BossLoadout } from '../types/gaming';
import { buildBossBriefingScript } from '../utils/voiceHelpers';

interface BossGuideDetailsProps {
  guide: BossGuide;
  compact?: boolean;
  onGenerateCustomLoadout?: (bossGuide: BossGuide, playstyle: string) => Promise<void>;
  isGeneratingLoadout?: boolean;
  playingVoiceId?: string | null;
  loadingVoiceId?: string | null;
  voiceError?: string | null;
  onSpeakText?: (id: string, text: string) => void;
  onClearVoiceError?: () => void;
}

const TAILOR_PLAYSTYLES = ['Aggressive DPS', 'Defensive / Tank', 'Ranged / Magic', 'Mobility / Parry'];

export const BossGuideDetails: React.FC<BossGuideDetailsProps> = ({
  guide,
  compact = false,
  onGenerateCustomLoadout,
  isGeneratingLoadout = false,
  playingVoiceId,
  loadingVoiceId,
  voiceError,
  onSpeakText,
  onClearVoiceError,
}) => {
  const [selectedLoadoutIndex, setSelectedLoadoutIndex] = useState(0);
  const [tailorStyle, setTailorStyle] = useState(TAILOR_PLAYSTYLES[0]);

  const loadouts = guide.loadouts ?? [];
  const activeLoadout: BossLoadout | undefined =
    loadouts[selectedLoadoutIndex] ?? loadouts[0];

  const briefingVoiceId = `boss-${guide.id}`;
  const isPlayingBriefing = playingVoiceId === briefingVoiceId;
  const isLoadingBriefing = loadingVoiceId === briefingVoiceId;

  return (
    <div className={compact ? 'space-y-5' : 'space-y-7'}>
      {/* Summary */}
      <div className="border-b border-white/[0.08] pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-[#00D4FF]">{guide.gameTitle}</span>
              <span aria-hidden="true">·</span>
              <span>{guide.genre}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-200">{guide.difficulty} Difficulty</span>
              {guide.arenaLocation && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{guide.arenaLocation}</span>
                </>
              )}
            </div>
            <h3 className="mt-1.5 font-display text-lg font-semibold text-white">
              {guide.bossName}
            </h3>
          </div>

          {onSpeakText && (
            <button
              type="button"
              onClick={() => onSpeakText(briefingVoiceId, buildBossBriefingScript(guide))}
              aria-label={
                isPlayingBriefing
                  ? `Stop voice briefing for ${guide.bossName}`
                  : `Listen to voice briefing for ${guide.bossName}`
              }
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isPlayingBriefing
                  ? 'border-[#00D4FF]/50 bg-[#00D4FF]/15 text-[#00D4FF]'
                  : 'border-white/10 bg-[#0C0F16] text-slate-200 hover:border-[#00D4FF]/40 hover:text-white'
              }`}
            >
              {isLoadingBriefing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#00D4FF]" aria-hidden="true" />
                  Synthesizing...
                </>
              ) : isPlayingBriefing ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  Stop Briefing
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 text-[#00D4FF]" aria-hidden="true" />
                  Listen Briefing
                </>
              )}
            </button>
          )}
        </div>

        <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
          {guide.summary}
        </p>
        {guide.weaknesses && guide.weaknesses.length > 0 && (
          <p className="mt-2.5 text-xs text-slate-300">
            <span className="font-semibold text-[#10B981]">Key Counters: </span>
            {guide.weaknesses.join(' · ')}
          </p>
        )}

        {voiceError && onSpeakText && (
          <div
            role="status"
            className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-500/35 bg-[#1A140B] px-3 py-2 text-xs text-amber-200"
          >
            <span>{voiceError}</span>
            {onClearVoiceError && (
              <button
                type="button"
                onClick={onClearVoiceError}
                aria-label="Dismiss voice notification"
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-amber-200 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Phase-by-Phase Attack Patterns & Safe Windows */}
      <section aria-label="Phase Breakdown">
        <div className="mb-3 flex items-center gap-2">
          <Swords className="h-4 w-4 text-[#00D4FF]" aria-hidden="true" />
          <h4 className="font-display text-sm font-semibold tracking-wide text-white">
            Phase Patterns &amp; Safe Attack Windows
          </h4>
        </div>

        <div className="space-y-4">
          {guide.phases.map((phase) => (
            <div
              key={`${guide.id}-phase-${phase.phaseNumber}`}
              className="rounded-xl border border-white/[0.08] bg-[#0C0F16] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                <h5 className="font-display text-sm font-semibold text-white">
                  <span className="font-mono tabular-nums text-[#00D4FF]">
                    Phase {phase.phaseNumber}
                  </span>{' '}
                  — {phase.title}
                </h5>
                <span className="font-mono text-xs tabular-nums text-slate-400">
                  {phase.hpThreshold}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold text-slate-300">
                    Attack Patterns
                  </div>
                  <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-300">
                    {phase.attackPatterns.map((pattern, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-mono text-slate-500" aria-hidden="true">
                          0{idx + 1}
                        </span>
                        <span>{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-semibold text-[#10B981]">
                    Safe Attack Windows
                  </div>
                  <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-200">
                    {phase.safeWindows.map((win, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-mono text-[#10B981]" aria-hidden="true">
                          +
                        </span>
                        <span>{win}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Positioning & Dodging Tips */}
      <section
        aria-label="Positioning and Dodging Tips"
        className="grid grid-cols-1 gap-4 border-t border-white/[0.08] pt-5 md:grid-cols-2"
      >
        <div className="rounded-xl border border-white/[0.08] bg-[#0C0F16] p-4">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[#00D4FF]" aria-hidden="true" />
            <h4 className="font-display text-sm font-semibold text-white">
              Positioning Strategy
            </h4>
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
            {guide.positioningTips.map((tip, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="font-mono text-[#00D4FF]" aria-hidden="true">
                  &bull;
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0C0F16] p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
            <h4 className="font-display text-sm font-semibold text-white">
              Dodging &amp; Evade Cues
            </h4>
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
            {guide.dodgingTips.map((tip, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="font-mono text-[#10B981]" aria-hidden="true">
                  &bull;
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Optimized Loadout Generator */}
      {activeLoadout && (
        <section
          aria-label="Optimized Loadout Generator"
          className="border-t border-white/[0.08] pt-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-display text-sm font-semibold text-white">
              Optimized Loadout
            </h4>

            {loadouts.length > 1 && (
              <div
                role="tablist"
                aria-label="Loadout Playstyle Presets"
                className="flex flex-wrap gap-1.5 rounded-lg bg-[#0C0F16] p-1 border border-white/[0.06]"
              >
                {loadouts.map((loadout, idx) => (
                  <button
                    key={`${loadout.playstyle}-${idx}`}
                    type="button"
                    role="tab"
                    aria-selected={selectedLoadoutIndex === idx}
                    onClick={() => setSelectedLoadoutIndex(idx)}
                    className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedLoadoutIndex === idx
                        ? 'bg-[#00D4FF] text-[#090B10] font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {loadout.playstyle}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 rounded-xl border border-white/[0.08] bg-[#0C0F16] p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-slate-400">
                  Primary Weapon / Tool
                </div>
                <div className="mt-1 text-sm font-semibold text-[#00D4FF]">
                  {activeLoadout.weapon}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400">
                  Playstyle Focus
                </div>
                <div className="mt-1 text-sm font-medium text-slate-100">
                  {activeLoadout.playstyle}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-white/[0.06] pt-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-slate-400">
                  Charms, Talismans &amp; Relics
                </div>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-200">
                  {activeLoadout.charmsOrRelics.map((item, idx) => (
                    <li key={idx}>&bull; {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400">
                  Skills, Arts &amp; Spells
                </div>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-200">
                  {activeLoadout.skillsOrArts.map((item, idx) => (
                    <li key={idx}>&bull; {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400">
                  Defensive Gear
                </div>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-200">
                  {activeLoadout.defensiveGear.map((item, idx) => (
                    <li key={idx}>&bull; {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400">
                  Consumables &amp; Prep
                </div>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-200">
                  {activeLoadout.consumables.length > 0 ? (
                    activeLoadout.consumables.map((item, idx) => (
                      <li key={idx}>&bull; {item}</li>
                    ))
                  ) : (
                    <li className="text-slate-400">None required</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="border-t border-white/[0.06] pt-3 text-xs leading-relaxed text-slate-300">
              <span className="font-semibold text-[#10B981]">Why this works: </span>
              {activeLoadout.rationale}
            </div>
          </div>

          {onGenerateCustomLoadout && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-[#11151E] p-3">
              <label htmlFor={`tailor-${guide.id}`} className="sr-only">
                Select custom loadout playstyle
              </label>
              <select
                id={`tailor-${guide.id}`}
                value={tailorStyle}
                onChange={(e) => setTailorStyle(e.target.value)}
                className="min-h-[44px] flex-1 rounded-lg border border-white/10 bg-[#090B10] px-3 text-xs font-medium text-slate-100 focus:border-[#00D4FF] focus:outline-none"
              >
                {TAILOR_PLAYSTYLES.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isGeneratingLoadout}
                onClick={async () => {
                  await onGenerateCustomLoadout(guide, tailorStyle);
                  setSelectedLoadoutIndex(loadouts.length);
                }}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#10B981] px-4 py-2 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#34D399] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {isGeneratingLoadout ? 'Generating Build...' : 'Tailor New Loadout'}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
