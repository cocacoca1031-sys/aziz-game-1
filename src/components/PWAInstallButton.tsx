import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#00D4FF] px-3.5 py-1.5 text-xs font-semibold text-[#090B10] transition-colors hover:bg-[#38DFFF] whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/15 bg-[#11151E] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-[#00D4FF]/50 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-[#00D4FF]" aria-hidden="true" />
          Install App
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Install RADAHN on iOS"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11151E] p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">
                  Add to Home Screen
                </h2>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                1. Tap the <strong className="text-white">Share</strong> button in your browser toolbar.
                <br />
                2. Scroll down and select <strong className="text-white">Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 min-h-[44px] w-full rounded-xl bg-[#00D4FF] py-2.5 text-sm font-semibold text-[#090B10] transition-colors hover:bg-[#38DFFF] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
