"use client";

import { useEffect, useState } from "react";

import type { HealthReport } from "@devmentor/core";
import { apiCall, type ApiResult } from "@devmentor/ui/backend/api";
import { Badge } from "@devmentor/ui/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui/components/ui/card";

function StatusBadge({ result }: { result: ApiResult<HealthReport> | undefined }) {
  if (!result) return <Badge variant="outline">Checking…</Badge>;
  return result.ok ? <Badge>Connected</Badge> : <Badge variant="destructive">Unavailable</Badge>;
}

export function SystemStatusCard() {
  const [result, setResult] = useState<ApiResult<HealthReport>>();

  useEffect(() => {
    let isCurrent = true;
    void apiCall<HealthReport>("/api/health").then((health) => {
      if (isCurrent) setResult(health);
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardDescription>Database</CardDescription>
        <CardTitle className="flex items-center gap-2">
          PostgreSQL
          <StatusBadge result={result} />
        </CardTitle>
      </CardHeader>
      {result && !result.ok && (
        <CardContent className="text-muted-foreground text-sm">{result.error.message}</CardContent>
      )}
    </Card>
  );
}
