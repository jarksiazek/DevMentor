import { Loader2Icon } from "lucide-react";

import { cn } from "@devmentor/ui/lib/utils";

export function LoadingMessage({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("text-muted-foreground flex items-center gap-2 py-6 text-sm", className)}>
      <Loader2Icon className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}
