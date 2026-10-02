import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { menuPendingBadges } from '../config/routes';

type BadgeMap = Record<string, number>;

type PendingBadgeContextValue = {
  badges: BadgeMap;
  setBadge: (path: string, count: number) => void;
  pendingTotal: number;
};

const PendingBadgeContext = createContext<PendingBadgeContextValue | null>(null);

export function PendingBadgeProvider({ children }: { children: ReactNode }) {
  const [badges, setBadges] = useState<BadgeMap>(() => ({ ...menuPendingBadges }));

  const setBadge = useCallback((path: string, count: number) => {
    setBadges((prev) => ({ ...prev, [path]: Math.max(0, count) }));
  }, []);

  const pendingTotal = useMemo(
    () => Object.values(badges).reduce((sum, n) => sum + (n || 0), 0),
    [badges],
  );

  const value = useMemo(
    () => ({ badges, setBadge, pendingTotal }),
    [badges, setBadge, pendingTotal],
  );

  return <PendingBadgeContext.Provider value={value}>{children}</PendingBadgeContext.Provider>;
}

export function usePendingBadges() {
  const ctx = useContext(PendingBadgeContext);
  if (!ctx) {
    throw new Error('usePendingBadges must be used within PendingBadgeProvider');
  }
  return ctx;
}

/** 列表待审数量变化时同步侧边栏角标（Mock；接云后由接口刷新） */
export function useSyncMenuPendingBadge(menuPath: string, pendingCount: number) {
  const { setBadge } = usePendingBadges();
  useEffect(() => {
    setBadge(menuPath, pendingCount);
  }, [menuPath, pendingCount, setBadge]);
}
