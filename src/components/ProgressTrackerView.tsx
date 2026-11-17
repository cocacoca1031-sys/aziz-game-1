import React, { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  ExternalLink,
  Gamepad2,
  Link2,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Trash2,
  Trophy,
  Unlink,
  X,
} from 'lucide-react';
import type { MilestoneItem, TrackedGame } from '../types/gaming';
import {
  PSN_PROFILES_BASE_URL,
  type PsnSyncedStats,
  buildPsnGameLink,
  buildPsnProfileUrls,
  normalizePsnId,
} from '../utils/psnProfiles';
import { resolveGameInput } from '../utils/psnTrophies';
import { calculateGameProgress, calculatePortfolioStats } from '../utils/progressStats';

interface ProgressTrackerViewProps {
  games: TrackedGame[];
  linkedPsnId: string;
  onSavePsnId: (psnId: string) => void;
  onClearPsnId: () => void;
  onToggleItem: (gameId: string, itemId: string) => void;
  onAdjustHours: (gameId: string, delta: number) => void;
  onReplaceGameItems: (
    gameId: string,
    items: MilestoneItem[],
    psnProfilesUrl?: string
  ) => void;
  onAddGame: (game: TrackedGame) => void;
  onRemoveGame: (gameId: string) => void;
}

type TrackerFilter = 'all' | 'active' | 'completed';
type ItemTypeFilter = 'all' | 'story' | 'achievement';

