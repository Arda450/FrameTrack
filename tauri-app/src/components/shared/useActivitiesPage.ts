import { getActivitiesPage } from "../../api/stats";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import type { ActivitiesPage, TableExportFilter } from "../../types";
import { dateInputToFromTs, dateInputToToTs } from "../../utils/dateRange";
import { DEFAULT_PAGE_SIZE, toActivityRows } from "./activitiesTableTypes";

type UseActivitiesPageOptions = {
  projectId: number | null;
  refreshKey: number;
  onExportFilterChange?: (filter: TableExportFilter) => void;
};

/** Lädt paginierte Aktivitäten mit Filter, Sortierung und Export Sync. */
export function useActivitiesPage({
  projectId,
  refreshKey,
  onExportFilterChange,
}: UseActivitiesPageOptions) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [pageData, setPageData] = useState<ActivitiesPage>({
    items: [],
    total_count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryKeyRef = useRef<string | null>(null);
  const hasDataRef = useRef(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [contextQuery, setContextQuery] = useState("");
  const [debouncedContext, setDebouncedContext] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedContext(contextQuery), 300);
    return () => clearTimeout(timer);
  }, [contextQuery]);

  useEffect(() => {
    onExportFilterChange?.({
      projectId,
      fromTs: dateFrom ? dateInputToFromTs(dateFrom) : null,
      toTs: dateTo ? dateInputToToTs(dateTo) : null,
      contextQuery: debouncedContext.trim() || null,
    });
  }, [projectId, dateFrom, dateTo, debouncedContext, onExportFilterChange]);

  const hasActiveFilter =
    dateFrom !== "" || dateTo !== "" || debouncedContext.trim() !== "";

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [projectId, dateFrom, dateTo, debouncedContext]);

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const active = next.find((s) => s.id === "date") ?? prev[0];
      return [{ id: "date", desc: active?.desc ?? true }];
    });
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    setPagination((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next.pageSize !== prev.pageSize) {
        return { ...next, pageIndex: 0 };
      }
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const queryKey = [
      projectId,
      pagination.pageIndex,
      pagination.pageSize,
      dateFrom,
      dateTo,
      debouncedContext,
      sorting[0]?.id ?? "date",
      sorting[0]?.desc ? "desc" : "asc",
    ].join("|");

    const isBackgroundRefresh =
      queryKeyRef.current === queryKey && hasDataRef.current;
    queryKeyRef.current = queryKey;

    if (isBackgroundRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    const fromTs = dateFrom ? dateInputToFromTs(dateFrom) : null;
    const toTs = dateTo ? dateInputToToTs(dateTo) : null;
    const query = debouncedContext.trim() || null;

    getActivitiesPage({
      projectId,
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      fromTs,
      toTs,
      contextQuery: query,
      sortBy: sorting[0]?.id ?? "date",
      sortOrder: sorting[0]?.desc ? "desc" : "asc",
    })
      .then((result) => {
        if (!cancelled) {
          hasDataRef.current = result.total_count > 0;
          setPageData(result);
        }
      })
      .catch((e) => console.error("get_activities_page failed", e))
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    projectId,
    pagination.pageIndex,
    pagination.pageSize,
    refreshKey,
    dateFrom,
    dateTo,
    debouncedContext,
    sorting,
  ]);

  const data = useMemo(() => toActivityRows(pageData.items), [pageData.items]);

  const pageCount = Math.max(
    1,
    Math.ceil(pageData.total_count / pagination.pageSize) || 1,
  );

  /** Setzt alle Filterfelder auf den Ausgangszustand zurück. */
  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setContextQuery("");
  }

  return {
    pagination,
    pageData,
    loading,
    isRefreshing,
    sorting,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    contextQuery,
    setContextQuery,
    debouncedContext,
    hasActiveFilter,
    clearFilters,
    data,
    pageCount,
    handleSortingChange,
    handlePaginationChange,
  };
}
