import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchDashboardCounts } from '../services/admin-data';
import { mapCountsToMenuBadges } from '../utils/menu-badges';

type BadgeMap = Record<string, number>;

type PendingBadgeContextValue = {
  badges: BadgeMap;
  setBadge: (path: string, count: number) => void;
  pendingTotal: number;
  refreshFromCloud: () => Promise<void>;
};

const PendingBadgeContext = createContext<PendingBadgeContextValue | null>(null);

const REFRESH_MS = 60_000;

export function PendingBadgeProvider({ children }: { children: ReactNode }) {
  const [badges, setBadges] = useState<BadgeMap>({});

  const refreshFromCloud = useCallback(async () => {
    if (!sessionStorage.getItem('chongwu_admin_token')) return;
    try {
      const counts = await fetchDashboardCounts();
      setBadges(mapCountsToMenuBadges(counts));
    } catch {
      /* 保持当前角标（各列表页 useSyncMenuPendingBadge 仍会更新） */
    }
  }, []);

  useEffect(() => {
    void refreshFromCloud();
    const timer = window.setInterval(() => void refreshFromCloud(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refreshFromCloud]);

  const setBadge = useCallback((path: string, count: number) => {
    setBadges((prev) => ({ ...prev, [path]: Math.max(0, count) }));
  }, []);

  const pendingTotal = useMemo(
    () => Object.values(badges).reduce((sum, n) => sum + (n || 0), 0),
    [badges],
  );

  const value = useMemo(
    () => ({ badges, setBadge, pendingTotal, refreshFromCloud }),
    [badges, setBadge, pendingTotal, refreshFromCloud],
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

/** 列表待审数量变化时同步侧边栏角标（进入页面后以列表统计为准） */
export function useSyncMenuPendingBadge(menuPath: string, pendingCount: number) {
  const { setBadge } = usePendingBadges();
  useEffect(() => {
    setBadge(menuPath, pendingCount);
  }, [menuPath, pendingCount, setBadge]);
}
