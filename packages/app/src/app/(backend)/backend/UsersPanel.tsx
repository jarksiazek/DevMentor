"use client";

import { useEffect, useState } from "react";

import type { UserDto } from "@devmentor/core";
import { userInputSchema } from "@devmentor/core/validators/auth/user-input.schema";
import { apiCall, type ApiResult, type Paginated } from "@devmentor/ui/backend/api";
import { CrudForm, type CrudFormField } from "@devmentor/ui/backend/forms";
import { DataTable, type DataTableColumn } from "@devmentor/ui/backend/tables";
import { Button } from "@devmentor/ui/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui/components/ui/card";

const PAGE_SIZE = 10;

const columns: DataTableColumn<UserDto>[] = [
  { key: "name", header: "Name", className: "font-medium" },
  { key: "email", header: "Email" },
  { key: "createdAt", header: "Joined", cell: (user) => user.createdAt.slice(0, 10) },
];

const fields: CrudFormField<typeof userInputSchema>[] = [
  { name: "name", label: "Name", autoComplete: "off" },
  { name: "email", label: "Email", type: "email", autoComplete: "off" },
];

export function UsersPanel() {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; result: ApiResult<Paginated<UserDto>> }>();
  const [isCreating, setIsCreating] = useState(false);

  const requestKey = `${page}:${version}`;
  const isLoading = loaded?.key !== requestKey;
  const result = loaded?.result;

  useEffect(() => {
    let isCurrent = true;
    void apiCall<Paginated<UserDto>>(`/api/users?page=${page}&pageSize=${PAGE_SIZE}`).then((users) => {
      if (isCurrent) setLoaded({ key: `${page}:${version}`, result: users });
    });
    return () => {
      isCurrent = false;
    };
  }, [page, version]);

  const reload = () => setVersion((current) => current + 1);

  async function deleteUser(user: UserDto) {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    const deleted = await apiCall(`/api/users/${user.id}`, { method: "DELETE" });
    if (!deleted.ok) {
      window.alert(deleted.error.message);
      return;
    }
    reload();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>{result?.ok ? `${result.data.total} total` : " "}</CardDescription>
        {!isCreating && (
          <CardAction>
            <Button size="sm" onClick={() => setIsCreating(true)}>
              New user
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {isCreating && (
          <CrudForm
            schema={userInputSchema}
            fields={fields}
            submitLabel="Create user"
            onSubmit={(input) => apiCall<UserDto>("/api/users", { method: "POST", body: input })}
            onSuccess={() => {
              setIsCreating(false);
              setPage(1);
              reload();
            }}
            onCancel={() => setIsCreating(false)}
          />
        )}
        <DataTable
          columns={columns}
          rows={result?.ok ? result.data.items : undefined}
          getRowKey={(user) => user.id}
          isLoading={isLoading}
          error={result && !result.ok ? result.error.message : null}
          onRetry={reload}
          emptyTitle="No users yet"
          emptyDescription="Create the first one with “New user”."
          pagination={
            result?.ok
              ? { page, pageSize: PAGE_SIZE, total: result.data.total, onPageChange: setPage }
              : undefined
          }
          rowActions={(user) => (
            <Button variant="ghost" size="sm" onClick={() => void deleteUser(user)}>
              Delete
            </Button>
          )}
        />
      </CardContent>
    </Card>
  );
}
