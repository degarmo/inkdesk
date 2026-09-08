"use client";

import { useActionState, useEffect } from "react";
import { setShopUserActive, updateShopUserRole } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { FormMessage, NativeSelect } from "@/components/ui/field";
import { USER_ROLES } from "@/lib/constants";
import { useOnceSubmit } from "@/lib/use-once-submit";

export function UserRoleForm({ userId, role }: { userId: string; role: string }) {
  const [state, action, pending] = useActionState(updateShopUserRole, null);
  const { onSubmit, unlock } = useOnceSubmit();

  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2" onSubmit={onSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <NativeSelect name="role" defaultValue={role} className="h-8 w-auto text-xs" aria-label="Role">
        {USER_ROLES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </NativeSelect>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Save role"}
      </Button>
      {state?.error ? <FormMessage error={state.error} /> : null}
    </form>
  );
}

export function UserActiveForm({ userId, active }: { userId: string; active: boolean }) {
  const [state, action, pending] = useActionState(setShopUserActive, null);
  const { onSubmit, unlock } = useOnceSubmit();

  useEffect(() => {
    if (state?.error) unlock();
  }, [state, unlock]);

  return (
    <form action={action} onSubmit={onSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <Button type="submit" size="sm" variant={active ? "outline" : "default"} disabled={pending}>
        {pending ? "Saving…" : active ? "Deactivate" : "Reactivate"}
      </Button>
      {state?.error ? <p className="mt-1 text-xs text-oxblood">{state.error}</p> : null}
    </form>
  );
}
