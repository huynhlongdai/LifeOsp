import type { ReactNode } from "react";

export type AsyncState<T> =
  | { kind: "loading" }
  | { kind: "success"; data: T }
  | { kind: "error"; message: string };

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="empty-state" role="status">
      <p className="eyebrow">EMPTY</p>
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

export function ErrorState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="state-message error-message" role="alert">
      <p className="eyebrow">UNAVAILABLE</p>
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

export function LoadingState({ label = "Đang kiểm tra…" }: { label?: string }) {
  return (
    <span className="status checking" role="status" aria-live="polite">
      {label}
    </span>
  );
}
