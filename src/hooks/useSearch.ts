import { useState, useEffect, useCallback } from "react";
import { supabase, SearchResult } from "@/lib/supabase";

// 간단한 debounce 함수 구현
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
  };

  return debounced;
}

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 검색 실행 함수
  const executeSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: searchError } = await supabase.rpc(
        "search_entities",
        {
          query: searchQuery,
        }
      );

      if (searchError) {
        console.error("Search 에러:", searchError);
        setError("검색 중 오류가 발생했습니다.");
        setResults([]);
      } else {
        setResults(data || []);
      }
    } catch (err) {
      console.error("Search 에러:", err);
      setError("검색 중 오류가 발생했습니다.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 디바운스된 검색 함수 (250ms 지연)
  const debouncedSearch = useCallback(debounce(executeSearch, 250), [
    executeSearch,
  ]);

  // 쿼리 변경 시 검색 실행
  useEffect(() => {
    debouncedSearch(query);
    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search: executeSearch,
  };
}
