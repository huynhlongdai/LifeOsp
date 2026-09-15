import type { ReactNode } from "react";

export type AsyncState<T> =
  | { kind: "loading" }
  | { kind: "success"; data: T }
  | { kind: "error"; message: string };

/** Paper-stack micro-illustration used by empty and recovery states. Decorative only. */
export function PaperStack() {
  return (
    <div className="illo" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}

export function EmptyState({
  title,
  label = "Chưa có gì ở đây",
  children,
  actions
}: {
  title: string;
  label?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="empty-state" role="status">
      <PaperStack />
      <p className="eyebrow maintain">{label}</p>
      <h2>{title}</h2>
      <p>{children}</p>
      {actions}
    </section>
  );
}

export function ErrorState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="state-message error-message" role="alert">
      <p className="eyebrow">Chưa sẵn sàng</p>
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
