import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  Circle,
  Loader2,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import type {
  GameGuide,
  GuideAgentSessionState,
  GuideCategory,
  GuideDifficulty,
} from '../types/gaming';
import {
  GUIDE_CATEGORY_OPTIONS,
  buildGuideBriefingScript,
  calculateGuideProgress,
  filterGameGuides,
} from '../utils/guideFilter';
import { GuideAgentPanel } from './GuideAgentPanel';

interface GuidesViewProps {
  guides: GameGuide[];
  onAddGuide: (guide: GameGuide) => void;
  onToggleStep: (guideId: string, stepId: string) => void;
  onToggleBookmark: (guideId: string) => void;
  onRemoveGuide: (guideId: string) => void;
  agentState: GuideAgentSessionState;
  onUpdateAgentState: (next: GuideAgentSessionState) => void;
  playingVoiceId?: string | null;
  loadingVoiceId?: string | null;
  voiceError?: string | null;
  onSpeakText?: (id: string, text: string) => void;
  onClearVoiceError?: () => void;
}

const CREATE_CATEGORIES: GuideCategory[] = [
  'Story Walkthrough',
  'Secrets & Collectibles',
  'Trophy Roadmap',
  'Mechanics & Combat',
  'Beginner Essentials',
];

const DIFFICULTY_OPTIONS: GuideDifficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

