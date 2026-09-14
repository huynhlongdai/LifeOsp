import { useEffect, useState } from "react";

type Step = { id: string; actionId: string; title: string; position: number; done: boolean };

/**
 * "TRONG PHIÊN NÀY": the user's own breakdown of the current Action. LifeOS stores and
 * shows exactly what they typed and ticked — it never invents steps or completes them.
 */
export function SessionChecklist({ apiUrl, actionId }: { apiUrl: string; actionId: string }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiUrl}/v1/actions/${encodeURIComponent(actionId)}/steps`, {
      credentials: "include",
      signal: controller.signal
    })
      .then(async (response) => (response.ok ? ((await response.json()) as { steps: Step[] }) : { steps: [] }))
      .then((body) => setSteps(body.steps))
      .catch(() => undefined);
    return () => controller.abort();
  }, [apiUrl, actionId]);

  async function addStep() {
    const title = draft.trim();
    if (title.length === 0 || adding) return;
    setAdding(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/v1/actions/${encodeURIComponent(actionId)}/steps`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title })
      });
      if (!response.ok) throw new Error("save failed");
      const step = (await response.json()) as Step;
      setSteps((current) => [...current, step]);
      setDraft("");
    } catch {
      setError("Chưa lưu được bước này. Thử lại nhé.");
    } finally {
      setAdding(false);
    }
  }

  async function toggle(step: Step) {
    const next = !step.done;
    setSteps((current) => current.map((item) => (item.id === step.id ? { ...item, done: next } : item)));
    try {
      const response = await fetch(`${apiUrl}/v1/action-steps/${encodeURIComponent(step.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ done: next })
      });
      if (!response.ok) throw new Error("patch failed");
    } catch {
      setSteps((current) => current.map((item) => (item.id === step.id ? { ...item, done: step.done } : item)));
      setError("Chưa lưu được trạng thái bước. Thử lại nhé.");
    }
  }

  async function remove(step: Step) {
    const snapshot = steps;
    setSteps((current) => current.filter((item) => item.id !== step.id));
    try {
      const response = await fetch(`${apiUrl}/v1/action-steps/${encodeURIComponent(step.id)}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!response.ok) throw new Error("delete failed");
    } catch {
      setSteps(snapshot);
      setError("Chưa xoá được bước này.");
    }
  }

  const doneCount = steps.filter((step) => step.done).length;
  const allDone = steps.length > 0 && doneCount === steps.length;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold" style={{ color: "var(--text-3)", letterSpacing: "0.12em" }}>
            TRONG PHIÊN NÀY
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: allDone ? "var(--green-bg)" : "var(--primary-bg)",
              color: allDone ? "var(--green)" : "var(--primary)"
            }}
          >
            {doneCount}/{steps.length}
          </span>
        </div>
        {allDone ? <span className="text-xs font-bold" style={{ color: "var(--green)" }}>✓ Xong rồi!</span> : null}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
        {steps.length === 0 ? (
          <p className="px-4 py-3.5 text-xs" style={{ color: "var(--text-3)" }}>
            Chưa có bước nào. Bạn tự chia nhỏ Action này thành các bước của phiên làm việc.
          </p>
        ) : (
          steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center gap-4 w-full px-4 py-3.5"
              style={{ borderBottom: index < steps.length - 1 ? "1px solid var(--border)" : "1px solid var(--border)" }}
            >
              <button
                type="button"
                onClick={() => void toggle(step)}
                aria-pressed={step.done}
                aria-label={`Bước: ${step.title}`}
                className="flex items-center gap-4 flex-1 text-left"
              >
                <span
                  className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ border: step.done ? "none" : "2px solid var(--border-2)", background: step.done ? "var(--primary)" : "transparent" }}
                >
                  {step.done ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </span>
                <span
                  className="text-sm"
                  style={{ color: step.done ? "var(--text-3)" : "var(--text)", textDecoration: step.done ? "line-through" : "none" }}
                >
                  {step.title}
                </span>
              </button>
              <button type="button" onClick={() => void remove(step)} aria-label={`Xoá bước ${step.title}`} className="text-xs" style={{ color: "var(--text-3)" }}>
                ✕
              </button>
            </div>
          ))
        )}

        <div className="flex items-center gap-2 px-4 py-3">
          <input
            value={draft}
            maxLength={200}
            placeholder="Thêm một bước…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addStep();
              }
            }}
            className="flex-1 text-sm bg-transparent"
            style={{ color: "var(--text)", outline: "none", border: "none" }}
          />
          <button
            type="button"
            disabled={adding || draft.trim().length === 0}
            onClick={() => void addStep()}
            className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40"
            style={{ background: "var(--primary-bg)", color: "var(--primary)" }}
          >
            Thêm
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-xs mt-2" role="alert" style={{ color: "var(--red)" }}>{error}</p>
      ) : null}
    </div>
  );
}
