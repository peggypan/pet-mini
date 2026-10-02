import { useMemo, useState } from 'react';

/** 客户端关键字过滤（接云前列表页通用） */
export function useLocalSearch<T>(rows: T[], pickText: (row: T) => string) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => pickText(r).toLowerCase().includes(q));
  }, [rows, search, pickText]);

  return { search, setSearch, filtered };
}
