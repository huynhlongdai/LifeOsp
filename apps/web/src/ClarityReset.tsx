import { useEffect, useMemo, useState } from "react";
import {
  INTERPRETATION_CATEGORIES,
  INTERPRETATION_CONFIDENCE_CLASSES,
  type CaptureInterpretationContentV1,
  type CaptureInterpretationView,
  type CaptureView,
  type InterpretationCategory,
  type InterpretationConfidenceClass,
  type NeedState
} from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";
import {
  INTERPRETATION_CATEGORY_COPY,
  NEED_STATE_OPTIONS,
  captureIdFromSearch,
  composeCaptureText,
  createEmptyInterpretation
} from "./clarity-flow";

type Stage =
  | "need"
  | "capture"
  | "saving"
  | "restoring"
  | "saved"
  | "generating"
  | "review"
  | "manual"
  | "done";

export function ClarityReset({ apiUrl }: { apiUrl: string }) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [stage, setStage] = useState<Stage>("need");
  const [need, setNeed] = useState<NeedState | null>(null);
  const [quickContext, setQuickContext] = useState("");
  const [brainDump, setBrainDump] = useState("");
  const [capture, setCapture] = useState<CaptureView | null>(null);
  const [interpretation, setInterpretation] = useState<CaptureInterpretationView | null>(null);
  const [draft, setDraft] = useState<CaptureInterpretationContentV1>(createEmptyInterpretation);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const captureId = captureIdFromSearch(window.location.search);
    if (!captureId) return;

    const controller = new AbortController();
    setStage("restoring");
    setError(null);

    api
      .getCapture(captureId, controller.signal)
      .then(async (restoredCapture) => {
        setCapture(restoredCapture);
        const latest = await api.getLatestInterpretation(captureId, controller.signal);
        if (latest) {
          setInterpretation(latest);
          setDraft(cloneContent(latest.content));
          setStage("review");
          setMessage("Đã khôi phục Brain Dump và bản làm rõ mới nhất.");
        } else {
          setStage("saved");
          setMessage("Brain Dump đã được lưu. Bạn có thể tiếp tục làm rõ.");
        }
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(
          reason instanceof ApiRequestError && reason.status === 401
            ? "Phiên LifeOS này không còn truy cập được Capture. Không tạo phiên mới để tránh nhầm ownership."
            : readableError(reason)
        );
        setStage("saved");
      });

    return () => controller.abort();
  }, [api]);

  const selectedNeed = need ? NEED_STATE_OPTIONS.find((option) => option.value === need) ?? null : null;
  const canSaveCapture = Boolean(selectedNeed && brainDump.trim().length > 0);
  const draftHasBlankItem = INTERPRETATION_CATEGORIES.some((category) =>
    draft[category].some((item) => item.text.trim().length === 0)
  );
  const draftChanged = interpretation ? JSON.stringify(draft) !== JSON.stringify(interpretation.content) : true;

  const startCapture = () => {
    if (!need) return;
    setStage("capture");
    setError(null);
  };

  const saveCapture = async () => {
    if (!selectedNeed || !canSaveCapture) return;
    setStage("saving");
    setError(null);
    setMessage(null);

    try {
      const session = await api.bootstrapSession();
      if (session.status !== "active") throw new Error("Không thể tạo phiên LifeOS để lưu Brain Dump.");

      const rawText = composeCaptureText(selectedNeed.label, quickContext, brainDump);
      const saved = await api.createCapture(rawText);
      setCapture(saved);
      window.history.replaceState({}, "", `/clarity?capture=${encodeURIComponent(saved.id)}`);
      setMessage("Brain Dump đã được lưu an toàn trước khi AI xử lý.");
      await generate(saved);
    } catch (reason) {
      setError(readableError(reason));
      setStage("capture");
    }
  };

  const generate = async (target = capture) => {
    if (!target) return;
    setStage("generating");
    setError(null);

    try {
      const generated = await api.generateInterpretation(target.id);
      setInterpretation(generated);
      setDraft(cloneContent(generated.content));
      setMessage("LifeOS đã tách các ý. Hãy sửa bất kỳ chỗ nào chưa đúng.");
      setStage("review");
    } catch (reason) {
      if (reason instanceof ApiRequestError && reason.status === 409) {
        const latest = await api.getLatestInterpretation(target.id);
        if (latest) {
          setInterpretation(latest);
          setDraft(cloneContent(latest.content));
          setMessage("Một bản làm rõ khác vừa được lưu. Đã tải bản mới nhất.");
          setStage("review");
          return;
        }
      }

      const body = reason instanceof ApiRequestError && isRecord(reason.body) ? reason.body : null;
      const manualFallback = body?.manualFallback === true;
      if (manualFallback || (reason instanceof ApiRequestError && [422, 503].includes(reason.status))) {
        setInterpretation(null);
        setDraft(createEmptyInterpretation());
        setMessage("AI chưa hoàn tất được phần làm rõ. Brain Dump vẫn đã lưu; bạn có thể tiếp tục thủ công.");
        setStage("manual");
        return;
      }

      setError(readableError(reason));
      setStage("saved");
    }
  };

  const beginManual = () => {
    setInterpretation(null);
    setDraft(createEmptyInterpretation());
    setError(null);
    setMessage("Bạn đang làm rõ thủ công. Chỉ thêm những gì bạn thực sự muốn ghi nhận.");
    setStage("manual");
  };

  const saveInterpretation = async () => {
    if (!capture || draftHasBlankItem) return;
    setError(null);

    try {
      const saved = interpretation
        ? await api.correctInterpretation(capture.id, interpretation.version, draft)
        : await api.saveManualInterpretation(capture.id, 0, draft);
      setInterpretation(saved);
      setDraft(cloneContent(saved.content));
      setMessage(
        saved.version > 1
          ? `Đã lưu chỉnh sửa thành phiên bản ${saved.version}. Capture gốc không thay đổi.`
          : "Đã lưu phần làm rõ thủ công. Capture gốc không thay đổi."
      );
      setStage("review");
    } catch (reason) {
      if (reason instanceof ApiRequestError && reason.status === 409) {
        const latest = await api.getLatestInterpretation(capture.id);
        if (latest) {
          setInterpretation(latest);
          setDraft(cloneContent(latest.content));
          setMessage("Bản làm rõ đã thay đổi ở nơi khác. Đã tải phiên bản mới nhất để tránh ghi đè.");
          setStage("review");
          return;
        }
      }
      setError(readableError(reason));
    }
  };

  const updateItem = (
    category: InterpretationCategory,
    index: number,
    patch: { text?: string; confidence?: InterpretationConfidenceClass }
  ) => {
    setDraft((current) => ({
      ...current,
      [category]: current[category].map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    }));
  };

  const addItem = (category: InterpretationCategory) => {
    setDraft((current) => ({
      ...current,
      [category]: [...current[category], { text: "", confidence: "medium" }]
    }));
  };

  const removeItem = (category: InterpretationCategory, index: number) => {
    setDraft((current) => ({
      ...current,
      [category]: current[category].filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  if (stage === "need") {
    return (
      <section className="clarity-flow" aria-labelledby="clarity-title">
        <div className="flow-intro">
          <p className="eyebrow">CLARITY RESET · 1/3</p>
          <h2 id="clarity-title">Bạn cần LifeOS giúp điều gì ngay lúc này?</h2>
          <p>Không cần có mục tiêu dài hạn. Chọn vấn đề gần với hiện tại nhất; đây không phải nhãn tính cách của bạn.</p>
        </div>
        <div className="need-grid" role="radiogroup" aria-label="Nhu cầu hiện tại">
          {NEED_STATE_OPTIONS.map((option) => (
            <button
              type="button"
              role="radio"
              aria-checked={need === option.value}
              className={need === option.value ? "need-card selected" : "need-card"}
              key={option.value}
              onClick={() => setNeed(option.value)}
            >
              <strong>{option.label}</strong>
              <span>{option.hint}</span>
            </button>
          ))}
        </div>
        <div className="flow-actions">
          <button className="primary-button" type="button" disabled={!need} onClick={startCapture}>
            Tiếp tục
          </button>
        </div>
      </section>
    );
  }

  if (stage === "capture" || stage === "saving") {
    return (
      <section className="clarity-flow" aria-labelledby="capture-title">
        <div className="flow-intro">
          <p className="eyebrow">CLARITY RESET · 2/3</p>
          <h2 id="capture-title">Đưa mọi thứ trong đầu bạn ra ngoài.</h2>
          <p>Đừng phân loại. LifeOS sẽ lưu bản gốc trước, rồi mới thử giúp bạn sắp xếp.</p>
        </div>

        {selectedNeed ? (
          <div className="selected-context">
            <span>Nhu cầu bạn vừa chọn</span>
            <strong>{selectedNeed.label}</strong>
            <button type="button" className="text-button" onClick={() => setStage("need")} disabled={stage === "saving"}>
              Đổi lựa chọn
            </button>
          </div>
        ) : null}

        <label className="field-label" htmlFor="quick-context">
          Bối cảnh hiện tại <span>tùy chọn</span>
        </label>
        <textarea
          id="quick-context"
          className="context-input"
          value={quickContext}
          onChange={(event) => setQuickContext(event.target.value)}
          placeholder="Ví dụ: hôm nay tôi chỉ có khoảng một giờ; có một việc gia đình cần ưu tiên..."
          rows={3}
          disabled={stage === "saving"}
        />

        <label className="field-label" htmlFor="brain-dump">Brain Dump</label>
        <textarea
          id="brain-dump"
          className="brain-dump-input"
          value={brainDump}
          onChange={(event) => setBrainDump(event.target.value)}
          placeholder="Viết tất cả những gì đang chiếm đầu óc bạn. Không cần thứ tự, không cần viết hay."
          rows={10}
          autoFocus
          disabled={stage === "saving"}
        />

        {error ? <InlineError message={error} /> : null}
        <div className="save-first-note">Capture được lưu trước. AI lỗi cũng không làm mất nội dung này.</div>
        <div className="flow-actions">
          <button className="primary-button" type="button" disabled={!canSaveCapture || stage === "saving"} onClick={saveCapture}>
            {stage === "saving" ? "Đang lưu..." : "Lưu Brain Dump"}
          </button>
        </div>
      </section>
    );
  }

  if (stage === "restoring") {
    return <FlowStatus title="Đang khôi phục Brain Dump..." detail="Đọc dữ liệu đã lưu từ LifeOS." />;
  }

  if (stage === "generating") {
    return (
      <section className="clarity-flow">
        <SavedCapture capture={capture} />
        <FlowStatus title="Đang làm rõ những gì bạn đã viết..." detail="Capture đã được lưu. Bạn có thể rời trang mà không mất bản gốc." />
      </section>
    );
  }

  if (stage === "saved") {
    return (
      <section className="clarity-flow">
        <SavedCapture capture={capture} />
        {message ? <InlineNotice message={message} /> : null}
        {error ? <InlineError message={error} /> : null}
        {capture ? (
          <div className="recovery-actions">
            <button className="primary-button" type="button" onClick={() => generate()}>
              Thử làm rõ bằng AI
            </button>
            <button className="secondary-button" type="button" onClick={beginManual}>
              Tiếp tục thủ công
            </button>
          </div>
        ) : (
          <a className="secondary-button link-button" href="/clarity">Bắt đầu Clarity Reset mới</a>
        )}
      </section>
    );
  }

  if (stage === "review" || stage === "manual") {
    return (
      <section className="clarity-flow" aria-labelledby="review-title">
        <div className="flow-intro">
          <p className="eyebrow">CLARITY RESET · 3/3</p>
          <h2 id="review-title">Kiểm tra xem LifeOS hiểu đúng chưa.</h2>
          <p>
            Đây là bản làm rõ có thể sửa. Không mục nào tự trở thành Direction, Project hay Action ở bước này.
          </p>
        </div>
        <SavedCapture capture={capture} compact />
        {message ? <InlineNotice message={message} /> : null}
        {error ? <InlineError message={error} /> : null}

        <div className="interpretation-stack">
          {INTERPRETATION_CATEGORIES.map((category) => (
            <InterpretationGroup
              key={category}
              category={category}
              content={draft}
              onUpdate={updateItem}
              onAdd={addItem}
              onRemove={removeItem}
            />
          ))}
        </div>

        {draftHasBlankItem ? <InlineError message="Hoàn tất hoặc xóa các mục đang để trống trước khi lưu." /> : null}
        <div className="flow-actions split-actions">
          {stage === "review" && interpretation && !draftChanged ? (
            <button className="primary-button" type="button" onClick={() => setStage("done")}>
              Phần làm rõ này đúng
            </button>
          ) : (
            <button className="primary-button" type="button" disabled={draftHasBlankItem} onClick={saveInterpretation}>
              {interpretation ? "Lưu chỉnh sửa" : "Lưu phần làm rõ thủ công"}
            </button>
          )}
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              if (interpretation) setDraft(cloneContent(interpretation.content));
              else setDraft(createEmptyInterpretation());
            }}
          >
            Hoàn tác thay đổi
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="clarity-flow clarity-done">
      <p className="eyebrow">CLARITY RESET · COMPLETE</p>
      <h2>Phần làm rõ đã sẵn sàng.</h2>
      <p>
        Brain Dump gốc vẫn được giữ nguyên. Bước tiếp theo của Vertical Slice A sẽ là chọn Active / Maintain / Not Now trước khi xác nhận Direction.
      </p>
      <SavedCapture capture={capture} compact />
      <div className="flow-actions">
        <a className="primary-button link-button" href="/">Về NOW</a>
      </div>
    </section>
  );
}

function InterpretationGroup({
  category,
  content,
  onUpdate,
  onAdd,
  onRemove
}: {
  category: InterpretationCategory;
  content: CaptureInterpretationContentV1;
  onUpdate: (
    category: InterpretationCategory,
    index: number,
    patch: { text?: string; confidence?: InterpretationConfidenceClass }
  ) => void;
  onAdd: (category: InterpretationCategory) => void;
  onRemove: (category: InterpretationCategory, index: number) => void;
}) {
  const copy = INTERPRETATION_CATEGORY_COPY[category];
  const items = content[category];

  return (
    <section className="interpretation-group">
      <div className="group-heading">
        <div>
          <h3>{copy.label}</h3>
          <span>{items.length} mục</span>
        </div>
        <button className="text-button" type="button" onClick={() => onAdd(category)}>+ Thêm</button>
      </div>
      {items.length === 0 ? <p className="group-empty">{copy.empty}</p> : null}
      {items.map((item, index) => (
        <div className="interpretation-item" key={`${category}-${index}`}>
          <div className="item-fields">
            <label>
              <span className="sr-only">Nội dung</span>
              <input
                value={item.text}
                onChange={(event) => onUpdate(category, index, { text: event.target.value })}
                placeholder="Viết lại theo cách đúng với bạn"
              />
            </label>
            <label className="confidence-field">
              <span className="sr-only">Mức chắc chắn</span>
              <select
                value={item.confidence}
                onChange={(event) =>
                  onUpdate(category, index, {
                    confidence: event.target.value as InterpretationConfidenceClass
                  })
                }
              >
                {INTERPRETATION_CONFIDENCE_CLASSES.map((confidence) => (
                  <option value={confidence} key={confidence}>
                    {confidence === "high" ? "Rõ" : confidence === "medium" ? "Có thể" : "Chưa chắc"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {item.sourceExcerpt ? <blockquote className="source-excerpt">“{item.sourceExcerpt}”</blockquote> : null}
          <button className="remove-button" type="button" onClick={() => onRemove(category, index)} aria-label={`Xóa mục ${index + 1} khỏi ${copy.label}`}>
            Xóa
          </button>
        </div>
      ))}
    </section>
  );
}

function SavedCapture({ capture, compact = false }: { capture: CaptureView | null; compact?: boolean }) {
  if (!capture) return null;
  return (
    <details className={compact ? "saved-capture compact" : "saved-capture"} open={!compact}>
      <summary>
        <span>Brain Dump gốc</span>
        <span className="saved-badge">Đã lưu</span>
      </summary>
      <pre>{capture.rawText}</pre>
      <small>Đây là bản gốc bất biến. Chỉnh sửa phần làm rõ không thay đổi nội dung này.</small>
    </details>
  );
}

function FlowStatus({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flow-status" role="status" aria-live="polite">
      <span className="status-pulse" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function InlineNotice({ message }: { message: string }) {
  return <div className="inline-notice" role="status">{message}</div>;
}

function InlineError({ message }: { message: string }) {
  return <div className="inline-error" role="alert">{message}</div>;
}

function cloneContent(content: CaptureInterpretationContentV1): CaptureInterpretationContentV1 {
  return {
    concerns: content.concerns.map((item) => ({ ...item })),
    ideas: content.ideas.map((item) => ({ ...item })),
    commitments: content.commitments.map((item) => ({ ...item })),
    possibleProjects: content.possibleProjects.map((item) => ({ ...item })),
    possibleDirections: content.possibleDirections.map((item) => ({ ...item })),
    questions: content.questions.map((item) => ({ ...item })),
    uncertainties: content.uncertainties.map((item) => ({ ...item }))
  };
}

function readableError(reason: unknown): string {
  if (reason instanceof ApiRequestError) return reason.message;
  return reason instanceof Error ? reason.message : "Có lỗi xảy ra. Dữ liệu đã lưu vẫn được giữ nguyên.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
