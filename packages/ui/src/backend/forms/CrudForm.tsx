"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { z } from "zod";

import type { ApiResult, FieldErrors } from "../api/types.ts";
import { ErrorMessage } from "../feedback/ErrorMessage.tsx";
import { Button } from "@devmentor/ui/components/ui/button";
import { Input } from "@devmentor/ui/components/ui/input";
import { Label } from "@devmentor/ui/components/ui/label";

type FieldName<S extends z.ZodObject> = Extract<keyof z.input<S>, string>;
type FormValues<S extends z.ZodObject> = Partial<Record<FieldName<S>, string>>;

export interface CrudFormField<S extends z.ZodObject> {
  name: FieldName<S>;
  label: string;
  type?: "text" | "email" | "number" | "password" | "url" | "tel";
  placeholder?: string;
  autoComplete?: string;
}

export interface CrudFormProps<S extends z.ZodObject, T> {
  /** The same Zod schema the API route validates with. */
  schema: S;
  fields: CrudFormField<S>[];
  initialValues?: FormValues<S>;
  submitLabel?: string;
  /** Usually an `apiCall`; its `fieldErrors` are shown next to the matching fields. */
  onSubmit: (values: z.output<S>) => Promise<ApiResult<T>>;
  onSuccess?: (data: T) => void;
  /** Shows a Cancel button and enables `Escape`. */
  onCancel?: () => void;
}

/**
 * Schema-driven create/edit form: client-side validation with the shared
 * schema, server field errors, loading state, `Cmd/Ctrl+Enter` submits and
 * `Escape` cancels.
 */
export function CrudForm<S extends z.ZodObject, T>({
  schema,
  fields,
  initialValues = {},
  submitLabel = "Save",
  onSubmit,
  onSuccess,
  onCancel,
}: CrudFormProps<S, T>) {
  const formId = useId();
  const [values, setValues] = useState<FormValues<S>>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      setFieldErrors(flattened.fieldErrors as FieldErrors);
      setFormError(flattened.formErrors[0] ?? null);
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit(parsed.data);
    setIsSubmitting(false);
    if (!result.ok) {
      setFieldErrors(result.error.fieldErrors ?? {});
      setFormError(result.error.fieldErrors ? null : result.error.message);
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setValues(initialValues);
    onSuccess?.(result.data);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    } else if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate className="flex flex-col gap-4">
      {formError && <ErrorMessage message={formError} />}
      {fields.map((field) => {
        const inputId = `${formId}-${field.name}`;
        const errors = fieldErrors[field.name];
        return (
          <div key={field.name} className="flex flex-col gap-2">
            <Label htmlFor={inputId}>{field.label}</Label>
            <Input
              id={inputId}
              name={field.name}
              type={field.type ?? "text"}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              value={values[field.name] ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
              aria-invalid={errors ? true : undefined}
              aria-describedby={errors ? `${inputId}-error` : undefined}
              disabled={isSubmitting}
            />
            {errors && (
              <p id={`${inputId}-error`} className="text-destructive text-sm">
                {errors[0]}
              </p>
            )}
          </div>
        );
      })}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