export const ProgressTrackerView: React.FC<ProgressTrackerViewProps> = ({
  games,
  linkedPsnId,
  onSavePsnId,
  onClearPsnId,
  onToggleItem,
  onAdjustHours,
  onReplaceGameItems,
  onAddGame,
  onRemoveGame,
}) => {
  const [filter, setFilter] = useState<TrackerFilter>('all');
  const [itemFilterByGame, setItemFilterByGame] = useState<Record<string, ItemTypeFilter>>({});
  const [loadingTrophiesGameId, setLoadingTrophiesGameId] = useState<string | null>(null);
  const [cardErrorByGame, setCardErrorByGame] = useState<Record<string, string>>({});
  const [confirmRemoveGameId, setConfirmRemoveGameId] = useState<string | null>(null);

  // Load Game from Link or Title Modal state
  const [showAddGame, setShowAddGame] = useState(false);
  const [gameQueryInput, setGameQueryInput] = useState('');
  const [platform, setPlatform] = useState('PS5');
  const [initialHours, setInitialHours] = useState('0');
  const [isLoadingGameAchievements, setIsLoadingGameAchievements] = useState(false);
  const [addGameError, setAddGameError] = useState<string | null>(null);

  // PSNProfiles Link state
  const [psnInput, setPsnInput] = useState('');
  const [psnError, setPsnError] = useState<string | null>(null);
  const [isSyncingPsn, setIsSyncingPsn] = useState(false);
  const [psnSyncNotice, setPsnSyncNotice] = useState<string | null>(null);
  const [psnStats, setPsnStats] = useState<PsnSyncedStats | null>(null);

  const psnUrls = useMemo(
    () => (linkedPsnId ? buildPsnProfileUrls(linkedPsnId) : null),
    [linkedPsnId]
  );

  const portfolio = useMemo(() => calculatePortfolioStats(games), [games]);

  const resolvedPreview = useMemo(() => resolveGameInput(gameQueryInput), [gameQueryInput]);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const progress = calculateGameProgress(game);
      if (filter === 'completed') {
        return progress.overallCompletionPct === 100 && progress.totalItems > 0;
      }
      if (filter === 'active') {
        return progress.overallCompletionPct < 100 || progress.totalItems === 0;
      }
      return true;
    });
  }, [games, filter]);

  const handleLoadGameFromLinkOrTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddGameError(null);
    const trimmed = gameQueryInput.trim();
    if (!trimmed) {
      setAddGameError('Enter a PSNProfiles game link or a video game title.');
      return;
    }

    setIsLoadingGameAchievements(true);
    try {
      const res = await fetch('/api/progress/game-achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          platform: platform.trim() || 'PS5',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddGameError(data.error || 'Could not load game achievements.');
        return;
      }

      const hours = Math.max(0, Number.parseFloat(initialHours) || 0);
      const loadedItems: MilestoneItem[] = Array.isArray(data.items) ? data.items : [];

      onAddGame({
        id: `game-${Date.now()}`,
        title: data.title || resolvedPreview.title || trimmed,
        platform: data.platform || platform.trim() || 'PS5',
        genre: data.genre || 'Action',
        hoursPlayed: hours,
        psnProfilesUrl: data.psnProfilesUrl,
        items: loadedItems,
        lastUpdated: new Date().toISOString(),
      });

      setGameQueryInput('');
      setInitialHours('0');
      setAddGameError(null);
      setShowAddGame(false);
    } catch {
      setAddGameError('Network error while loading game achievements.');
    } finally {
      setIsLoadingGameAchievements(false);
    }
  };

  const handleSyncFullGameTrophies = async (game: TrackedGame) => {
    if (loadingTrophiesGameId) return;
    setLoadingTrophiesGameId(game.id);
    setCardErrorByGame((prev) => {
      const next = { ...prev };
      delete next[game.id];
      return next;
    });

    try {
      const res = await fetch('/api/progress/game-achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: game.title,
          psnUrl: game.psnProfilesUrl,
          platform: game.platform,
        }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.items)) {
        setCardErrorByGame((prev) => ({
          ...prev,
          [game.id]: data.error || 'Unable to load full trophy list right now.',
        }));
        return;
      }
      onReplaceGameItems(game.id, data.items, data.psnProfilesUrl);
    } catch {
      setCardErrorByGame((prev) => ({
        ...prev,
        [game.id]: 'Network error while fetching game trophy list.',
      }));
    } finally {
      setLoadingTrophiesGameId(null);
    }
  };

  const handleLinkPsnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePsnId(psnInput);
    if (!normalized) {
      setPsnError('Enter a valid PSN Online ID (3-16 chars) or psnprofiles.com/ID URL.');
      return;
    }
    setPsnError(null);
    setPsnSyncNotice(null);
    setPsnStats(null);
    onSavePsnId(normalized);
    setPsnInput('');
  };

  const handleUnlinkPsn = () => {
    setPsnError(null);
    setPsnSyncNotice(null);
    setPsnStats(null);
    onClearPsnId();
  };

  const handleSyncPsn = async () => {
    if (!linkedPsnId || isSyncingPsn) return;
    setIsSyncingPsn(true);
    setPsnError(null);
    setPsnSyncNotice(null);
    try {
      const response = await fetch(
        `/api/psnprofiles/sync?psnId=${encodeURIComponent(linkedPsnId)}`
      );
      const data = await response.json();
      if (!response.ok) {
        setPsnError(data.error || 'Unable to verify PSNProfiles account.');
        return;
      }
      if (data.status === 'synced' && data.stats) {
        setPsnStats(data.stats);
        setPsnSyncNotice(`Live stats synced for ${linkedPsnId}.`);
      } else {
        setPsnStats(null);
        setPsnSyncNotice(
          data.message ||
            'PSNProfiles Cloudflare protection blocked automated sync. Open your profile directly via the links above.'
        );
      }
    } catch {
      setPsnError('Network error while checking PSNProfiles.');
    } finally {
      setIsSyncingPsn(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 pb-24 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-white sm:text-2xl">
            Progress &amp; Achievement Tracker
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Load a game from its PSNProfiles link or title, then validate unlocked trophies &amp; milestones
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAddGameError(null);
            setShowAddGame(true);
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#10B981] px-4 py-2 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#34D399] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Load Game Achievements
        </button>
      </div>

      {/* PSNProfiles Integration Bar */}
      <section
        aria-label="PSNProfiles Integration"
        className="mt-5 rounded-2xl border border-white/[0.08] bg-[#11151E] p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link2 className="h-4 w-4 shrink-0 text-[#00D4FF]" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-sm font-semibold text-white">
                  PSNProfiles Link
                </h2>
                {linkedPsnId && (
                  <span className="font-mono text-xs font-medium text-[#10B981]">
                    @{linkedPsnId}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {linkedPsnId
                  ? 'Connected to PSNProfiles for quick trophy logs, platinum advisor, and game trophy lists'
                  : 'Link your PlayStation Network ID or load any game directly via its PSNProfiles link'}
              </p>
            </div>
          </div>

          <a
            href={psnUrls ? psnUrls.profileUrl : PSN_PROFILES_BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#00D4FF]/35 bg-[#00D4FF]/10 px-3.5 text-xs font-semibold text-[#00D4FF] transition-colors hover:bg-[#00D4FF]/20 whitespace-nowrap shrink-0"
          >
            <span>{linkedPsnId ? 'Open PSN Profile' : 'psnprofiles.com'}</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>

        {!linkedPsnId ? (
          <form
            onSubmit={handleLinkPsnSubmit}
            className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <label htmlFor="psn-profile-input" className="sr-only">
              PSN Online ID or PSNProfiles URL
            </label>
            <input
              id="psn-profile-input"
              type="text"
              value={psnInput}
              onChange={(e) => {
                setPsnInput(e.target.value);
                if (psnError) setPsnError(null);
              }}
              placeholder="Enter PSN Online ID or https://psnprofiles.com/YourID..."
              className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-[#090B10] px-3.5 text-xs text-white placeholder:text-slate-500 focus:border-[#00D4FF] focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#00D4FF] px-4 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#38DFFF] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Link Profile
            </button>
          </form>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={psnUrls?.trophyLogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/10 bg-[#090B10] px-3 text-xs font-medium text-slate-200 transition-colors hover:border-[#00D4FF]/40 hover:text-[#00D4FF] whitespace-nowrap shrink-0"
              >
                <span>Trophy Log</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              <a
                href={psnUrls?.advisorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/10 bg-[#090B10] px-3 text-xs font-medium text-slate-200 transition-colors hover:border-[#00D4FF]/40 hover:text-[#00D4FF] whitespace-nowrap shrink-0"
              >
                <span>Trophy Advisor</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              <a
                href={psnUrls?.guidesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/10 bg-[#090B10] px-3 text-xs font-medium text-slate-200 transition-colors hover:border-[#00D4FF]/40 hover:text-[#00D4FF] whitespace-nowrap shrink-0"
              >
                <span>Trophy Guides</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncPsn}
                disabled={isSyncingPsn}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#10B981]/35 bg-[#10B981]/10 px-3 text-xs font-medium text-[#10B981] transition-colors hover:bg-[#10B981]/20 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSyncingPsn ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{isSyncingPsn ? 'Checking...' : 'Sync Check'}</span>
              </button>
              <button
                type="button"
                onClick={handleUnlinkPsn}
                aria-label="Unlink PSNProfiles account"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Unlink</span>
              </button>
            </div>
          </div>
        )}

        {psnStats && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3 sm:grid-cols-5">
            <div className="rounded-lg bg-[#090B10] px-3 py-2">
              <div className="text-[11px] text-slate-400">Platinum</div>
              <div className="font-mono text-sm font-bold tabular-nums text-[#00D4FF]">
                {psnStats.platinum ?? 0}
              </div>
            </div>
            <div className="rounded-lg bg-[#090B10] px-3 py-2">
              <div className="text-[11px] text-slate-400">Gold</div>
              <div className="font-mono text-sm font-bold tabular-nums text-amber-300">
                {psnStats.gold ?? 0}
              </div>
            </div>
            <div className="rounded-lg bg-[#090B10] px-3 py-2">
              <div className="text-[11px] text-slate-400">Silver</div>
              <div className="font-mono text-sm font-bold tabular-nums text-slate-200">
                {psnStats.silver ?? 0}
              </div>
            </div>
            <div className="rounded-lg bg-[#090B10] px-3 py-2">
              <div className="text-[11px] text-slate-400">Bronze</div>
              <div className="font-mono text-sm font-bold tabular-nums text-orange-300">
                {psnStats.bronze ?? 0}
              </div>
            </div>
            <div className="rounded-lg bg-[#090B10] px-3 py-2">
              <div className="text-[11px] text-slate-400">Completion</div>
              <div className="font-mono text-sm font-bold tabular-nums text-[#10B981]">
                {psnStats.completionPct ?? '—'}
              </div>
            </div>
          </div>
        )}

        {psnError && (
          <p role="alert" className="mt-2.5 text-xs text-rose-300">
            {psnError}
          </p>
        )}

        {psnSyncNotice && (
          <p data-testid="psn-sync-notice" className="mt-2.5 text-xs text-slate-300">
            {psnSyncNotice}
          </p>
        )}
      </section>

      {/* 4-Metric Portfolio Strip */}
      <section
        aria-label="Overall Gaming Progress Summary"
        className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-4">
          <div className="text-xs font-medium text-slate-400">Active Games</div>
          <div
            data-testid="stat-active-games"
            className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-white"
          >
            {portfolio.activeGamesCount}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            <span className="font-mono tabular-nums text-[#10B981]">
              {portfolio.completedGamesCount}
            </span>{' '}
            100% cleared
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-4">
          <div className="text-xs font-medium text-slate-400">Avg Story Progress</div>
          <div
            data-testid="stat-avg-completion"
            className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#00D4FF]"
          >
            {portfolio.averageCompletionPct}%
          </div>
          <div className="mt-1 text-xs text-slate-400">Across tracked titles</div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-4">
          <div className="text-xs font-medium text-slate-400">Hours Played</div>
          <div
            data-testid="stat-total-hours"
            className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-white"
          >
            {portfolio.totalHoursPlayed.toFixed(1)}h
          </div>
          <div className="mt-1 text-xs text-slate-400">Logged campaign time</div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-4">
          <div className="text-xs font-medium text-slate-400">Achievements</div>
          <div
            data-testid="stat-achievements"
            className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#10B981]"
          >
            {portfolio.totalUnlockedAchievements}/{portfolio.totalAchievements}
          </div>
          <div className="mt-1 text-xs text-slate-400">Validated milestones</div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="mt-5 flex items-center gap-2">
        <div
          role="tablist"
          aria-label="Filter tracked games"
          className="inline-flex rounded-xl border border-white/[0.08] bg-[#11151E] p-1"
        >
          {(
            [
              { id: 'all', label: 'All Games' },
              { id: 'active', label: 'In Progress' },
              { id: 'completed', label: 'Completed' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#1B2434] text-[#00D4FF]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Game Checklist Cards */}
      {filteredGames.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#11151E] p-8 text-center">
          <p className="text-sm font-medium text-slate-200">
            {games.length === 0 ? 'No games tracked yet.' : 'No games match this filter.'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {games.length === 0
              ? 'Load a game from its PSNProfiles link or title to start tracking achievements.'
              : 'Switch filters or load a game from its PSNProfiles link to validate achievements.'}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredGames.map((game) => {
            const summary = calculateGameProgress(game);
            const activeItemFilter = itemFilterByGame[game.id] ?? 'all';
            const visibleItems = game.items.filter((item) =>
              activeItemFilter === 'all' ? true : item.type === activeItemFilter
            );
            const ringRadius = 22;
            const ringCircumference = 2 * Math.PI * ringRadius;
            const ringOffset =
              ringCircumference -
              (summary.storyCompletionPct / 100) * ringCircumference;
            const isLoadingThisGame = loadingTrophiesGameId === game.id;
            const cardError = cardErrorByGame[game.id];

            return (
              <section
                key={game.id}
                aria-label={`${game.title} progress`}
                className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#11151E] p-5"
              >
                {/* Top Card Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      <span className="font-medium text-[#00D4FF]">{game.platform}</span>
                      <span aria-hidden="true">·</span>
                      <span>{game.genre}</span>
                      <span aria-hidden="true">·</span>
                      <a
                        href={buildPsnGameLink(game.title, game.psnProfilesUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-slate-300 underline decoration-white/20 underline-offset-2 transition-colors hover:text-[#00D4FF] hover:decoration-[#00D4FF]"
                      >
                        <span>PSNProfiles</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                    <h2 className="mt-1 font-display text-lg font-semibold text-white">
                      {game.title}
                    </h2>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {/* SVG Story Completion Ring */}
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
                        <circle
                          cx="28"
                          cy="28"
                          r={ringRadius}
                          fill="none"
                          stroke="#1E2534"
                          strokeWidth="4.5"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r={ringRadius}
                          fill="none"
                          stroke={summary.storyCompletionPct === 100 ? '#10B981' : '#00D4FF'}
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringOffset}
                        />
                      </svg>
                      <span className="absolute font-mono text-xs font-semibold tabular-nums text-white">
                        {summary.storyCompletionPct}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmRemoveGameId((prev) => (prev === game.id ? null : game.id))
                      }
                      aria-label={`Remove ${game.title}`}
                      title={`Remove ${game.title}`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-[#0C0F16] text-slate-400 transition-colors hover:border-rose-500/45 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {confirmRemoveGameId === game.id && (
                  <div
                    role="region"
                    aria-label={`Confirm removal of ${game.title}`}
                    className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/35 bg-rose-950/30 px-3.5 py-2.5"
                  >
                    <span className="text-xs font-medium text-rose-200">
                      Remove <strong className="text-white">{game.title}</strong> from progress?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveGameId(null)}
                        aria-label={`Cancel removing ${game.title}`}
                        className="min-h-[36px] rounded-lg border border-white/15 bg-[#0C0F16] px-3 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRemoveGame(game.id);
                          setConfirmRemoveGameId(null);
                        }}
                        aria-label={`Confirm remove ${game.title}`}
                        className="min-h-[36px] rounded-lg bg-rose-500 px-3 text-xs font-semibold text-white hover:bg-rose-400 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Hours Played & Achievement Stats Row */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-white/[0.06] py-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <span className="font-mono font-semibold tabular-nums text-white">
                      {game.hoursPlayed.toFixed(1)} hrs
                    </span>
                    <div className="ml-1 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onAdjustHours(game.id, -1)}
                        aria-label={`Subtract 1 hour from ${game.title}`}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 bg-[#0C0F16] text-slate-300 hover:border-white/25 hover:text-white cursor-pointer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustHours(game.id, 1)}
                        aria-label={`Add 1 hour to ${game.title}`}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 bg-[#0C0F16] text-slate-300 hover:border-[#00D4FF]/50 hover:text-[#00D4FF] cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Trophy className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
                    <span className="font-mono font-semibold tabular-nums text-white">
                      {summary.unlockedAchievements}/{summary.totalAchievements}
                    </span>
                    <span className="text-slate-400">Achievements</span>
                  </div>
                </div>

                {/* Story Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Overall Milestones</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {summary.completedItems}/{summary.totalItems} ({summary.overallCompletionPct}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#0C0F16]">
                    <div
                      className={`h-full transition-all duration-200 ${
                        summary.overallCompletionPct === 100
                          ? 'bg-[#10B981]'
                          : 'bg-[#00D4FF]'
                      }`}
                      style={{ width: `${summary.overallCompletionPct}%` }}
                    />
                  </div>
                </div>

                {/* Checklist Sub-Filter + Full Trophy Sync */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 rounded-lg bg-[#0C0F16] p-1 border border-white/[0.06]">
                    {(['all', 'story', 'achievement'] as const).map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() =>
                          setItemFilterByGame((prev) => ({ ...prev, [game.id]: sub }))
                        }
                        className={`min-h-[40px] rounded-md px-3 text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          activeItemFilter === sub
                            ? 'bg-[#182232] text-[#00D4FF]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {sub === 'achievement' ? 'Achievements' : sub === 'story' ? 'Story' : 'All'}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={isLoadingThisGame}
                    onClick={() => handleSyncFullGameTrophies(game)}
                    aria-label={`Load full achievement list for ${game.title}`}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-[#0C0F16] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-[#00D4FF]/40 hover:text-[#00D4FF] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isLoadingThisGame ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00D4FF]" aria-hidden="true" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Load Full Trophy List</span>
                      </>
                    )}
                  </button>
                </div>

                {cardError && (
                  <p role="alert" className="mt-2 text-xs text-rose-300">
                    {cardError}
                  </p>
                )}

                {/* Interactive Achievement Validation Checklist */}
                <div className="mt-3 max-h-[380px] overflow-y-auto divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-[#0C0F16]">
                  {visibleItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex min-h-[48px] cursor-pointer items-start gap-3 px-3.5 py-3 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => onToggleItem(game.id, item.id)}
                          aria-label={`${item.title} (${item.type})`}
                          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-600 bg-[#11151E] checked:border-[#10B981] checked:bg-[#10B981] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF]"
                        />
                        <Check
                          className="pointer-events-none absolute h-3.5 w-3.5 text-[#090B10] opacity-0 peer-checked:opacity-100"
                          aria-hidden="true"
                        />
                      </span>

                      <span className="flex-1 min-w-0">
                        <span
                          className={`block text-xs font-medium leading-snug ${
                            item.completed ? 'text-slate-400 line-through' : 'text-slate-100'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {item.type === 'achievement' ? 'Achievement' : 'Story Milestone'}
                          {item.description ? ` · ${item.description}` : ''}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Load Game Achievements from PSNProfiles Link or Game Title Modal */}
      {showAddGame && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Load Game Achievements"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#11151E] p-6 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
                <h2 className="font-display text-lg font-semibold text-white">
                  Load Game Achievements
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddGame(false)}
                aria-label="Close add game modal"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Paste a PSNProfiles game trophy link or enter the game title to load all its achievements automatically—then simply check off what you’ve unlocked.
            </p>

            <form onSubmit={handleLoadGameFromLinkOrTitle} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="add-game-query"
                  className="block text-xs font-medium text-slate-300"
                >
                  PSNProfiles Game Link or Game Title
                </label>
                <input
                  id="add-game-query"
                  type="text"
                  required
                  value={gameQueryInput}
                  onChange={(e) => {
                    setGameQueryInput(e.target.value);
                    if (addGameError) setAddGameError(null);
                  }}
                  placeholder="https://psnprofiles.com/trophies/15494-elden-ring or Ghost of Tsushima"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#10B981] focus:outline-none"
                />
                {resolvedPreview.psnUrl && resolvedPreview.title && (
                  <p className="mt-1.5 text-[11px] font-medium text-[#00D4FF]">
                    Detected game: {resolvedPreview.title}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="add-game-platform"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Platform
                  </label>
                  <input
                    id="add-game-platform"
                    type="text"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    placeholder="PS5 / PC / Switch"
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3.5 text-sm text-white focus:border-[#10B981] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="add-game-hours"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Hours Played
                  </label>
                  <input
                    id="add-game-hours"
                    type="number"
                    step="0.5"
                    min="0"
                    value={initialHours}
                    onChange={(e) => setInitialHours(e.target.value)}
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3.5 font-mono text-sm tabular-nums text-white focus:border-[#10B981] focus:outline-none"
                  />
                </div>
              </div>

              {addGameError && (
                <div
                  role="alert"
                  className="rounded-xl border border-amber-500/40 bg-[#1A140B] px-3.5 py-2.5 text-xs font-medium text-amber-200"
                >
                  {addGameError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isLoadingGameAchievements}
                  onClick={() => setShowAddGame(false)}
                  className="min-h-[44px] flex-1 rounded-xl border border-white/10 px-4 text-xs font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoadingGameAchievements}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#10B981] px-4 text-xs font-semibold text-[#090B10] hover:bg-[#34D399] disabled:opacity-60 cursor-pointer"
                >
                  {isLoadingGameAchievements ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Loading Trophies...</span>
                    </>
                  ) : (
                    <span>Load Achievements</span>
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
