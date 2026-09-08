"use client";

import { useCallback, useRef, type FormEvent } from "react";

/** Blocks a second submit before React can flip `pending` (double-click / Enter). */
export function useOnceSubmit() {
  const locked = useRef(false);

  const unlock = useCallback(() => {
    locked.current = false;
  }, []);

  const onSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      return;
    }
    if (locked.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    locked.current = true;
  }, []);

  return { onSubmit, unlock };
}
