import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Loader2,
  MessageCircle,
  Newspaper,
  RefreshCw,
  Square,
  Volume2,
} from 'lucide-react';
import type { GamingNewsPulse } from '../types/gaming';
import {
  NEWS_PLATFORM_OPTIONS,
  type NewsPlatformFilter,
  buildNewsBriefingScript,
  buildWhatsAppShareUrl,
} from '../utils/gamingNews';

interface GamingNewsViewProps {
  cachedPulse: GamingNewsPulse | null;
  onSavePulse: (pulse: GamingNewsPulse) => void;
  playingVoiceId: string | null;
  loadingVoiceId: string | null;
  onSpeakText: (id: string, text: string) => void;
}

const RANK_BADGES = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'] as const;

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
  const [platformFilter, setPlatformFilter] = useState<NewsPlatformFilter>(
    (cachedPulse?.platformFilter as NewsPlatformFilter) || 'All Platforms'
  );
  const [pulse, setPulse] = useState<GamingNewsPulse | null>(cachedPulse);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');

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

  useEffect(() => {
    if (!cachedPulse) {
      void fetchLivePulse('All Platforms', false);
    }
  }, [cachedPulse, fetchLivePulse]);

  const handlePlatformChange = (nextPlatform: NewsPlatformFilter) => {
    setPlatformFilter(nextPlatform);
    void fetchLivePulse(nextPlatform, false);
  };

  const handleCopyDigest = async () => {
    if (!pulse?.whatsappMessage) return;
    try {
      await navigator.clipboard.writeText(pulse.whatsappMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const whatsappShareHref = useMemo(() => {
    if (!pulse?.whatsappMessage) return 'https://api.whatsapp.com/';
    const digitsOnly = whatsappPhone.replace(/[^\d]/g, '');
    if (digitsOnly.length >= 7) {
      return `https://api.whatsapp.com/send?phone=${digitsOnly}&text=${encodeURIComponent(
        pulse.whatsappMessage
      )}`;
    }
    return buildWhatsAppShareUrl(pulse.whatsappMessage);
  }, [pulse?.whatsappMessage, whatsappPhone]);

  const voiceId = `news-pulse-${platformFilter}`;
  const isPlayingBriefing = playingVoiceId === voiceId;
  const isLoadingBriefing = loadingVoiceId === voiceId;

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
            Real-time weekly intelligence · Top 5 verified stories formatted for WhatsApp dispatch
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
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_370px]">
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

              {/* Real-Time Google Search Grounding Sources */}
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
                        <span className="truncate max-w-[220px]">{src.title}</span>
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

        {/* WhatsApp Dispatch Preview Panel */}
        <aside className="space-y-4">
          <section
            aria-label="WhatsApp Dispatch Preview"
            className="rounded-2xl border border-white/[0.08] bg-[#11151E] p-5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
                <h2 className="font-display text-sm font-semibold text-white">
                  WhatsApp Dispatch Ready
                </h2>
              </div>
              <span className="font-mono text-[11px] font-medium text-[#10B981]">
                5 Headlines
              </span>
            </div>

            <div className="mt-3">
              <label
                htmlFor="whatsapp-recipient-phone"
                className="block text-[11px] font-medium text-slate-400"
              >
                Optional Recipient Phone (with country code)
              </label>
              <input
                id="whatsapp-recipient-phone"
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="e.g. 15551234567 (leave blank to pick chat)"
                className="mt-1 min-h-[40px] w-full rounded-xl border border-white/10 bg-[#090B10] px-3 text-xs text-white placeholder:text-slate-500 focus:border-[#10B981] focus:outline-none"
              />
            </div>

            <div
              data-testid="whatsapp-digest-preview"
              className="mt-3 max-h-[360px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-[#090B10] p-3.5 text-xs leading-relaxed text-slate-200"
            >
              {pulse?.whatsappMessage ||
                '🎮 *THE GAMING PULSE* 🔥\nFetching this week’s top 5 headlines...'}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                disabled={!pulse?.whatsappMessage}
                onClick={handleCopyDigest}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#0C0F16] px-4 text-xs font-semibold text-white transition-colors hover:border-[#00D4FF]/50 hover:text-[#00D4FF] disabled:opacity-50 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
                    <span>Copied for WhatsApp</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    <span>Copy WhatsApp Digest</span>
                  </>
                )}
              </button>

              <a
                href={whatsappShareHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!pulse?.whatsappMessage}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#10B981] px-4 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#34D399]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Send via WhatsApp</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
