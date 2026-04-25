"use client";

import { useMemo, useState } from "react";

type SortDir = "asc" | "desc";

type Column<T> = {
  key: string;
  /** Column heading text. `label` is accepted as an alias. */
  header?: string;
  label?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
};

type DataTableProps<T extends object> = {
  columns: Column<T>[];
  data: T[];
  /** Property name used as the React row key. Defaults to "id". */
  rowKey?: string;
  pageSize?: number;
  searchable?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
};

/**
 * Sortable, searchable, paginated data table.
 * Maps to Dash create_data_table utility.
 */
export function DataTable<T extends object>({
  columns,
  data,
  rowKey = "id",
  pageSize = 10,
  searchable = true,
  emptyMessage = "No data to display.",
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) =>
        String((row as Record<string, unknown>)[col.key] ?? "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey] ?? "";
      const bv = (b as Record<string, unknown>)[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, {
        numeric: true,
      });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const rows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  return (
    <div className="data-table-root">
      {searchable && (
        <div className="data-table-toolbar">
          <input
            type="search"
            className="data-table-search"
            placeholder="Search…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            aria-label="Search table"
          />
          <span className="data-table-count">
            {filtered.length} / {data.length} rows
          </span>
        </div>
      )}

      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`data-table-th${col.sortable !== false ? " sortable" : ""}${sortKey === col.key ? " sorted" : ""}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {col.label ?? col.header}
                  {col.sortable !== false && (
                    <span className="sort-icon" aria-hidden="true">
                      {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="data-table-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={String((row as Record<string, unknown>)[rowKey])}
                  className={`data-table-row${onRowClick ? " data-table-row-clickable" : ""}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? { cursor: "pointer" } : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="data-table-td">
                      {col.render
                        ? col.render((row as Record<string, unknown>)[col.key], row)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="data-table-pagination">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
          >
            ← Prev
          </button>
          <span className="pagination-info">
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
