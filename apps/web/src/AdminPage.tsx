import { useEffect, useMemo, useState } from "react";
import type { AdminSettingsView, AiProvider } from "@lifeos/domain";
import { AI_PROVIDERS, DEFAULT_AI_MODELS, PROVIDER_LABELS } from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";

const CARD = { background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" } as const;

/**
 * Admin panel. Holds the AI provider credentials and the raw system counters.
 * The stored key is write-only: the server returns the last 4 characters and nothing more.
 */
export function AdminPage({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; settings: AdminSettingsView } | { kind: "empty" } | { kind: "error"; message: string }
  >({ kind: "loading" });
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getAdminSettings(controller.signal)
      .then((settings) => {
        if (!settings) {
          setState({ kind: "empty" });
          return;
        }
        setState({ kind: "ready", settings });
        if (settings.aiProvider) setProvider(settings.aiProvider);
        setModel(settings.aiModel ?? "");
        setBaseUrl(settings.aiBaseUrl ?? "");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (reason instanceof ApiRequestError && reason.status === 401) {
          setState({ kind: "empty" });
          return;
        }
        setState({ kind: "error", message: reason instanceof Error ? reason.message : "Không thể tải cài đặt." });
      });
    return () => controller.abort();
  }, [api]);

  const save = async (payload: { aiApiKey?: string | null }) => {
    setSaving(true);
    setNotice(null);
    try {
      const settings = await api.updateAdminSettings({
        aiProvider: provider,
        aiModel: model.trim() === "" ? null : model.trim(),
        aiBaseUrl: provider === "custom" ? (baseUrl.trim() === "" ? null : baseUrl.trim()) : null,
        ...payload
      });
      setState({ kind: "ready", settings });
      setApiKey("");
      setNotice({ tone: "ok", text: payload.aiApiKey === null ? "Đã xoá API key." : "Đã lưu cài đặt." });
    } catch (error) {
      const message =
        error instanceof ApiRequestError && typeof (error.body as { message?: string })?.message === "string"
          ? (error.body as { message: string }).message
          : error instanceof Error
            ? error.message
            : "Không lưu được cài đặt.";
      setNotice({ tone: "error", text: message });
    } finally {
      setSaving(false);
    }
  };

  if (state.kind === "loading") {
    return (
      <div className="px-5 pt-9" role="status">
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Đang tải cài đặt…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-4" role="alert" style={{ background: "var(--red-bg)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-extrabold tracking-widest mb-1" style={{ color: "var(--red)" }}>ADMIN</p>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="px-5 pt-9">
        <div className="rounded-2xl p-5" style={CARD}>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>
            Chưa có phiên LifeOS nào trên thiết bị này. Mở NOW để bắt đầu rồi quay lại.
          </p>
        </div>
      </div>
    );
  }

  const { settings } = state;
  const stats = [
    { label: "Capture", value: settings.stats.captures },
    { label: "Action", value: settings.stats.actionsTotal },
    { label: "Action đã xong", value: settings.stats.actionsCompleted },
    { label: "Phiên Focus", value: settings.stats.focusSessions },
    { label: "Phút Focus", value: settings.stats.focusMinutes },
    { label: "Incubator", value: settings.stats.incubatorItems },
    { label: "Chốt ngày", value: settings.stats.dailyCloses }
  ];

  return (
    <div className="pb-8 md:max-w-2xl">
      <div className="relative px-5 pt-10 pb-6 md:px-8" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <p className="text-[9px] font-extrabold tracking-widest mb-1.5" style={{ color: "var(--text-3)", letterSpacing: "0.14em" }}>ADMIN PANEL</p>
        <h1 className="text-[40px] leading-none font-display" style={{ color: "var(--text)", textTransform: "uppercase" }}>Quản trị</h1>
        <p className="font-hand mt-1" style={{ color: "var(--text-3)", fontSize: 17 }}>Khoá AI và số liệu hệ thống</p>
      </div>

      <div className="px-5 md:px-8 pt-5">
        <p className="text-[10px] font-extrabold tracking-widest mb-2" style={{ color: "var(--text-3)" }}>CÀI ĐẶT AI</p>
        <div className="rounded-2xl p-4 mb-5" style={CARD}>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-2)" }}>Nhà cung cấp</label>
          <div className="flex gap-2 mb-4">
            {(AI_PROVIDERS as readonly AiProvider[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setProvider(id)}
                className="text-xs font-bold px-3 py-2 rounded-xl"
                style={{
                  background: provider === id ? "var(--primary-bg)" : "var(--bg-2)",
                  color: provider === id ? "var(--primary)" : "var(--text-3)",
                  border: "1px solid var(--border)"
                }}
              >
                {PROVIDER_LABELS[id]}
              </button>
            ))}
          </div>

          {provider === "custom" ? (
            <>
              <label className="text-xs font-semibold block mb-1.5" htmlFor="admin-base-url" style={{ color: "var(--text-2)" }}>
                Base URL
              </label>
              <input
                id="admin-base-url"
                value={baseUrl}
                placeholder="https://openrouter.ai/api/v1"
                onChange={(event) => setBaseUrl(event.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl"
                style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <p className="text-[11px] mt-2 mb-4" style={{ color: "var(--text-3)" }}>
                Endpoint kiểu OpenAI: LifeOS sẽ gọi <code>{(baseUrl.trim() || "…").replace(/\/+$/, "")}/chat/completions</code>.
                Dùng được với OpenRouter, Groq, Together, vLLM hay Ollama trong mạng nội bộ.
              </p>
            </>
          ) : null}

          <label className="text-xs font-semibold block mb-1.5" htmlFor="admin-model" style={{ color: "var(--text-2)" }}>Model</label>
          <input
            id="admin-model"
            value={model}
            placeholder={DEFAULT_AI_MODELS[provider] || "tên model của nhà cung cấp"}
            onChange={(event) => setModel(event.target.value)}
            className="w-full text-sm px-3 py-2.5 rounded-xl mb-4"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />

          <label className="text-xs font-semibold block mb-1.5" htmlFor="admin-key" style={{ color: "var(--text-2)" }}>API key</label>
          <input
            id="admin-key"
            type="password"
            value={apiKey}
            autoComplete="off"
            placeholder={settings.aiKeySet ? `Đang lưu ${settings.aiKeyHint ?? "••••"} — nhập key mới để thay` : "sk-…"}
            onChange={(event) => setApiKey(event.target.value)}
            className="w-full text-sm px-3 py-2.5 rounded-xl"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <p className="text-[11px] mt-2" style={{ color: "var(--text-3)" }}>
            Key được mã hoá AES-256-GCM trên máy chủ; giao diện chỉ thấy lại 4 ký tự cuối.
          </p>

          {!settings.keyStorageReady ? (
            <p className="text-xs mt-3 px-3.5 py-3 rounded-2xl" role="alert" style={{ background: "var(--amber-bg)", color: "var(--amber)" }}>
              Máy chủ chưa đặt biến LIFEOS_SETTINGS_SECRET nên chưa lưu được key. Đặt biến này rồi khởi động lại API.
            </p>
          ) : null}

          {notice ? (
            <p
              className="text-xs mt-3 px-3.5 py-3 rounded-2xl"
              role="status"
              style={
                notice.tone === "ok"
                  ? { background: "var(--green-bg)", color: "var(--green)" }
                  : { background: "var(--red-bg)", color: "var(--red)" }
              }
            >
              {notice.text}
            </p>
          ) : null}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(apiKey.trim() === "" ? {} : { aiApiKey: apiKey.trim() })}
              className="text-sm font-bold px-4 py-2.5 rounded-xl"
              style={{ background: "var(--text)", color: "var(--card)", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Đang lưu…" : "Lưu cài đặt"}
            </button>
            {settings.aiKeySet ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void save({ aiApiKey: null })}
                className="text-sm font-semibold px-4 py-2.5 rounded-xl"
                style={{ background: "var(--bg-2)", color: "var(--red)", border: "1px solid var(--border)" }}
              >
                Xoá key
              </button>
            ) : null}
          </div>
        </div>

        <p className="text-[10px] font-extrabold tracking-widest mb-2" style={{ color: "var(--text-3)" }}>SỐ LIỆU HỆ THỐNG</p>
        <div className="rounded-2xl p-4" style={CARD}>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-xl px-3 py-2.5" style={{ background: "var(--bg-2)" }}>
                <p className="text-[10px] font-bold tracking-widest mb-0.5" style={{ color: "var(--text-3)" }}>{item.label.toUpperCase()}</p>
                <p className="text-lg font-bold" style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-3" style={{ color: "var(--text-3)" }}>
            Số liệu đếm trực tiếp từ dữ liệu của tài khoản này — không ước lượng.
          </p>
        </div>
      </div>
    </div>
  );
}
