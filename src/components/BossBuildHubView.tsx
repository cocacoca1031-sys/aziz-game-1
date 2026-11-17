import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Plus, Search, Sparkles, Swords, Trash2, X } from 'lucide-react';
import { GAME_CASE_DOSSIERS, GAME_CASE_MAP } from '../data/gameCases';
import type { BossGuide } from '../types/gaming';
import { filterBossGuides, getUniqueGames } from '../utils/bossFilter';
import { BossGuideDetails } from './BossGuideDetails';

interface BossBuildHubViewProps {
  guides: BossGuide[];
  onAddBossGuide: (guide: BossGuide) => void;
  onUpdateBossGuide: (guide: BossGuide) => void;
  onRemoveBossGuide: (bossId: string) => void;
  selectedBossId?: string | null;
  onClearSelectedBossId?: () => void;
  playingVoiceId?: string | null;
  loadingVoiceId?: string | null;
  voiceError?: string | null;
  onSpeakText?: (id: string, text: string) => void;
  onClearVoiceError?: () => void;
}

const PLAYSTYLE_OPTIONS = [
  'Balanced',
  'Aggressive DPS',
  'Defensive / Tank',
  'Ranged / Arcane',
  'Mobility / Parry',
];

const DIFFICULTY_FILTERS = ['All', 'Standard', 'Hard', 'Extreme', 'Nightmare'] as const;

