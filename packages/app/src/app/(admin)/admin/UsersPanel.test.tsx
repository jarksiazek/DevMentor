import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserDto } from "@devmentor/core";
import type { ApiResult } from "@devmentor/ui/backend/api";

const apiCall = vi.hoisted(() => vi.fn());
vi.mock("@devmentor/ui/backend/api", () => ({ apiCall }));

const { UsersPanel } = await import("./UsersPanel.tsx");

const ada: UserDto = { id: "u1", name: "Ada", email: "ada@example.com", createdAt: "2026-10-13T10:00:00.000Z" };
const linus: UserDto = { id: "u2", name: "Linus", email: "linus@example.com", createdAt: "2026-10-12T10:00:00.000Z" };

function page(items: UserDto[], total = items.length, pageNumber = 1): ApiResult<unknown> {
  return { ok: true, data: { items, total, page: pageNumber, pageSize: 10 }, status: 200 };
}

const failure = (message: string, status = 500): ApiResult<unknown> => ({
  ok: false,
  error: { code: "error", message },
  status,
});

type Handler = (path: string, init?: { method?: string; body?: unknown }) => Promise<ApiResult<unknown>>;

function routeApi(handler: Handler) {
  apiCall.mockImplementation(handler);
}

const listCalls = () => apiCall.mock.calls.filter(([, init]) => init === undefined).map(([path]) => path);

beforeEach(() => {
  apiCall.mockReset();
});

describe("UsersPanel", () => {
  it("shows a loading state, then the users and their total", async () => {
    let resolve!: (value: ApiResult<unknown>) => void;
    apiCall.mockReturnValue(new Promise((done) => (resolve = done)));
    render(<UsersPanel />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(apiCall).toHaveBeenCalledWith("/api/users?page=1&pageSize=10");

    await act(async () => resolve(page([ada, linus])));
    expect(screen.getByText("2 total")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Ada")).toBeInTheDocument();
    expect(within(rows[1]).getByText("ada@example.com")).toBeInTheDocument();
    expect(within(rows[1]).getByText("2026-10-13")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Linus")).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    routeApi(async () => page([]));
    render(<UsersPanel />);
    expect(await screen.findByText("No users yet")).toBeInTheDocument();
    expect(screen.getByText("Create the first one with “New user”.")).toBeInTheDocument();
  });

  it("shows an error and retries", async () => {
    routeApi(async () => failure("Authentication required", 401));
    render(<UsersPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Authentication required");

    routeApi(async () => page([ada]));
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Ada")).toBeInTheDocument();
    expect(listCalls()).toEqual(["/api/users?page=1&pageSize=10", "/api/users?page=1&pageSize=10"]);
  });

  it("pages through the users", async () => {
    routeApi(async (path) => (path.includes("page=2") ? page([linus], 15, 2) : page([ada], 15)));
    render(<UsersPanel />);
    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Linus")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(apiCall).toHaveBeenLastCalledWith("/api/users?page=2&pageSize=10");
  });

  it("opens and cancels the create form", async () => {
    routeApi(async () => page([]));
    render(<UsersPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "New user" }));
    expect(screen.queryByRole("button", { name: "New user" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New user" })).toBeInTheDocument();
  });

  it("creates a user, returns to page 1 and reloads", async () => {
    let users = [ada];
    routeApi(async (path, init) => {
      if (init?.method === "POST") {
        users = [linus, ...users];
        return { ok: true, data: linus, status: 201 };
      }
      return path.includes("page=2") ? page([ada], 11, 2) : page(users, 11);
    });
    render(<UsersPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "New user" }));
    await userEvent.type(screen.getByLabelText("Name"), "Linus");
    await userEvent.type(screen.getByLabelText("Email"), "linus@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    expect(apiCall).toHaveBeenCalledWith("/api/users", {
      method: "POST",
      body: { name: "Linus", email: "linus@example.com" },
    });
    expect(await screen.findByText("Linus")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("does nothing when the delete is not confirmed", async () => {
    routeApi(async () => page([ada]));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<UsersPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(confirm).toHaveBeenCalledWith("Delete Ada?");
    expect(apiCall).toHaveBeenCalledTimes(1);
  });

  it("alerts when the delete fails", async () => {
    routeApi(async (_path, init) => (init?.method === "DELETE" ? failure("Forbidden", 403) : page([ada])));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<UsersPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(apiCall).toHaveBeenCalledWith("/api/users/u1", { method: "DELETE" });
    expect(alert).toHaveBeenCalledWith("Forbidden");
    expect(listCalls()).toHaveLength(1);
  });

  it("reloads after a successful delete", async () => {
    let users = [ada, linus];
    routeApi(async (_path, init) => {
      if (init?.method === "DELETE") {
        users = [linus];
        return { ok: true, data: { id: "u1" }, status: 200 };
      }
      return page(users);
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<UsersPanel />);
    const [deleteAda] = await screen.findAllByRole("button", { name: "Delete" });
    await userEvent.click(deleteAda);
    expect(await screen.findByText("1 total")).toBeInTheDocument();
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
  });

  it("ignores a response that arrives after unmount", async () => {
    let resolve!: (value: ApiResult<unknown>) => void;
    apiCall.mockReturnValue(new Promise((done) => (resolve = done)));
    const errors = vi.spyOn(console, "error");
    const { unmount } = render(<UsersPanel />);
    unmount();
    await act(async () => resolve(page([ada])));
    expect(errors).not.toHaveBeenCalled();
  });
});
