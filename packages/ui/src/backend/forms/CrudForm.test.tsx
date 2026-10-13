import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { ApiResult } from "../api/types.ts";
import { CrudForm, type CrudFormField } from "./CrudForm.tsx";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("Enter a valid email address"),
});
type Saved = { id: string };

const fields: CrudFormField<typeof schema>[] = [
  { name: "name", label: "Name", placeholder: "Ada", autoComplete: "off" },
  { name: "email", label: "Email", type: "email" },
];

const success: ApiResult<Saved> = { ok: true, data: { id: "1" }, status: 201 };

async function fillValid() {
  await userEvent.type(screen.getByLabelText("Name"), "Ada");
  await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
}

describe("CrudForm", () => {
  it("renders fields with their types, defaults and initial values", () => {
    render(
      <CrudForm schema={schema} fields={fields} initialValues={{ name: "Grace" }} onSubmit={vi.fn()} />,
    );
    const name = screen.getByLabelText("Name");
    expect(name).toHaveAttribute("type", "text");
    expect(name).toHaveAttribute("placeholder", "Ada");
    expect(name).toHaveAttribute("autocomplete", "off");
    expect(name).toHaveValue("Grace");
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("shows client-side field errors and does not submit invalid values", async () => {
    const onSubmit = vi.fn();
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Name"), "   ");
    await userEvent.type(screen.getByLabelText("Email"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    const name = screen.getByLabelText("Name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Name is required");
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter a valid email address");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows form-level errors from object refinements", async () => {
    const refined = schema.refine((value) => value.name !== "root", { message: "Reserved name" });
    render(<CrudForm schema={refined} fields={fields} onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Name"), "root");
    await userEvent.type(screen.getByLabelText("Email"), "root@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Reserved name");
  });

  it("submits parsed values, resets the form and calls onSuccess", async () => {
    const onSubmit = vi.fn(async () => success);
    const onSuccess = vi.fn();
    render(
      <CrudForm schema={schema} fields={fields} submitLabel="Create" onSubmit={onSubmit} onSuccess={onSuccess} />,
    );
    await userEvent.type(screen.getByLabelText("Name"), "  Ada ");
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledWith({ name: "Ada", email: "ada@example.com" });
    expect(onSuccess).toHaveBeenCalledWith({ id: "1" });
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
  });

  it("succeeds without an onSuccess callback", async () => {
    render(<CrudForm schema={schema} fields={fields} onSubmit={async () => success} />);
    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
  });

  it("shows server field errors next to fields without a form error", async () => {
    const onSubmit = vi.fn(
      async (): Promise<ApiResult<Saved>> => ({
        ok: false,
        status: 422,
        error: { code: "validation_error", message: "Invalid input", fieldErrors: { email: ["Taken"] } },
      }),
    );
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Taken");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
  });

  it("shows a server message as a form error when there are no field errors", async () => {
    const onSubmit = async (): Promise<ApiResult<Saved>> => ({
      ok: false,
      status: 409,
      error: { code: "conflict", message: "Already exists" },
    });
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Already exists");
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("disables the form while submitting and ignores a second submit", async () => {
    let resolve!: (result: ApiResult<Saved>) => void;
    const onSubmit = vi.fn(() => new Promise<ApiResult<Saved>>((done) => (resolve = done)));
    const onCancel = vi.fn();
    const { container } = render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} onCancel={onCancel} />);
    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByLabelText("Name")).toBeDisabled();
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).toHaveBeenCalledOnce();
    resolve(success);
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
  });

  it("submits with Cmd+Enter and Ctrl+Enter, but not plain Enter keydown handling", async () => {
    const onSubmit = vi.fn(async () => success);
    const { container } = render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    const form = container.querySelector("form")!;
    await fillValid();
    fireEvent.keyDown(form, { key: "Enter", metaKey: true });
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await fillValid();
    fireEvent.keyDown(form, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    const plainEnter = fireEvent.keyDown(form, { key: "Enter" });
    expect(plainEnter).toBe(true);
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("cancels with the Cancel button and Escape", async () => {
    const onCancel = vi.fn();
    const { container } = render(<CrudForm schema={schema} fields={fields} onSubmit={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const escape = fireEvent.keyDown(container.querySelector("form")!, { key: "Escape" });
    expect(escape).toBe(false);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("ignores Escape without onCancel", () => {
    const { container } = render(<CrudForm schema={schema} fields={fields} onSubmit={vi.fn()} />);
    expect(fireEvent.keyDown(container.querySelector("form")!, { key: "Escape" })).toBe(true);
  });
});
