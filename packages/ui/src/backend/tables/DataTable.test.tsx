import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableColumn } from "./DataTable.tsx";

interface Row {
  id: string;
  name: string;
  email: string | null;
  note?: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", className: "font-medium" },
  { key: "email", header: "Email" },
  { key: "note", header: "Note" },
  { key: "shout", header: "Shout", cell: (row) => row.name.toUpperCase() },
];
const rows: Row[] = [
  { id: "1", name: "Ada", email: null },
  { id: "2", name: "Linus", email: "linus@example.com", note: "hi" },
];
const getRowKey = (row: Row) => row.id;

describe("DataTable", () => {
  it("shows the error instead of the table, with a retry button when onRetry is set", async () => {
    const onRetry = vi.fn();
    render(<DataTable columns={columns} rows={rows} getRowKey={getRowKey} error="Failed" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the error without a retry button when onRetry is missing", () => {
    render(<DataTable columns={columns} rows={undefined} getRowKey={getRowKey} error="Failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a loading message while loading without rows", () => {
    render(<DataTable columns={columns} rows={undefined} getRowKey={getRowKey} isLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("shows the default empty state for missing or empty rows", () => {
    const { rerender } = render(<DataTable columns={columns} rows={undefined} getRowKey={getRowKey} />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    rerender(
      <DataTable columns={columns} rows={[]} getRowKey={getRowKey} emptyTitle="No users" emptyDescription="Add one" />,
    );
    expect(screen.getByText("No users")).toBeInTheDocument();
    expect(screen.getByText("Add one")).toBeInTheDocument();
  });

  it("renders rows with default and custom cells, without actions or pagination", () => {
    const { container } = render(<DataTable columns={columns} rows={rows} getRowKey={getRowKey} />);
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Name",
      "Email",
      "Note",
      "Shout",
    ]);
    const [ada, linus] = screen.getAllByRole("row").slice(1);
    expect(ada).toHaveTextContent("Ada––ADA");
    expect(linus).toHaveTextContent("Linuslinus@example.comhiLINUS");
    expect(screen.getByRole("cell", { name: "Ada" })).toHaveClass("font-medium");
    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("aria-busy", "false");
    expect(container.firstChild).not.toHaveClass("opacity-60");
  });

  it("renders row actions and dims existing rows while reloading", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={getRowKey}
        isLoading
        rowActions={(row) => <button>Delete {row.name}</button>}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Ada" })).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("aria-busy", "true");
    expect(container.firstChild).toHaveClass("opacity-60");
  });

  it("hides pagination when everything fits on one page", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={getRowKey}
        pagination={{ page: 1, pageSize: 10, total: 0, onPageChange: vi.fn() }}
      />,
    );
    expect(screen.queryByText(/Page \d+ of/)).not.toBeInTheDocument();
  });

  it("pages forward and backward and disables buttons at the edges", async () => {
    const onPageChange = vi.fn();
    const pagination = { page: 1, pageSize: 2, total: 5, onPageChange };
    const { rerender } = render(
      <DataTable columns={columns} rows={rows} getRowKey={getRowKey} pagination={pagination} />,
    );
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);

    rerender(<DataTable columns={columns} rows={rows} getRowKey={getRowKey} pagination={{ ...pagination, page: 2 }} />);
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);

    rerender(<DataTable columns={columns} rows={rows} getRowKey={getRowKey} pagination={{ ...pagination, page: 3 }} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    rerender(
      <DataTable columns={columns} rows={rows} getRowKey={getRowKey} isLoading pagination={{ ...pagination, page: 2 }} />,
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
