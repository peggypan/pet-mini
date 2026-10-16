import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

export function useCloudList<T>(loader: () => Promise<T[]>, deps: unknown[] = []) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loader();
      setRows(list);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, setRows, loading, reload };
}
