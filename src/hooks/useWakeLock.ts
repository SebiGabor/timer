import { useEffect, useRef, useState } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
}

export function useWakeLock(shouldKeepAwake: boolean) {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const [isActive, setIsActive] = useState(false);

  const isSupported =
    typeof navigator !== 'undefined' &&
    'wakeLock' in navigator &&
    typeof (navigator as unknown as { wakeLock?: { request?: unknown } }).wakeLock?.request === 'function';

  useEffect(() => {
    if (!shouldKeepAwake || !isSupported) {
      if (sentinelRef.current && !sentinelRef.current.released) {
        sentinelRef.current.release().catch(() => {});
      }
      sentinelRef.current = null;
      setIsActive(false);
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        const nav = navigator as unknown as {
          wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
        };
        const sentinel = await nav.wakeLock.request('screen');
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        setIsActive(true);
        sentinel.addEventListener?.('release', () => {
          if (!cancelled) setIsActive(false);
        });
      } catch {
        if (!cancelled) setIsActive(false);
      }
    };

    acquire();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sentinelRef.current && !sentinelRef.current.released) {
        sentinelRef.current.release().catch(() => {});
      }
      sentinelRef.current = null;
      setIsActive(false);
    };
  }, [shouldKeepAwake, isSupported]);

  return { isSupported, isActive };
}