export const GuidesView: React.FC<GuidesViewProps> = ({
  guides,
  onAddGuide,
  onToggleStep,
  onToggleBookmark,
  onRemoveGuide,
  agentState,
  onUpdateAgentState,
  playingVoiceId,
  loadingVoiceId,
  voiceError,
  onSpeakText,
  onClearVoiceError,
}) => {
  const [sectionMode, setSectionMode] = useState<'library' | 'agent'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | GuideCategory>('All');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Generator modal state
  const [showGenerator, setShowGenerator] = useState(false);
  const [gameTitleInput, setGameTitleInput] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<GuideCategory>('Story Walkthrough');
  const [difficultyInput, setDifficultyInput] = useState<GuideDifficulty>('Intermediate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const bookmarkedCount = useMemo(
    () => guides.filter((g) => Boolean(g.bookmarked)).length,
    [guides]
  );

  const filteredGuides = useMemo(
    () => filterGameGuides(guides, searchQuery, selectedCategory, bookmarkedOnly),
    [guides, searchQuery, selectedCategory, bookmarkedOnly]
  );

  const activeGuide = useMemo(
    () => guides.find((g) => g.id === activeGuideId) ?? null,
    [guides, activeGuideId]
  );

  const handleGenerateGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenError(null);

    if (!gameTitleInput.trim() || !topicInput.trim()) {
      setGenError('Enter both a Game Title and Guide Topic.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameTitle: gameTitleInput.trim(),
          topic: topicInput.trim(),
          category: categoryInput,
          difficulty: difficultyInput,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.kind === 'refusal') {
        setGenError(data.error || 'Failed to generate game guide.');
        return;
      }

      if (data.guide) {
        onAddGuide(data.guide);
        setShowGenerator(false);
        setGameTitleInput('');
        setTopicInput('');
        setActiveGuideId(data.guide.id);
      }
    } catch {
      setGenError('Network error while generating guide.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmDelete = (guideId: string) => {
    onRemoveGuide(guideId);
    setConfirmRemoveId(null);
    if (activeGuideId === guideId) {
      setActiveGuideId(null);
    }
  };

  if (activeGuide) {
    const progress = calculateGuideProgress(activeGuide);
    const voiceKey = `guide-${activeGuide.id}`;
    const isPlayingThis = playingVoiceId === voiceKey;
    const isLoadingThis = loadingVoiceId === voiceKey;

    return (
      <div className="mx-auto max-w-5xl px-4 pt-5 pb-24 sm:px-6">
        {/* Top Action Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <button
            type="button"
            onClick={() => {
              setActiveGuideId(null);
              setConfirmRemoveId(null);
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-[#11151E] px-3.5 text-xs font-medium text-slate-200 transition-colors hover:border-[#00D4FF]/40 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>All Guides</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onUpdateAgentState({
                  ...agentState,
                  gameTitle: activeGuide.gameTitle,
                  updatedAt: new Date().toISOString(),
                });
                setActiveGuideId(null);
                setSectionMode('agent');
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#00D4FF]/45 bg-[#0D1A26] px-3.5 text-xs font-semibold text-[#00D4FF] transition-colors hover:bg-[#00D4FF]/15 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Bot className="h-4 w-4" aria-hidden="true" />
              <span>Ask Guide Agent</span>
            </button>

            {onSpeakText && (
              <button
                type="button"
                onClick={() => onSpeakText(voiceKey, buildGuideBriefingScript(activeGuide))}
                aria-label={isPlayingThis ? 'Stop guide audio' : 'Listen to guide summary'}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isPlayingThis
                    ? 'border-[#00D4FF]/50 bg-[#00D4FF]/15 text-[#00D4FF]'
                    : 'border-white/10 bg-[#11151E] text-slate-200 hover:border-[#00D4FF]/40 hover:text-white'
                }`}
              >
                {isLoadingThis ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#00D4FF]" aria-hidden="true" />
                    <span>Generating Audio...</span>
                  </>
                ) : isPlayingThis ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span>Stop Audio</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 text-[#00D4FF]" aria-hidden="true" />
                    <span>Listen</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => onToggleBookmark(activeGuide.id)}
              aria-pressed={Boolean(activeGuide.bookmarked)}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeGuide.bookmarked
                  ? 'border-[#00D4FF]/45 bg-[#00D4FF]/15 text-[#00D4FF]'
                  : 'border-white/10 bg-[#11151E] text-slate-200 hover:border-white/20 hover:text-white'
              }`}
            >
              <Bookmark
                className={`h-4 w-4 ${activeGuide.bookmarked ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
              <span>{activeGuide.bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>

            {confirmRemoveId === activeGuide.id ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleConfirmDelete(activeGuide.id)}
                  className="inline-flex min-h-[44px] items-center rounded-xl bg-rose-500 px-3.5 text-xs font-semibold text-white hover:bg-rose-400 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemoveId(null)}
                  className="inline-flex min-h-[44px] items-center rounded-xl border border-white/10 bg-[#11151E] px-3 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRemoveId(activeGuide.id)}
                aria-label={`Delete ${activeGuide.title}`}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-[#11151E] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-rose-500/40 hover:text-rose-300 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {voiceError && (
          <div
            role="alert"
            className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-[#1A140B] px-3.5 py-2.5 text-xs text-amber-200"
          >
            <span>{voiceError}</span>
            {onClearVoiceError && (
              <button
                type="button"
                onClick={onClearVoiceError}
                aria-label="Dismiss voice error"
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Guide Header & Completion Progress */}
        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#11151E] p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 tabular-nums">
            <span className="font-medium text-[#00D4FF]">{activeGuide.gameTitle}</span>
            <span aria-hidden="true">·</span>
            <span>{activeGuide.category}</span>
            <span aria-hidden="true">·</span>
            <span>{activeGuide.difficulty}</span>
            <span aria-hidden="true">·</span>
            <span>{activeGuide.estimatedMinutes} min read</span>
          </div>

          <h1 className="mt-2 font-display text-xl font-semibold text-white sm:text-2xl">
            {activeGuide.title}
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{activeGuide.summary}</p>

          <div className="mt-5 border-t border-white/[0.08] pt-4">
            <div className="flex items-center justify-between text-xs text-slate-300 tabular-nums">
              <span className="font-medium">Walkthrough Checklist Progress</span>
              <span className="font-mono text-[#10B981]">
                {progress.completedCount} / {progress.totalCount} steps ({progress.percent}%)
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-[#10B981] transition-all duration-200"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Missable Warnings & Prerequisites */}
        {(activeGuide.missableWarnings.length > 0 || activeGuide.prerequisites.length > 0) && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeGuide.missableWarnings.length > 0 && (
              <div className="rounded-2xl border border-amber-500/35 bg-[#17130C] p-4 sm:p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Missable Warning</span>
                </div>
                <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-amber-100/90 sm:text-sm">
                  {activeGuide.missableWarnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeGuide.prerequisites.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-4 sm:p-5">
                <h2 className="text-xs font-semibold text-slate-200">Prerequisites</h2>
                <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {activeGuide.prerequisites.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00D4FF]" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Interactive Step-by-Step Guide */}
        <section aria-label="Step-by-Step Walkthrough" className="mt-6 space-y-3">
          <h2 className="font-display text-base font-semibold text-white sm:text-lg">
            Step-by-Step Walkthrough
          </h2>

          <div className="space-y-3">
            {activeGuide.steps.map((step) => {
              const done = Boolean(step.completed);
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onToggleStep(activeGuide.id, step.id)}
                  aria-pressed={done}
                  className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-colors cursor-pointer ${
                    done
                      ? 'border-[#10B981]/35 bg-[#0E1817]'
                      : 'border-white/[0.08] bg-[#11151E] hover:border-white/20'
                  }`}
                >
                  <span className="mt-0.5 flex min-h-[24px] min-w-[24px] shrink-0 items-center justify-center">
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-500" aria-hidden="true" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3
                        className={`text-sm font-semibold ${
                          done ? 'text-slate-400 line-through' : 'text-white'
                        }`}
                      >
                        {String(step.stepNumber).padStart(2, '0')}. {step.title}
                      </h3>

                      {step.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="h-3 w-3 text-[#00D4FF]" aria-hidden="true" />
                          <span>{step.location}</span>
                        </span>
                      )}
                    </div>

                    <p
                      className={`mt-1.5 text-xs leading-relaxed sm:text-sm ${
                        done ? 'text-slate-500' : 'text-slate-300'
                      }`}
                    >
                      {step.detail}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Pro Tips */}
        {activeGuide.proTips.length > 0 && (
          <section
            aria-label="Essential Pro Tips"
            className="mt-6 rounded-2xl border border-white/[0.08] bg-[#11151E] p-5"
          >
            <h2 className="text-sm font-semibold text-white">Essential Tips</h2>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
              {activeGuide.proTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="font-mono text-xs text-[#00D4FF] tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 pb-24 sm:px-6">
      {/* Header + Primary CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-white sm:text-2xl">
            Game Guides
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400 tabular-nums">
            <span>{guides.length} walkthroughs &amp; roadmaps</span>
            <span aria-hidden="true">·</span>
            <span>{bookmarkedCount} bookmarked</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="tablist"
            aria-label="Guides workspace mode"
            className="inline-flex rounded-xl border border-white/[0.08] bg-[#11151E] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={sectionMode === 'library'}
              onClick={() => setSectionMode('library')}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                sectionMode === 'library'
                  ? 'bg-[#182232] text-[#00D4FF]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Walkthroughs</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sectionMode === 'agent'}
              onClick={() => setSectionMode('agent')}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                sectionMode === 'agent'
                  ? 'bg-[#182232] text-[#00D4FF]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              <span>AI Guide Agent</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setGenError(null);
              setShowGenerator(true);
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#00D4FF] px-4 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#38DFFF] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Generate Guide</span>
          </button>
        </div>
      </div>

      {sectionMode === 'agent' ? (
        <GuideAgentPanel
          agentState={agentState}
          onUpdateState={onUpdateAgentState}
          playingVoiceId={playingVoiceId}
          loadingVoiceId={loadingVoiceId}
          onSpeakText={onSpeakText}
        />
      ) : (
        <>

      {/* Search & Bookmarked Filter Row */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <label htmlFor="guides-search-input" className="sr-only">
            Search guides
          </label>
          <input
            id="guides-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by game, quest, collectible, or mechanic..."
            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-[#11151E] py-2 pr-10 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-[#00D4FF] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear guide search"
              className="absolute right-2 flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setBookmarkedOnly((prev) => !prev)}
          aria-pressed={bookmarkedOnly}
          className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            bookmarkedOnly
              ? 'border-[#00D4FF]/50 bg-[#00D4FF]/15 text-[#00D4FF]'
              : 'border-white/10 bg-[#11151E] text-slate-300 hover:border-white/20 hover:text-white'
          }`}
        >
          <Bookmark
            className={`h-4 w-4 ${bookmarkedOnly ? 'fill-current' : ''}`}
            aria-hidden="true"
          />
          <span>Bookmarked ({bookmarkedCount})</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div
        role="tablist"
        aria-label="Guide category filters"
        className="mt-3 flex items-center gap-2 overflow-x-auto pb-1"
      >
        {GUIDE_CATEGORY_OPTIONS.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedCategory(category)}
              className={`min-h-[40px] rounded-xl border px-3.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'border-[#00D4FF]/50 bg-[#182232] text-[#00D4FF]'
                  : 'border-white/[0.07] bg-[#11151E] text-slate-300 hover:border-white/20 hover:text-white'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Guide Grid */}
      {filteredGuides.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#11151E] p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-500" aria-hidden="true" />
          <h2 className="mt-3 font-display text-base font-semibold text-white">
            No matching guides found
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Clear your filters or generate a custom step-by-step guide for any game.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setBookmarkedOnly(false);
            }}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-white/10 bg-[#090B10] px-4 text-xs font-medium text-slate-200 hover:border-[#00D4FF]/40 hover:text-white cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredGuides.map((guide) => {
            const progress = calculateGuideProgress(guide);
            return (
              <article
                key={guide.id}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#11151E] p-5 transition-colors hover:border-[#00D4FF]/35"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 tabular-nums">
                      <span className="font-medium text-[#00D4FF]">{guide.gameTitle}</span>
                      <span aria-hidden="true">·</span>
                      <span>{guide.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{guide.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span>{guide.estimatedMinutes} min</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleBookmark(guide.id)}
                      aria-label={
                        guide.bookmarked
                          ? `Remove bookmark for ${guide.title}`
                          : `Bookmark ${guide.title}`
                      }
                      aria-pressed={Boolean(guide.bookmarked)}
                      className={`flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                        guide.bookmarked
                          ? 'text-[#00D4FF] hover:bg-white/10'
                          : 'text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Bookmark
                        className={`h-4 w-4 ${guide.bookmarked ? 'fill-current' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveGuideId(guide.id)}
                    className="mt-2 block w-full text-left cursor-pointer"
                  >
                    <h2 className="font-display text-base font-semibold text-white transition-colors hover:text-[#00D4FF] sm:text-lg">
                      {guide.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                      {guide.summary}
                    </p>
                  </button>
                </div>

                <div className="mt-4 border-t border-white/[0.06] pt-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                        <span>
                          {progress.completedCount} / {progress.totalCount} steps
                        </span>
                        <span>{progress.percent}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="h-full rounded-full bg-[#10B981] transition-all duration-200"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveGuideId(guide.id)}
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-white/10 bg-[#090B10] px-3 text-xs font-medium text-slate-200 transition-colors hover:border-[#00D4FF]/45 hover:text-[#00D4FF] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Open Guide</span>
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

        </>
      )}

      {/* Custom Guide Generator Modal */}
      {showGenerator && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Generate Custom Game Guide"
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#11151E] p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#00D4FF]" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold text-white">
                  Generate Custom Game Guide
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerator(false)}
                aria-label="Close guide generator"
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleGenerateGuide} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="guide-game-title"
                  className="block text-xs font-medium text-slate-300"
                >
                  Game Title
                </label>
                <input
                  id="guide-game-title"
                  type="text"
                  value={gameTitleInput}
                  onChange={(e) => setGameTitleInput(e.target.value)}
                  placeholder="e.g. Baldur's Gate 3, Elden Ring, Hades II"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00D4FF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="guide-topic"
                  className="block text-xs font-medium text-slate-300"
                >
                  Walkthrough Topic or Goal
                </label>
                <input
                  id="guide-topic"
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="e.g. Act 2 Moonrise Towers Rescue Route"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00D4FF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="guide-category-select"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Category
                  </label>
                  <select
                    id="guide-category-select"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value as GuideCategory)}
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3 text-sm text-white focus:border-[#00D4FF] focus:outline-none cursor-pointer"
                  >
                    {CREATE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="guide-difficulty-select"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Depth / Level
                  </label>
                  <select
                    id="guide-difficulty-select"
                    value={difficultyInput}
                    onChange={(e) => setDifficultyInput(e.target.value as GuideDifficulty)}
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3 text-sm text-white focus:border-[#00D4FF] focus:outline-none cursor-pointer"
                  >
                    {DIFFICULTY_OPTIONS.map((diff) => (
                      <option key={diff} value={diff}>
                        {diff}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {genError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/40 bg-[#1B1014] px-3.5 py-2.5 text-xs text-rose-200"
                >
                  {genError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="min-h-[44px] rounded-xl border border-white/10 bg-[#090B10] px-4 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#00D4FF] px-5 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#38DFFF] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Building Guide...</span>
                    </>
                  ) : (
                    <span>Create Guide</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
