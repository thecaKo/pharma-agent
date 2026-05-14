"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const REFRESH_EVENTS = new Set([
  "agent:online",
  "agent:offline",
  "agent:event",
  "sync:started",
  "sync:finished",
  "sync:error",
  "products:changed"
]);

export function PanelRealtime() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const refreshTimer = useRef<number | undefined>(undefined);
  const shouldSkipRefresh = pathname.includes("/database")
    && (searchParams.has("deepScan") || searchParams.has("databaseDir"));

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/api/panel/socket`);

    socket.addEventListener("open", () => setStatus("online"));
    socket.addEventListener("close", () => setStatus("offline"));
    socket.addEventListener("error", () => setStatus("offline"));
    socket.addEventListener("message", (event) => {
      const message = parseMessage(event.data);
      if (!message || !REFRESH_EVENTS.has(message.type)) {
        return;
      }
      if (shouldSkipRefresh) {
        return;
      }

      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        router.refresh();
      }, 350);
    });

    return () => {
      window.clearTimeout(refreshTimer.current);
      socket.close();
    };
  }, [router, shouldSkipRefresh]);

  return <span className={`realtime-dot ${status}`}>{status === "online" ? "Tempo real" : "Reconectando"}</span>;
}

function parseMessage(raw: unknown): { type: string } | null {
  if (typeof raw !== "string") {
    return null;
  }
  try {
    const message = JSON.parse(raw) as { type?: unknown };
    return typeof message.type === "string" ? { type: message.type } : null;
  } catch {
    return null;
  }
}
