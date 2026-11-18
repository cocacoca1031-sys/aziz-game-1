import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Loader2,
  Newspaper,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  Square,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import type {
  DailyNewsScheduleConfig,
  GamingNewsPulse,
  TelegramGatewayInfo,
} from '../types/gaming';
import {
  NEWS_PLATFORM_OPTIONS,
  type NewsPlatformFilter,
  buildNewsBriefingScript,
} from '../utils/gamingNews';
import {
  DEFAULT_SCHEDULE_TIME,
  PRESET_SCHEDULE_TIMES,
  buildTelegramTargetUrl,
  findDueScheduleSlot,
  formatLastRunSummary,
  getNextRunLabel,
  isValidTimeSlot,
  normalizeSendTimes,
  normalizeTelegramTarget,
} from '../utils/newsSchedule';

interface GamingNewsViewProps {
  cachedPulse: GamingNewsPulse | null;
  onSavePulse: (pulse: GamingNewsPulse) => void;
  playingVoiceId: string | null;
  loadingVoiceId: string | null;
  onSpeakText: (id: string, text: string) => void;
}

const RANK_BADGES = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'] as const;
const SCHEDULE_STORAGE_KEY = 'gsa_news_daily_schedule_telegram_v1';

function detectBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function loadLocalSchedule(): DailyNewsScheduleConfig | null {
  try {
    const raw = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyNewsScheduleConfig;
    return {
      ...parsed,
      sendTimes: normalizeSendTimes(parsed.sendTimes),
    };
  } catch {
    return null;
  }
}

function saveLocalSchedule(cfg: DailyNewsScheduleConfig) {
  try {
    window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // Ignore storage errors
  }
}

function formatFetchedTime(iso: string): string {
  try {
    const dt = new Date(iso);
    return dt.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Just now';
  }
}

