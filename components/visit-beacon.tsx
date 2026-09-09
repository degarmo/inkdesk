"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function VisitBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/api") || pathname.startsWith("/_next")) return;
    const controller = new AbortController();
    fetch("/api/visits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
      signal: controller.signal,
    }).catch(() => {
      // Visit logging is best-effort. Lost rows are not shown as a UI error.
    });
    return () => controller.abort();
  }, [pathname]);

  return null;
}
