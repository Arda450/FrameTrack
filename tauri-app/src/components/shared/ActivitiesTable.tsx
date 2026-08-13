import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import type { TableExportFilter } from "../../types";
import { AppIcon } from "./AppIcon";
import { createActivitiesTableColumns } from "./activitiesTableColumns";
import { ActivitiesTableFilters } from "./ActivitiesTableFilters";
import { PAGE_SIZE_OPTIONS } from "./activitiesTableTypes";
import { useActivitiesPage } from "./useActivitiesPage";

type ActivitiesTableProps = {
  projectId: number | null;
  projectName?: string | null;
  refreshKey: number;
  /** Meldet aktuelle Filter an den Export (OverviewPanel). */
  onExportFilterChange?: (filter: TableExportFilter) => void;
};

/** Paginierte Aktivitätstabelle mit serverseitigen Filtern und Sortierung. */
export function ActivitiesTable({
  projectId,
  projectName = null,
  refreshKey,
  onExportFilterChange,
}: ActivitiesTableProps) {
  const {
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
  } = useActivitiesPage({
    projectId,
    refreshKey,
    onExportFilterChange,
  });

  const columns = useMemo(() => createActivitiesTableColumns(), []);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: { pagination, sorting },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    manualPagination: true,
    manualSorting: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    autoResetPageIndex: false,
  });

  const filterBar = (
    <ActivitiesTableFilters
      sortDesc={sorting[0]?.desc ?? true}
      dateFrom={dateFrom}
      dateTo={dateTo}
      debouncedContext={debouncedContext}
      projectId={projectId}
      projectName={projectName}
      dateFromValue={dateFrom}
      dateToValue={dateTo}
      contextQuery={contextQuery}
      hasActiveFilter={hasActiveFilter}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      onContextQueryChange={setContextQuery}
      onClearFilters={clearFilters}
    />
  );

  if (!loading && pageData.total_count === 0) {
    return (
      <div>
        {filterBar}
        <p className="activitiesEmptyMessage">
          {hasActiveFilter
            ? "Keine Einträge für die gewählten Filter."
            : "Noch keine Aktivitäten erfasst."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {filterBar}

      {loading && pageData.total_count === 0 && (
        <p className="activitiesLoadingMessage">Lade Einträge…</p>
      )}
      <div
        className={[
          "activitiesTableWrap",
          isRefreshing ? "activitiesTableRefreshing" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <table className="activitiesTable">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="activitiesPaginationBar">
        <span className="pageInfo">
          Seite {pagination.pageIndex + 1} / {pageCount} ({pageData.total_count}{" "}
          Einträge{hasActiveFilter ? ", gefiltert" : ""})
        </span>
        <div className="activitiesPagination">
          <label className="activitiesPageSizeField">
            <span className="activitiesPageSizeLabel">Einträge pro Seite</span>
            <span className="activitiesPageSizeSelectWrap">
              <select
                className="activitiesPageSizeSelect"
                value={pagination.pageSize}
                onChange={(e) =>
                  handlePaginationChange({
                    pageIndex: 0,
                    pageSize: Number(e.target.value),
                  })
                }
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <button
            type="button"
            className="activitiesPageNavBtn"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Zurück"
            title="Zurück"
          >
            <AppIcon icon={ChevronLeft} size={18} />
          </button>
          <button
            type="button"
            className="activitiesPageNavBtn"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Weiter"
            title="Weiter"
          >
            <AppIcon icon={ChevronRight} size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