export const GamingNewsView: React.FC<GamingNewsViewProps> = ({
  cachedPulse,
  onSavePulse,
  playingVoiceId,
  loadingVoiceId,
  onSpeakText,
}) => {
  const browserTimeZone = useMemo(() => detectBrowserTimeZone(), []);
  const initialLocalSchedule = useMemo(() => loadLocalSchedule(), []);

  const [platformFilter, setPlatformFilter] = useState<NewsPlatformFilter>(
    (cachedPulse?.platformFilter as NewsPlatformFilter) ||
      (initialLocalSchedule?.platformFilter as NewsPlatformFilter) ||
      'All Platforms'
  );
  const [pulse, setPulse] = useState<GamingNewsPulse | null>(cachedPulse);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [schedule, setSchedule] = useState<DailyNewsScheduleConfig>(() => ({
    enabled: initialLocalSchedule?.enabled ?? false,
    telegramTarget: initialLocalSchedule?.telegramTarget ?? '',
    platformFilter: initialLocalSchedule?.platformFilter ?? 'All Platforms',
    sendTimes: normalizeSendTimes(initialLocalSchedule?.sendTimes ?? [DEFAULT_SCHEDULE_TIME]),
    timeZone: initialLocalSchedule?.timeZone || browserTimeZone,
    lastDispatchedSlotKeys: initialLocalSchedule?.lastDispatchedSlotKeys ?? [],
    lastDispatchedAt: initialLocalSchedule?.lastDispatchedAt,
    lastDeliveryStatus: initialLocalSchedule?.lastDeliveryStatus ?? 'idle',
    lastDeliveryDetail: initialLocalSchedule?.lastDeliveryDetail,
    lastDispatch: initialLocalSchedule?.lastDispatch ?? null,
  }));

  const [telegramInput, setTelegramInput] = useState<string>(
    initialLocalSchedule?.telegramTarget ?? ''
  );
  const [sendTimes, setSendTimes] = useState<string[]>(() =>
    normalizeSendTimes(initialLocalSchedule?.sendTimes ?? [DEFAULT_SCHEDULE_TIME])
  );
  const [customTimeInput, setCustomTimeInput] = useState<string>('18:00');
  const [gatewayInfo, setGatewayInfo] = useState<TelegramGatewayInfo>({
    configured: false,
    provider: 'none',
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [runningDispatchNow, setRunningDispatchNow] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState<{
    kind: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  const fetchLivePulse = useCallback(
    async (targetPlatform: NewsPlatformFilter, forceRefresh = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/news/pulse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platformFilter: targetPlatform,
            forceRefresh,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Unable to fetch live gaming news right now.');
          return;
        }
        setPulse(data as GamingNewsPulse);
        onSavePulse(data as GamingNewsPulse);
      } catch {
        setError('Network error while connecting to Gaming News Pulse.');
      } finally {
        setIsLoading(false);
      }
    },
    [onSavePulse]
  );

  // Initial pulse fetch
  useEffect(() => {
    if (!cachedPulse) {
      void fetchLivePulse('All Platforms', false);
    }
  }, [cachedPulse, fetchLivePulse]);

  // Sync schedule state with backend on mount
  useEffect(() => {
    let active = true;
    const syncSchedule = async () => {
      try {
        const res = await fetch('/api/news/schedule');
        if (!res.ok) return;
        const data = (await res.json()) as {
          schedule: DailyNewsScheduleConfig;
          gateway: TelegramGatewayInfo;
        };
        if (!active) return;

        setGatewayInfo(data.gateway);
        const serverHasConfig = Boolean(data.schedule?.telegramTarget || data.schedule?.enabled);
        const localSaved = loadLocalSchedule();

        if (serverHasConfig) {
          const normalized = {
            ...data.schedule,
            sendTimes: normalizeSendTimes(data.schedule.sendTimes),
          };
          setSchedule(normalized);
          setTelegramInput(normalized.telegramTarget || '');
          setSendTimes(normalized.sendTimes);
          saveLocalSchedule(normalized);

          if (normalized.lastDispatch?.items?.length === 5 && !cachedPulse) {
            setPulse((prev) =>
              prev ?? {
                platformFilter: normalized.lastDispatch!.platformFilter,
                fetchedAt: normalized.lastDispatch!.dispatchedAt,
                items: normalized.lastDispatch!.items,
                digestMessage: normalized.lastDispatch!.digestMessage,
                sources: [],
              }
            );
          }
        } else if (localSaved && (localSaved.enabled || localSaved.telegramTarget)) {
          const putRes = await fetch('/api/news/schedule', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enabled: localSaved.enabled,
              telegramTarget: localSaved.telegramTarget,
              platformFilter: localSaved.platformFilter || 'All Platforms',
              sendTimes: normalizeSendTimes(localSaved.sendTimes),
              timeZone: localSaved.timeZone || browserTimeZone,
            }),
          });
          if (putRes.ok && active) {
            const putData = (await putRes.json()) as {
              schedule: DailyNewsScheduleConfig;
              gateway: TelegramGatewayInfo;
            };
            setSchedule(putData.schedule);
            setSendTimes(normalizeSendTimes(putData.schedule.sendTimes));
            setGatewayInfo(putData.gateway);
          }
        }
      } catch {
        // Ignore transient sync errors
      }
    };
    void syncSchedule();
    return () => {
      active = false;
    };
  }, [browserTimeZone, cachedPulse]);

  const persistScheduleUpdate = useCallback(
    async (
      nextEnabled: boolean,
      nextTelegramRaw: string,
      nextTimes: string[],
      statusFeedback?: string
    ) => {
      const targetCheck = normalizeTelegramTarget(nextTelegramRaw);
      if (nextEnabled && !targetCheck.valid) {
        setScheduleNotice({
          kind: 'error',
          text:
            targetCheck.error ||
            'Enter a valid Telegram @username, phone number, or numeric Chat ID.',
        });
        return;
      }

      const normalizedTimes = normalizeSendTimes(nextTimes);
      setScheduleSaving(true);
      setScheduleNotice(null);
      try {
        const res = await fetch('/api/news/schedule', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: nextEnabled,
            telegramTarget: targetCheck.valid ? targetCheck.normalized : nextTelegramRaw.trim(),
            platformFilter,
            sendTimes: normalizedTimes,
            timeZone: browserTimeZone,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setScheduleNotice({
            kind: 'error',
            text: data.error || 'Could not update Telegram schedule settings.',
          });
          return;
        }

        const saved = {
          ...(data.schedule as DailyNewsScheduleConfig),
          sendTimes: normalizeSendTimes(data.schedule?.sendTimes),
        };
        setSchedule(saved);
        setTelegramInput(saved.telegramTarget || '');
        setSendTimes(saved.sendTimes);
        setGatewayInfo(data.gateway as TelegramGatewayInfo);
        saveLocalSchedule(saved);

        if (nextEnabled) {
          if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            void Notification.requestPermission().catch(() => undefined);
          }
          setScheduleNotice({
            kind: 'success',
            text:
              statusFeedback ||
              `Telegram Auto-Agent armed for ${saved.telegramTarget} daily at ${saved.sendTimes.join(', ')} (${saved.timeZone}).`,
          });
        } else if (statusFeedback) {
          setScheduleNotice({ kind: 'info', text: statusFeedback });
        }
      } catch {
        setScheduleNotice({
          kind: 'error',
          text: 'Network error while saving Telegram schedule settings.',
        });
      } finally {
        setScheduleSaving(false);
      }
    },
    [browserTimeZone, platformFilter]
  );

  const handleRunDispatchNow = useCallback(
    async (
      overrideTelegram?: string,
      scheduledSlot = 'manual',
      slotKey?: string,
      isAutoScheduled = false
    ) => {
      const targetTelegram = (overrideTelegram ?? telegramInput).trim();
      const targetCheck = normalizeTelegramTarget(targetTelegram);
      if (!targetCheck.valid) {
        setScheduleNotice({
          kind: 'error',
          text:
            targetCheck.error ||
            'Enter a valid Telegram @username, phone number, or numeric Chat ID first.',
        });
        return;
      }

      setRunningDispatchNow(true);
      setScheduleNotice(null);
      try {
        const res = await fetch('/api/news/schedule/run-now', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramTarget: targetCheck.normalized,
            platformFilter,
            sendTimes,
            timeZone: browserTimeZone,
            scheduledSlot,
            slotKey,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setScheduleNotice({
            kind: 'error',
            text: data.error || 'Unable to execute immediate Telegram dispatch right now.',
          });
          return;
        }

        const updatedSchedule = {
          ...(data.schedule as DailyNewsScheduleConfig),
          sendTimes: normalizeSendTimes(data.schedule?.sendTimes),
        };
        const freshPulse = data.pulse as GamingNewsPulse;
        setSchedule(updatedSchedule);
        setTelegramInput(updatedSchedule.telegramTarget || '');
        setSendTimes(updatedSchedule.sendTimes);
        setGatewayInfo(data.gateway as TelegramGatewayInfo);
        saveLocalSchedule(updatedSchedule);
        setPulse(freshPulse);
        onSavePulse(freshPulse);

        const noticeKind: 'success' | 'info' | 'error' =
          updatedSchedule.lastDeliveryStatus === 'sent_via_api'
            ? 'success'
            : updatedSchedule.lastDeliveryStatus === 'failed'
              ? 'error'
              : 'info';

        setScheduleNotice({
          kind: noticeKind,
          text:
            updatedSchedule.lastDeliveryDetail ||
            'Top 5 hot headlines prepared for Telegram.',
        });

        if (
          isAutoScheduled &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          try {
            new Notification(`RADAHN · ${scheduledSlot} Telegram Pulse Ready`, {
              body:
                updatedSchedule.lastDeliveryDetail ||
                'Top 5 hot news ready for Telegram.',
            });
          } catch {
            // Ignore notification errors in restricted contexts
          }
        }
      } catch {
        setScheduleNotice({
          kind: 'error',
          text: 'Network error while dispatching Top 5 Hot News to Telegram.',
        });
      } finally {
        setRunningDispatchNow(false);
      }
    },
    [browserTimeZone, onSavePulse, platformFilter, sendTimes, telegramInput]
  );

  // Background browser clock check every 30s so any scheduled slot fires automatically while open
  useEffect(() => {
    if (!schedule.enabled || runningDispatchNow) return;
    const timer = window.setInterval(() => {
      const due = findDueScheduleSlot(schedule, new Date());
      if (due) {
        void handleRunDispatchNow(
          schedule.telegramTarget,
          due.slot,
          due.slotKey,
          true
        );
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [handleRunDispatchNow, runningDispatchNow, schedule]);

  const handleToggleDailyAgent = () => {
    const nextEnabled = !schedule.enabled;
    void persistScheduleUpdate(
      nextEnabled,
      telegramInput,
      sendTimes,
      nextEnabled ? undefined : 'Scheduled Telegram auto-dispatch paused.'
    );
  };

  const handleAddTimeSlot = (candidateTime: string) => {
    if (!isValidTimeSlot(candidateTime)) return;
    const nextTimes = normalizeSendTimes([...sendTimes, candidateTime]);
    setSendTimes(nextTimes);
    if (schedule.enabled) {
      void persistScheduleUpdate(
        true,
        telegramInput,
        nextTimes,
        `Added ${candidateTime} · Daily Telegram schedule: ${nextTimes.join(', ')}.`
      );
    }
  };

  const handleRemoveTimeSlot = (slotToRemove: string) => {
    if (sendTimes.length <= 1) return;
    const nextTimes = normalizeSendTimes(sendTimes.filter((t) => t !== slotToRemove));
    setSendTimes(nextTimes);
    if (schedule.enabled) {
      void persistScheduleUpdate(
        true,
        telegramInput,
        nextTimes,
        `Updated daily Telegram schedule: ${nextTimes.join(', ')}.`
      );
    }
  };

  const handlePlatformChange = (nextPlatform: NewsPlatformFilter) => {
    setPlatformFilter(nextPlatform);
    void fetchLivePulse(nextPlatform, false);
  };

  const handleCopyDigest = async () => {
    if (!pulse?.digestMessage) return;
    try {
      await navigator.clipboard.writeText(pulse.digestMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const telegramShareHref = useMemo(() => {
    if (!pulse?.digestMessage) return 'https://t.me/';
    return buildTelegramTargetUrl(telegramInput, pulse.digestMessage);
  }, [pulse?.digestMessage, telegramInput]);

  const voiceId = `news-pulse-${platformFilter}`;
  const isPlayingBriefing = playingVoiceId === voiceId;
  const isLoadingBriefing = loadingVoiceId === voiceId;
  const nextRunText = useMemo(
    () => getNextRunLabel({ ...schedule, sendTimes }),
    [schedule, sendTimes]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 pb-24 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-400" aria-hidden="true" />
            <h1 className="font-display text-xl font-semibold text-white sm:text-2xl">
              The Gaming Pulse
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time intelligence agent · Top 5 hot news sent immediately or daily on Telegram
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pulse && pulse.items.length > 0 && (
            <button
              type="button"
              onClick={() => onSpeakText(voiceId, buildNewsBriefingScript(pulse.items))}
              aria-label={isPlayingBriefing ? 'Stop news voice briefing' : 'Listen to news briefing'}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isPlayingBriefing
                  ? 'border-[#00D4FF]/50 bg-[#00D4FF]/15 text-[#00D4FF]'
                  : 'border-white/10 bg-[#11151E] text-slate-200 hover:border-[#00D4FF]/40 hover:text-white'
              }`}
            >
              {isLoadingBriefing ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#00D4FF]" aria-hidden="true" />
              ) : isPlayingBriefing ? (
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4 text-[#00D4FF]" aria-hidden="true" />
              )}
              <span>{isPlayingBriefing ? 'Stop Briefing' : 'Listen Briefing'}</span>
            </button>
          )}

          <button
            type="button"
            disabled={isLoading}
            onClick={() => fetchLivePulse(platformFilter, true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#00D4FF] px-4 py-2 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#38DFFF] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isLoading ? 'Scanning Live News...' : 'Refresh Live News'}</span>
          </button>
        </div>
      </div>

      {/* Platform Filter Tabs */}
      <div
        role="tablist"
        aria-label="Filter gaming news by platform"
        className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1"
      >
        {NEWS_PLATFORM_OPTIONS.map((platform) => {
          const active = platformFilter === platform;
          return (
            <button
              key={platform}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={isLoading}
              onClick={() => handlePlatformChange(platform)}
              className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'border border-[#00D4FF]/40 bg-[#182232] text-[#00D4FF]'
                  : 'border border-white/[0.06] bg-[#11151E] text-slate-300 hover:text-white'
              }`}
            >
              {platform}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-[#1A140B] px-4 py-3 text-xs text-amber-200"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchLivePulse(platformFilter, true)}
            className="min-h-[36px] rounded-lg border border-amber-400/40 px-3 font-semibold text-amber-100 hover:bg-amber-500/15 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* Top 5 Headlines Column */}
        <div className="space-y-4">
          {isLoading && !pulse ? (
            <div className="space-y-3" aria-label="Loading live gaming news">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="animate-pulse rounded-2xl border border-white/[0.08] bg-[#11151E] p-5"
                >
                  <div className="h-4 w-2/3 rounded bg-white/10" />
                  <div className="mt-3 h-3 w-full rounded bg-white/5" />
                  <div className="mt-2 h-3 w-4/5 rounded bg-white/5" />
                </div>
              ))}
            </div>
          ) : pulse && pulse.items.length > 0 ? (
            <>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Newspaper className="h-3.5 w-3.5 text-[#00D4FF]" aria-hidden="true" />
                  Top 5 Stories · {pulse.platformFilter}
                </span>
                <span>Updated {formatFetchedTime(pulse.fetchedAt)}</span>
              </div>

              <div className="space-y-3">
                {pulse.items.map((item, idx) => (
                  <article
                    key={`${item.rank}-${item.headline}`}
                    className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-5 transition-colors hover:border-[#00D4FF]/30"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 text-lg leading-none select-none"
                        aria-hidden="true"
                      >
                        {RANK_BADGES[idx] ?? `${item.rank}.`}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-display text-base font-semibold leading-snug text-white">
                          {item.headline}
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
                          {item.summary}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Verified Real-Time Sources */}
              {pulse.sources.length > 0 && (
                <section
                  aria-label="Verified News Sources"
                  className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-4"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <Globe className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
                    <span>Verified Real-Time Sources</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {pulse.sources.map((src) => (
                      <a
                        key={src.url}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[36px] max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-[#090B10] px-3 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-[#00D4FF]/45 hover:text-[#00D4FF]"
                      >
                        <span className="max-w-[220px] truncate">{src.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-8 text-center">
              <p className="text-sm font-medium text-slate-200">
                No gaming news digest loaded yet.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Click Refresh Live News to fetch the 5 hottest stories of the week.
              </p>
            </div>
          )}
        </div>

        {/* Telegram Auto-Agent & Digest Sidebar */}
        <aside className="space-y-4">
          <section
            aria-label="Telegram Auto-Dispatch Agent"
            className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <BellRing
                  className={`h-4 w-4 ${schedule.enabled ? 'text-[#2AABEE]' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <h2 className="font-display text-sm font-semibold text-white">
                  Telegram Agent
                </h2>
              </div>
              <span
                data-testid="daily-schedule-status"
                className={`font-mono text-[11px] font-medium ${
                  schedule.enabled ? 'text-[#10B981]' : 'text-slate-400'
                }`}
              >
                {schedule.enabled ? `ACTIVE · ${sendTimes.join(', ')}` : 'PAUSED'}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <label
                  htmlFor="telegram-recipient-target"
                  className="block text-[11px] font-medium text-slate-300"
                >
                  Telegram Recipient (@username, Phone, or Chat ID)
                </label>
                <input
                  id="telegram-recipient-target"
                  type="text"
                  value={telegramInput}
                  onChange={(e) => setTelegramInput(e.target.value)}
                  placeholder="e.g. @alexgamer, +15551234567, or 123456789"
                  className="mt-1 min-h-[40px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3 text-xs text-white placeholder:text-slate-500 focus:border-[#2AABEE] focus:outline-none"
                />
              </div>

              {/* Multi-Time / Custom Daily Time Schedule Controls */}
              <div>
                <span className="block text-[11px] font-medium text-slate-300">
                  Daily Send Times ({browserTimeZone})
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {sendTimes.map((slot) => (
                    <span
                      key={slot}
                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[#2AABEE]/40 bg-[#0B1C28] px-2.5 text-xs font-mono font-semibold text-[#7AD3FF]"
                    >
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      <span>{slot}</span>
                      {sendTimes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTimeSlot(slot)}
                          aria-label={`Remove ${slot} schedule`}
                          className="ml-0.5 rounded p-0.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {PRESET_SCHEDULE_TIMES.filter((t) => !sendTimes.includes(t)).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddTimeSlot(preset)}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-white/10 bg-[#090B10] px-2.5 text-[11px] font-mono text-slate-300 hover:border-[#2AABEE]/45 hover:text-white cursor-pointer"
                    >
                      <Plus className="h-3 w-3 text-[#2AABEE]" aria-hidden="true" />
                      <span>{preset}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <label htmlFor="custom-schedule-time" className="sr-only">
                    Add custom daily time
                  </label>
                  <input
                    id="custom-schedule-time"
                    type="time"
                    value={customTimeInput}
                    onChange={(e) => setCustomTimeInput(e.target.value)}
                    className="min-h-[38px] flex-1 rounded-xl border border-white/10 bg-[#090B10] px-3 text-xs font-mono text-white focus:border-[#2AABEE] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTimeSlot(customTimeInput)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-white/10 bg-[#0C0F16] px-3 text-xs font-semibold text-slate-200 hover:border-[#2AABEE]/50 hover:text-white cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#2AABEE]" aria-hidden="true" />
                    <span>Add Time</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#090B10] px-3 py-2.5 text-[11px] text-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-[#2AABEE]" aria-hidden="true" />
                    Next scheduled run
                  </span>
                  <span className="font-medium text-white">{nextRunText}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                  {gatewayInfo.configured
                    ? 'Telegram Bot gateway connected. Sends immediately or at every scheduled time.'
                    : 'Runs at your daily times (09:00 or custom) and sends Top 5 Hot News immediately to Telegram.'}
                </p>
              </div>

              {scheduleNotice && (
                <div
                  role={scheduleNotice.kind === 'error' ? 'alert' : 'status'}
                  className={`rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
                    scheduleNotice.kind === 'error'
                      ? 'border-amber-500/40 bg-[#1A140B] text-amber-200'
                      : scheduleNotice.kind === 'success'
                        ? 'border-[#10B981]/40 bg-[#0A1F18] text-emerald-200'
                        : 'border-[#2AABEE]/40 bg-[#0B1C28] text-sky-200'
                  }`}
                >
                  {scheduleNotice.text}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={runningDispatchNow}
                  onClick={() =>
                    void handleRunDispatchNow(telegramInput, 'manual', undefined, false)
                  }
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#2AABEE] px-4 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#49BAFF] disabled:opacity-60 cursor-pointer"
                >
                  {runningDispatchNow ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Zap className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>
                    {runningDispatchNow
                      ? 'Sending Top 5 Hot News...'
                      : 'Send Top 5 News Immediately'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={scheduleSaving}
                  onClick={handleToggleDailyAgent}
                  className={`inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer ${
                    schedule.enabled
                      ? 'border-amber-400/40 bg-[#1A140B] text-amber-200 hover:bg-amber-500/15'
                      : 'border-white/15 bg-[#0C0F16] text-white hover:border-[#2AABEE]/50'
                  }`}
                >
                  {scheduleSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : schedule.enabled ? (
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4 text-[#2AABEE]" aria-hidden="true" />
                  )}
                  <span>
                    {schedule.enabled
                      ? 'Pause Daily Schedule'
                      : 'Enable Daily Auto-Schedule'}
                  </span>
                </button>
              </div>

              {schedule.lastDispatchedAt && (
                <p className="text-[11px] text-slate-400">
                  Last run: {formatFetchedTime(schedule.lastDispatchedAt)} ·{' '}
                  {formatLastRunSummary(
                    schedule.lastDeliveryStatus,
                    schedule.lastDeliveryDetail
                  )}
                </p>
              )}
            </div>
          </section>

          {/* Telegram Digest Preview Card */}
          <section
            aria-label="Telegram Digest Ready"
            className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-[#2AABEE]" aria-hidden="true" />
                <h2 className="font-display text-sm font-semibold text-white">
                  Telegram Digest
                </h2>
              </div>
              <span className="font-mono text-[11px] font-medium text-[#10B981]">
                5 Headlines
              </span>
            </div>

            <div
              data-testid="telegram-digest-preview"
              className="mt-3 max-h-[280px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-[#090B10] p-3.5 text-xs leading-relaxed text-slate-200"
            >
              {pulse?.digestMessage ||
                '🎮 *THE GAMING PULSE* 🔥\nFetching this week’s top 5 headlines...'}
            </div>

            <div className="mt-3 space-y-2">
              <button
                type="button"
                disabled={!pulse?.digestMessage}
                onClick={handleCopyDigest}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#0C0F16] px-4 text-xs font-semibold text-white transition-colors hover:border-[#2AABEE]/50 hover:text-[#7AD3FF] disabled:opacity-50 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
                    <span>Copied Telegram Digest</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    <span>Copy Telegram Digest</span>
                  </>
                )}
              </button>

              <a
                href={telegramShareHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!pulse?.digestMessage}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#2AABEE] px-4 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#49BAFF]"
              >
                <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Send via Telegram</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
