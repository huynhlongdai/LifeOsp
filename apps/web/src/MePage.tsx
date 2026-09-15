import { useEffect, useMemo, useState } from "react";
import type {
  InsightView,
  MeOverviewView,
  MeUnavailableSection,
  OperatingPreferenceKey,
  OperatingPreferenceView
} from "@lifeos/domain";
import { createApiClient } from "./api";
import { createInsightApiClient } from "./insight-api";
import { createMeApiClient } from "./me-api";
import { createOperatingPreferenceApiClient } from "./operating-preference-api";
import { EmptyState, ErrorState, type AsyncState } from "./ui-states";

// ME overview (spec §14.1). "Current personal context", Operating
// Preferences (§14.2) and Pattern Candidates (§14.3) are all live.
// Personalization status (§14.4) and Data sources still need dedicated
// work — named honestly instead of faked, per the "no fabricated
// confidence" rule.

const SECTION_COPY: Record<MeUnavailableSection, { title: string; body: string }> = {
  personalizationStatus: {
    title: "LifeOS đang dùng gì để cá nhân hoá",
    body: "Sẽ giải thích rõ điều gì đang được dùng, điều gì mới là tạm thời, điều gì đang tắt — một khi có đủ dữ liệu vận hành."
  },
  dataSources: {
    title: "Nguồn dữ liệu & liên kết",
    body: "Chưa có tích hợp bên ngoài nào ở bản này."
  }
};

const PREFERENCE_LABEL: Record<OperatingPreferenceKey, { label: string; unit: string }> = {
  "next_action.target_max_minutes": { label: "Thời lượng việc gợi ý tối đa", unit: "phút" },
  "projects.max_primary_active": { label: "Số Project chính tối đa cùng lúc", unit: "Project" }
};

