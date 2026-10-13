import { AlertCircleIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@devmentor/ui/lib/utils";

export function ErrorMessage({
  message,
  action,
  className,
}: {
  message: string;
  /** e.g. a retry button. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-3 rounded-md border px-4 py-3 text-sm",
        className,
      )}
    >
      <AlertCircleIcon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      {action}
    </div>
  );
}
