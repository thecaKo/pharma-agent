"use client";

import { useEffect, useState } from "react";

type ToastStatus = "success" | "error" | "pending" | string | undefined;

export function Toast({ status, message }: { status?: ToastStatus; message?: string }) {
  const [mounted, setMounted] = useState(Boolean(message));
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }

    setMounted(true);
    const enterTimer = window.setTimeout(() => setVisible(true), 20);
    const hideTimer = window.setTimeout(() => setVisible(false), 6000);
    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(hideTimer);
    };
  }, [message]);

  useEffect(() => {
    if (visible) {
      return;
    }

    const unmountTimer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(unmountTimer);
  }, [visible]);

  if (!message || !mounted) {
    return null;
  }

  const kind = status === "error" || status === "failed" ? "error" : status === "success" ? "success" : "info";

  return (
    <div className={`toast ${kind} ${visible ? "show" : "hide"}`} role="status" aria-live="polite">
      <div>
        <strong>{kind === "error" ? "Falha" : kind === "success" ? "Sucesso" : "Aviso"}</strong>
        <p>{message}</p>
      </div>
      <button type="button" className="toast-close" onClick={() => setVisible(false)} aria-label="Fechar notificação">
        ×
      </button>
    </div>
  );
}
