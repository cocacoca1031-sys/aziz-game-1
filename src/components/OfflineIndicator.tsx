import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-2.5 rounded-xl border border-amber-500/40 bg-[#1A140B]/95 px-4 py-2.5 text-xs font-medium text-amber-200 shadow-lg backdrop-blur-md"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
      <span>Offline Mode — Cached Boss Hub &amp; Progress data remains available.</span>
    </div>
  );
};