export const BossBuildHubView: React.FC<BossBuildHubViewProps> = ({
  guides,
  onAddBossGuide,
  onUpdateBossGuide,
  onRemoveBossGuide,
  selectedBossId,
  onClearSelectedBossId,
  playingVoiceId,
  loadingVoiceId,
  voiceError,
  onSpeakText,
  onClearVoiceError,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [activeGuideId, setActiveGuideId] = useState<string | null>(selectedBossId ?? null);
  const [confirmRemoveBossId, setConfirmRemoveBossId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedBossId) {
      setActiveGuideId(selectedBossId);
      onClearSelectedBossId?.();
    }
  }, [selectedBossId, onClearSelectedBossId]);

  // Custom Boss Build Generator form state
  const [bossNameInput, setBossNameInput] = useState('');
  const [gameTitleInput, setGameTitleInput] = useState('');
  const [playstyleInput, setPlaystyleInput] = useState(PLAYSTYLE_OPTIONS[0]);
  const [genError, setGenError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);

  const uniqueGames = useMemo(() => getUniqueGames(guides), [guides]);
  const bossCountsByGame = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of guides) {
      counts[g.gameTitle] = (counts[g.gameTitle] ?? 0) + 1;
    }
    return counts;
  }, [guides]);

  const filteredGuides = useMemo(
    () => filterBossGuides(guides, searchQuery, selectedGame, selectedDifficulty),
    [guides, searchQuery, selectedGame, selectedDifficulty]
  );

  const activeGameCase = useMemo(
    () => (selectedGame !== 'All' ? GAME_CASE_MAP[selectedGame] ?? null : null),
    [selectedGame]
  );

  const activeGuide = useMemo(
    () => guides.find((g) => g.id === activeGuideId) ?? null,
    [guides, activeGuideId]
  );

  const handleGenerateGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenError(null);
    if (!bossNameInput.trim() || !gameTitleInput.trim()) {
      setGenError('Enter both a Boss Name and Game Title.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/boss-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bossName: bossNameInput.trim(),
          gameTitle: gameTitleInput.trim(),
          playstyle: playstyleInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || 'Failed to generate boss build.');
        return;
      }
      if (data.bossGuide) {
        onAddBossGuide(data.bossGuide);
        setShowGenerator(false);
        setBossNameInput('');
        setGameTitleInput('');
        setActiveGuideId(data.bossGuide.id);
      }
    } catch {
      setGenError('Network error while generating tactical dossier.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTailorLoadout = async (guide: BossGuide, playstyle: string) => {
    setIsTailoring(true);
    try {
      const res = await fetch('/api/boss-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bossName: guide.bossName,
          gameTitle: guide.gameTitle,
          playstyle,
        }),
      });
      const data = await res.json();
      if (res.ok && data.bossGuide?.loadouts?.[0]) {
        const newLoadout = data.bossGuide.loadouts[0];
        onUpdateBossGuide({
          ...guide,
          loadouts: [...guide.loadouts, newLoadout],
        });
      }
    } finally {
      setIsTailoring(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 pb-24 sm:px-6">
      {/* Header + Primary Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-white sm:text-2xl">
            Boss &amp; Build Hub
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Instant tactical lookup, phase breakdowns, dodge cues, and custom loadouts
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setGenError(null);
            setShowGenerator(true);
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#00D4FF] px-4 py-2 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#38DFFF] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Generate Boss Build
        </button>
      </div>

      {/* Search, Difficulty & Game Filter Bar */}
      <div className="mt-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="boss-search-input" className="sr-only">
              Search bosses, games, or loadouts
            </label>
            <input
              id="boss-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Instant search: boss, game, weakness, weapon..."
              className="min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#11151E] pl-10 pr-10 text-sm text-white placeholder:text-slate-400 focus:border-[#00D4FF] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear boss search"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter bosses by difficulty"
            className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#11151E] p-1"
          >
            {DIFFICULTY_FILTERS.map((diff) => {
              const active = selectedDifficulty === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`min-h-[36px] rounded-lg px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#182232] text-[#10B981]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Filter bosses by game"
          className="flex items-center gap-1.5 overflow-x-auto pb-1"
        >
          {['All', ...uniqueGames].map((game) => {
            const isSelected = selectedGame === game;
            const count = game === 'All' ? guides.length : bossCountsByGame[game] ?? 0;
            return (
              <button
                key={game}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedGame(game)}
                className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#182232] text-[#00D4FF] border border-[#00D4FF]/40'
                    : 'bg-[#11151E] text-slate-300 border border-white/[0.06] hover:text-white'
                }`}
              >
                <span>{game}</span>{' '}
                <span className="font-mono text-[11px] tabular-nums opacity-75">
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Game Case Tactical Dossier (Full brief when a game is selected, or scrollable Game Case cards when All) */}
      {activeGameCase ? (
        <section
          aria-label={`${activeGameCase.gameTitle} Combat Dossier`}
          className="mt-4 rounded-2xl border border-white/[0.08] bg-[#11151E] p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-3.5">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-medium text-[#00D4FF]">{activeGameCase.genre}</span>
                <span aria-hidden="true">·</span>
                <span>{activeGameCase.platforms}</span>
              </div>
              <h2 className="mt-1 font-display text-lg font-semibold text-white">
                {activeGameCase.gameTitle} — Game Combat Case
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedGame('All')}
              className="min-h-[36px] rounded-lg border border-white/10 px-3 text-xs font-medium text-slate-300 hover:border-white/25 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              All Game Cases
            </button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-200 sm:text-sm">
            {activeGameCase.coreCombatLoop}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-[#00D4FF]">Key Combat Mechanics</div>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
                {activeGameCase.keyMechanics.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="font-mono text-slate-500" aria-hidden="true">
                      0{idx + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 border-t border-white/[0.06] pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4">
              <div>
                <div className="text-xs font-semibold text-[#10B981]">
                  Recommended Endgame Loadout
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-200">
                  {activeGameCase.recommendedEndgameLoadout}
                </p>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-300">
                  Elemental &amp; Stagger Notes
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {activeGameCase.elementalOrStaggerNotes}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section
          aria-label="Featured Game Cases"
          className="mt-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-[#00D4FF]" aria-hidden="true" />
              <h2 className="text-xs font-semibold text-slate-300">
                Game Combat Cases ({GAME_CASE_DOSSIERS.length} titles covered)
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Select a game to inspect full mechanics &amp; bosses
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {GAME_CASE_DOSSIERS.map((gameCase) => {
              const count = bossCountsByGame[gameCase.gameTitle] ?? 0;
              return (
                <button
                  key={gameCase.gameTitle}
                  type="button"
                  onClick={() => setSelectedGame(gameCase.gameTitle)}
                  className="flex min-w-[235px] max-w-[260px] shrink-0 flex-col justify-between rounded-xl border border-white/[0.08] bg-[#11151E] p-3.5 text-left transition-colors hover:border-[#00D4FF]/40 hover:bg-[#151B27] cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="font-medium text-[#00D4FF] truncate">
                        {gameCase.genre}
                      </span>
                      <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
                        {count} {count === 1 ? 'Boss' : 'Bosses'}
                      </span>
                    </div>
                    <div className="mt-1 font-display text-sm font-semibold text-white truncate">
                      {gameCase.gameTitle}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                      {gameCase.coreCombatLoop}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px] font-medium text-[#10B981]">
                    <span className="truncate">{gameCase.platforms}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Boss Card Grid */}
      {filteredGuides.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-[#11151E] p-8 text-center">
          <p className="text-sm font-medium text-slate-200">
            No matching boss dossiers in your local hub.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Generate a custom AI tactical breakdown &amp; loadout right now.
          </p>
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => {
                setBossNameInput(searchQuery.trim());
                setGameTitleInput(selectedGame !== 'All' ? selectedGame : '');
                setGenError(null);
                setShowGenerator(true);
              }}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#00D4FF] px-4 py-2 text-xs font-semibold text-[#090B10] hover:bg-[#38DFFF] cursor-pointer"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Generate AI Guide for &ldquo;{searchQuery.trim()}&rdquo;
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {filteredGuides.map((guide) => {
            const primaryLoadout = guide.loadouts[0];
            const showFallback = !guide.imageUrl || failedImages[guide.id];

            return (
              <article
                key={guide.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#11151E] transition-colors hover:border-[#00D4FF]/35"
              >
                {/* 16:9 Media Header with Contrast Scrim */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0C0F16]">
                  {!showFallback ? (
                    <img
                      src={guide.imageUrl}
                      alt={`${guide.bossName} tactical arena visual`}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [guide.id]: true }))
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-[#121A2B] via-[#0F141F] to-[#090B10] p-5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono uppercase tracking-wider text-[#00D4FF]">
                          Tactical Codex
                        </span>
                        <Swords className="h-5 w-5 text-[#00D4FF]/70" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="font-display text-lg font-semibold text-white/90">
                          {guide.bossName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {guide.gameTitle} · {guide.genre}
                        </div>
                      </div>
                    </div>
                  )}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#11151E] via-[#11151E]/25 to-transparent"
                  />
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                    <span className="font-medium text-[#00D4FF]">{guide.gameTitle}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        guide.difficulty === 'Nightmare'
                          ? 'text-rose-300'
                          : guide.difficulty === 'Extreme'
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }
                    >
                      {guide.difficulty}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {guide.phases.length} {guide.phases.length === 1 ? 'Phase' : 'Phases'}
                    </span>
                    {guide.arenaLocation && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{guide.arenaLocation}</span>
                      </>
                    )}
                  </div>

                  <h2 className="mt-1.5 font-display text-lg font-semibold text-white">
                    {guide.bossName}
                  </h2>

                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-300">
                    {guide.summary}
                  </p>

                  <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-3 text-xs">
                    {guide.weaknesses && guide.weaknesses.length > 0 && (
                      <div>
                        <span className="text-slate-400">Key Counters: </span>
                        <span className="font-medium text-slate-200">
                          {guide.weaknesses.slice(0, 3).join(' · ')}
                        </span>
                      </div>
                    )}
                    {primaryLoadout && (
                      <div>
                        <div className="text-slate-400">Recommended Weapon</div>
                        <div className="mt-0.5 truncate font-medium text-[#10B981]">
                          {primaryLoadout.weapon}
                        </div>
                      </div>
                    )}
                  </div>

                  {confirmRemoveBossId === guide.id && activeGuideId !== guide.id && (
                    <div
                      role="region"
                      aria-label={`Confirm removal of ${guide.bossName}`}
                      className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/35 bg-rose-950/30 px-3.5 py-2.5"
                    >
                      <span className="text-xs font-medium text-rose-200">
                        Remove <strong className="text-white">{guide.bossName}</strong>?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveBossId(null)}
                          aria-label={`Cancel removing ${guide.bossName}`}
                          className="min-h-[36px] rounded-lg border border-white/15 bg-[#0C0F16] px-3 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onRemoveBossGuide(guide.id);
                            setConfirmRemoveBossId(null);
                            if (activeGuideId === guide.id) {
                              setActiveGuideId(null);
                            }
                          }}
                          aria-label={`Confirm remove ${guide.bossName}`}
                          className="min-h-[36px] rounded-lg bg-rose-500 px-3 text-xs font-semibold text-white hover:bg-rose-400 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveGuideId(guide.id)}
                      aria-label={`Inspect tactics for ${guide.bossName}`}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-between rounded-xl border border-white/10 bg-[#0C0F16] px-4 text-xs font-semibold text-white transition-colors hover:border-[#00D4FF]/50 hover:text-[#00D4FF] cursor-pointer"
                    >
                      <span>Inspect Tactics &amp; Loadout</span>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmRemoveBossId((prev) => (prev === guide.id ? null : guide.id))
                      }
                      aria-label={`Remove ${guide.bossName}`}
                      title={`Remove ${guide.bossName}`}
                      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0C0F16] text-slate-400 transition-colors hover:border-rose-500/45 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Boss Tactical Dossier Modal */}
      {activeGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${activeGuide.bossName} Tactical Dossier`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#11151E] shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
              <span className="font-display text-sm font-semibold text-slate-200">
                Tactical Dossier
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmRemoveBossId((prev) =>
                      prev === activeGuide.id ? null : activeGuide.id
                    )
                  }
                  aria-label={`Remove ${activeGuide.bossName} from Boss Hub`}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/10 bg-[#0C0F16] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-rose-500/45 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Remove Boss</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmRemoveBossId(null);
                    setActiveGuideId(null);
                  }}
                  aria-label="Close tactical dossier"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {confirmRemoveBossId === activeGuide.id && (
              <div
                role="region"
                aria-label={`Confirm removal of ${activeGuide.bossName}`}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/30 bg-rose-950/35 px-5 py-2.5"
              >
                <span className="text-xs font-medium text-rose-200">
                  Remove <strong className="text-white">{activeGuide.bossName}</strong> from Boss Hub?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveBossId(null)}
                    aria-label={`Cancel removing ${activeGuide.bossName}`}
                    className="min-h-[36px] rounded-lg border border-white/15 bg-[#0C0F16] px-3 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveBossGuide(activeGuide.id);
                      setConfirmRemoveBossId(null);
                      setActiveGuideId(null);
                    }}
                    aria-label={`Confirm remove ${activeGuide.bossName}`}
                    className="min-h-[36px] rounded-lg bg-rose-500 px-3 text-xs font-semibold text-white hover:bg-rose-400 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <BossGuideDetails
                guide={activeGuide}
                onGenerateCustomLoadout={handleTailorLoadout}
                isGeneratingLoadout={isTailoring}
                playingVoiceId={playingVoiceId}
                loadingVoiceId={loadingVoiceId}
                voiceError={voiceError}
                onSpeakText={onSpeakText}
                onClearVoiceError={onClearVoiceError}
              />
            </div>
          </div>
        </div>
      )}

      {/* Generate Custom Boss Build Modal */}
      {showGenerator && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Generate Custom Boss Build"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#11151E] p-6 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">
                Generate Boss Build
              </h2>
              <button
                type="button"
                onClick={() => setShowGenerator(false)}
                aria-label="Close boss build generator"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateGuide} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="gen-boss-name"
                  className="block text-xs font-medium text-slate-300"
                >
                  Boss Name
                </label>
                <input
                  id="gen-boss-name"
                  type="text"
                  required
                  value={bossNameInput}
                  onChange={(e) => setBossNameInput(e.target.value)}
                  placeholder="e.g. Fatalis"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00D4FF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="gen-game-title"
                  className="block text-xs font-medium text-slate-300"
                >
                  Video Game Title
                </label>
                <input
                  id="gen-game-title"
                  type="text"
                  required
                  value={gameTitleInput}
                  onChange={(e) => setGameTitleInput(e.target.value)}
                  placeholder="e.g. Monster Hunter World: Iceborne"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00D4FF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="gen-playstyle"
                  className="block text-xs font-medium text-slate-300"
                >
                  Target Playstyle
                </label>
                <select
                  id="gen-playstyle"
                  value={playstyleInput}
                  onChange={(e) => setPlaystyleInput(e.target.value)}
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3.5 text-sm text-white focus:border-[#00D4FF] focus:outline-none"
                >
                  {PLAYSTYLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {genError && (
                <div
                  role="alert"
                  className="rounded-xl border border-amber-500/40 bg-[#1A140B] px-3.5 py-2.5 text-xs font-medium text-amber-200"
                >
                  {genError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="min-h-[44px] flex-1 rounded-xl border border-white/10 px-4 text-xs font-medium text-slate-300 hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="min-h-[44px] flex-1 rounded-xl bg-[#00D4FF] px-4 text-xs font-semibold text-[#090B10] hover:bg-[#38DFFF] disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? 'Generating...' : 'Generate Dossier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