export function MePage({ apiUrl }: { apiUrl: string }) {
  const meApi = useMemo(() => createMeApiClient(apiUrl), [apiUrl]);
  const sessionApi = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const preferenceApi = useMemo(() => createOperatingPreferenceApiClient(apiUrl), [apiUrl]);
  const insightApi = useMemo(() => createInsightApiClient(apiUrl), [apiUrl]);

  const [state, setState] = useState<AsyncState<MeOverviewView>>({ kind: "loading" });
  const [preferences, setPreferences] = useState<AsyncState<OperatingPreferenceView[]>>({ kind: "loading" });
  const [insights, setInsights] = useState<AsyncState<InsightView[]>>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setState({ kind: "loading" });
        await sessionApi.bootstrapSession(controller.signal);
        const overview = await meApi.getOverview(controller.signal);
        setState({ kind: "success", data: overview });
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải trang Bạn" });
      }
    };
    void load();
    return () => controller.abort();
  }, [meApi, sessionApi]);

  useEffect(() => {
    const controller = new AbortController();
    preferenceApi
      .list(controller.signal)
      .then((view) => setPreferences({ kind: "success", data: view.preferences }))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setPreferences({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải quy tắc vận hành" });
      });
    return () => controller.abort();
  }, [preferenceApi]);

  useEffect(() => {
    const controller = new AbortController();
    insightApi
      .listInsights(controller.signal)
      .then((view) => setInsights({ kind: "success", data: view.candidates }))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setInsights({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải điều LifeOS nhận thấy" });
      });
    return () => controller.abort();
  }, [insightApi]);

  if (state.kind === "loading") {
    return (
      <section className="me-page" aria-busy="true">
        <div className="now-loading-strip" />
        <div className="now-loading-card"><span /><span /><span /></div>
      </section>
    );
  }
  if (state.kind === "error") return <ErrorState title="Chưa mở được trang Bạn">{state.message}</ErrorState>;

  const { personalContext, unavailableSections } = state.data;

  return (
    <section className="me-page">
      {personalContext.hasDirection ? (
        <div className="sheet tint me-context-card">
          <p className="eyebrow">Bối cảnh hiện tại</p>
          <b className="me-context-title">{personalContext.directionTitle}</b>
          {personalContext.seasonTitle ? <p className="me-context-season">{personalContext.seasonTitle}</p> : null}
          {personalContext.seasonPurpose ? <p>{personalContext.seasonPurpose}</p> : null}
          {personalContext.primaryFocusText ? <p className="muted">Trọng tâm: {personalContext.primaryFocusText}</p> : null}
          <div className="me-context-facts">
            <span className="pill num">{personalContext.activeOutcomeCount} Outcome đang hoạt động</span>
          </div>
          <a className="text-button link-button" href="/direction">
            Xem đầy đủ ở Direction
          </a>
        </div>
      ) : (
        <EmptyState
          label="Bạn"
          title="Chưa có hướng đi nào được xác nhận."
          actions={<a className="secondary-button link-button" href="/clarity">Bắt đầu từ Làm rõ</a>}
        >
          Bối cảnh cá nhân ở đây bắt đầu từ một Direction/Season đã xác nhận.
        </EmptyState>
      )}

      <PatternCandidatesSection state={insights} api={insightApi} onResolved={(id) => removeInsight(id, setInsights)} onPreferenceChanged={() => refreshPreferences(preferenceApi, setPreferences)} />

      <OperatingPreferencesSection state={preferences} api={preferenceApi} onChange={(next) => setPreferences({ kind: "success", data: next })} />

      <div className="me-sections">
        {unavailableSections.map((section) => {
          const copy = SECTION_COPY[section];
          return (
            <div key={section} className="me-unavailable-card">
              <b>{copy.title}</b>
              <p className="muted">{copy.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function removeInsight(id: string, setInsights: (updater: (prev: AsyncState<InsightView[]>) => AsyncState<InsightView[]>) => void) {
  setInsights((prev) => (prev.kind === "success" ? { kind: "success", data: prev.data.filter((insight) => insight.id !== id) } : prev));
}

function refreshPreferences(
  api: ReturnType<typeof createOperatingPreferenceApiClient>,
  setPreferences: (state: AsyncState<OperatingPreferenceView[]>) => void
) {
  api
    .list()
    .then((view) => setPreferences({ kind: "success", data: view.preferences }))
    .catch(() => {
      /* best-effort refresh; the existing list stays visible */
    });
}

function PatternCandidatesSection({
  state,
  api,
  onResolved,
  onPreferenceChanged
}: {
  state: AsyncState<InsightView[]>;
  api: ReturnType<typeof createInsightApiClient>;
  onResolved: (id: string) => void;
  onPreferenceChanged: () => void;
}) {
  if (state.kind === "loading") return null;
  if (state.kind === "error") return <p className="now-inline-error" role="alert">{state.message}</p>;
  if (state.data.length === 0) return null;

  return (
    <div className="me-insights">
      <p className="eyebrow">Điều LifeOS nhận thấy</p>
      {state.data.map((insight) => (
        <InsightCard key={insight.id} insight={insight} api={api} onResolved={() => onResolved(insight.id)} onPreferenceChanged={onPreferenceChanged} />
      ))}
    </div>
  );
}

function InsightCard({
  insight,
  api,
  onResolved,
  onPreferenceChanged
}: {
  insight: InsightView;
  api: ReturnType<typeof createInsightApiClient>;
  onResolved: () => void;
  onPreferenceChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(String(insight.proposedPreference?.value ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = async (resolution: "confirm" | "partly_accurate" | "reject") => {
    setBusy(true);
    setError(null);
    try {
      const value = resolution === "partly_accurate" ? Number(editedValue) : undefined;
      await api.resolve(insight.id, resolution, value);
      onResolved();
      if (resolution !== "reject") onPreferenceChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa ghi nhận được. Thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet tint me-insight-card">
      <b>{insight.title}</b>
      <p className="muted">{insight.description}</p>
      {insight.proposedPreference ? (
        <p className="me-insight-effect">Nếu xác nhận: {insight.proposedPreference.effect}</p>
      ) : null}
      {editing ? (
        <div className="me-insight-edit">
          <input type="number" value={editedValue} onChange={(event) => setEditedValue(event.target.value)} disabled={busy} />
          <button type="button" className="primary-button" disabled={busy} onClick={() => void resolve("partly_accurate")}>
            Lưu
          </button>
          <button type="button" className="text-button" disabled={busy} onClick={() => setEditing(false)}>
            Huỷ
          </button>
        </div>
      ) : (
        <div className="me-insight-actions">
          <button type="button" className="primary-button" disabled={busy} onClick={() => void resolve("confirm")}>
            Xác nhận
          </button>
          <button type="button" className="text-button" disabled={busy} onClick={() => setEditing(true)}>
            Đúng một phần, sửa lại
          </button>
          <button type="button" className="text-button" disabled={busy} onClick={() => void resolve("reject")}>
            Không đúng / Bỏ qua
          </button>
        </div>
      )}
      {error ? <p className="now-inline-error" role="alert">{error}</p> : null}
    </div>
  );
}

function OperatingPreferencesSection({
  state,
  api,
  onChange
}: {
  state: AsyncState<OperatingPreferenceView[]>;
  api: ReturnType<typeof createOperatingPreferenceApiClient>;
  onChange: (next: OperatingPreferenceView[]) => void;
}) {
  if (state.kind === "loading") return null;
  if (state.kind === "error") return <p className="now-inline-error" role="alert">{state.message}</p>;
  if (state.data.length === 0) return null;

  const replace = (updated: OperatingPreferenceView) => onChange(state.data.map((p) => (p.id === updated.id ? updated : p)));
  const remove = (id: string) => onChange(state.data.filter((p) => p.id !== id));

  return (
    <div className="me-preferences">
      <p className="eyebrow">Cách LifeOS làm việc với bạn</p>
      {state.data.map((preference) => (
        <PreferenceRow key={preference.id} preference={preference} api={api} onUpdated={replace} onDeleted={() => remove(preference.id)} />
      ))}
    </div>
  );
}

function PreferenceRow({
  preference,
  api,
  onUpdated,
  onDeleted
}: {
  preference: OperatingPreferenceView;
  api: ReturnType<typeof createOperatingPreferenceApiClient>;
  onUpdated: (updated: OperatingPreferenceView) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(preference.value));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = PREFERENCE_LABEL[preference.key];

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.update(preference.id, { value: Number(value) });
      onUpdated(updated);
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa lưu được. Thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.update(preference.id, { status: preference.status === "active" ? "disabled" : "active" });
      onUpdated(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa đổi được. Thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.remove(preference.id);
      onDeleted();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa xoá được. Thử lại.");
      setBusy(false);
    }
  };

  return (
    <div className={`sheet tint me-preference-row${preference.status === "disabled" ? " disabled" : ""}`}>
      <div className="me-preference-head">
        <b>{copy.label}</b>
        <span className="pill num">{preference.status === "active" ? "Đang bật" : "Đã tắt"}</span>
      </div>
      {editing ? (
        <div className="me-insight-edit">
          <input type="number" value={value} onChange={(event) => setValue(event.target.value)} disabled={busy} />
          <span className="muted">{copy.unit}</span>
          <button type="button" className="primary-button" disabled={busy} onClick={() => void save()}>
            Lưu
          </button>
          <button type="button" className="text-button" disabled={busy} onClick={() => setEditing(false)}>
            Huỷ
          </button>
        </div>
      ) : (
        <div className="me-preference-actions">
          <span className="num">
            {preference.value} {copy.unit}
          </span>
          <button type="button" className="text-button" disabled={busy} onClick={() => setEditing(true)}>
            Sửa
          </button>
          <button type="button" className="text-button" disabled={busy} onClick={() => void toggle()}>
            {preference.status === "active" ? "Tắt" : "Bật"}
          </button>
          <button type="button" className="text-button" disabled={busy} onClick={() => void remove()}>
            Xoá
          </button>
        </div>
      )}
      {error ? <p className="now-inline-error" role="alert">{error}</p> : null}
    </div>
  );
}
