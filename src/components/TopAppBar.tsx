import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface TopAppBarProps {
  activeSectionTitle: string;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({ activeSectionTitle }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-[52px] border-b border-white/[0.08] bg-[#090B10]/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#11151E]">
            {!imgError ? (
              <img
                src="/assets/aistudio/Starscourge_Radahn_concept_art_5c4b4f45.png"
                alt="RADAHN Logo"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <ShieldCheck className="h-4 w-4 text-[#00D4FF]" aria-hidden="true" />
            )}
          </div>
          <span className="font-display text-base font-bold tracking-wider text-white whitespace-nowrap shrink-0">
            RADAHN
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
            {activeSectionTitle}
          </span>
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
