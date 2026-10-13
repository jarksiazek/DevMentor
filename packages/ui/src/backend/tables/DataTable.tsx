"use client";

import type { ReactNode } from "react";

import { EmptyState } from "../feedback/EmptyState.tsx";
import { ErrorMessage } from "../feedback/ErrorMessage.tsx";
import { LoadingMessage } from "../feedback/LoadingMessage.tsx";
import { Button } from "@devmentor/ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@devmentor/ui/components/ui/table";
import { cn } from "@devmentor/ui/lib/utils";

export interface DataTableColumn<T> {
  /** Unique column id; also the row property rendered when `cell` is omitted. */
  key: string;
  header: ReactNode;
  cell?: (row: T) => ReactNode;
  className?: string;
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[] | undefined;
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  /** Error message; replaces the table when set. */
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: DataTablePagination;
  rowActions?: (row: T) => ReactNode;
}

function defaultCell<T>(row: T, key: string): ReactNode {
  const value = (row as Record<string, unknown>)[key];
  return value === null || value === undefined ? "–" : String(value);
}

/** Column-config-driven list with built-in loading, error, empty and pagination states. */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  error,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  pagination,
  rowActions,
}: DataTableProps<T>) {
  if (error) {
    const retry = onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    );
    return <ErrorMessage message={error} action={retry} />;
  }
  if (isLoading && !rows) return <LoadingMessage />;
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  const pageCount = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div className={cn("flex flex-col gap-3", isLoading && "opacity-60")} aria-busy={isLoading}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            {rowActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell ? column.cell(row) : defaultCell(row, column.key)}
                </TableCell>
              ))}
              {rowActions && <TableCell className="text-right">{rowActions(row)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination && pageCount > 1 && (
        <div className="text-muted-foreground flex items-center justify-end gap-2 text-sm">
          <span>
            Page {pagination.page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || pagination.page <= 1}
            onClick={() => pagination.onPageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || pagination.page >= pageCount}
            onClick={() => pagination.onPageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
