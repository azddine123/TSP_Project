/**
 * USE DATA FETCH — Hook générique de chargement de données
 * ==========================================================
 * Encapsule le pattern loading/error/data commun à toutes les pages.
 *
 * Usage :
 *   const { data: stocks, loading, error, refresh } = useDataFetch(stockApi.getAll);
 */
import { useState, useEffect, useCallback } from 'react';

interface UseDataFetchResult<T> {
  data:     T | null;
  loading:  boolean;
  error:    string | null;
  refresh:  () => void;
}

export function useDataFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseDataFetchResult<T> {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetch = useCallback(fetcher, deps);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetch();
      setData(result);
    } catch {
      setError('Impossible de charger les données. Vérifiez que le backend est démarré.');
    } finally {
      setLoading(false);
    }
  }, [fetch]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}
