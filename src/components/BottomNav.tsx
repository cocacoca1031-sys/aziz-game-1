import React from 'react';
import { MessageSquare, Newspaper, Swords, Trophy } from 'lucide-react';
import type { AppTab } from '../types/gaming';

interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  bossCount: number;
  gamesCount: number;
}

const NAV_ITEMS: {
  id: AppTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'chat',
    label: 'Chat Assistant',
    shortLabel: 'Chat',
    icon: MessageSquare,
  },
  {
    id: 'boss-hub',
    label: 'Boss & Build Hub',
    shortLabel: 'Boss Hub',
    icon: Swords,
  },
  {
    id: 'progress',
    label: 'Progress Tracker',
    shortLabel: 'Progress',
    icon: Trophy,
  },
  {
    id: 'news',
    label: 'Gaming News',
    shortLabel: 'News',
    icon: Newspaper,
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  bossCount,
  gamesCount,
}) => {
  return (
    <nav
      aria-label="Primary Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#0C0F16]/95 backdrop-blur-md pb-safe"
    >
      <div
        role="tablist"
        aria-label="Workspace Tabs"
        className="mx-auto grid h-16 max-w-2xl grid-cols-4 items-center px-2"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const countHint =
            item.id === 'boss-hub'
              ? ` (${bossCount})`
              : item.id === 'progress'
              ? ` (${gamesCount})`
              : '';

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${item.label}${countHint}`}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF] ${
                isActive
                  ? 'text-[#00D4FF]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-[2px] w-10 rounded-full bg-[#00D4FF]"
                />
              )}
              <Icon
                className={`h-5 w-5 transition-transform duration-150 ${
                  isActive ? 'scale-105' : ''
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px] font-medium tracking-tight whitespace-nowrap sm:hidden">
                {item.shortLabel}
              </span>
              <span className="hidden text-[11px] font-medium tracking-tight whitespace-nowrap sm:inline">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
