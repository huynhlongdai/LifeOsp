import { useMemo, useState } from "react";
import type {
  CaptureInterpretationView,
  CaptureView,
  ClarityPromotionDraftView,
  CurrentDirectionView,
  IncubatorKind,
  TradeOffBucket
} from "@lifeos/domain";
import { ApiRequestError, createApiClient } from "./api";
import {
  activeCandidate,
  assignCandidate,
  buildPromotionCandidates,
  createInitialAssignments,
  defaultDirectionAndSeason,
  tradeOffIsComplete,
  type CandidateAssignment,
  type PromotionCandidate
} from "./clarity-promotion";

type Stage = "tradeoff" | "preparing" | "review" | "confirming" | "confirmed" | "resolved";

const BUCKET_COPY: Record<TradeOffBucket, { label: string; hint: string }> = {
  active: { label: "ACTIVE", hint: "Đây là hướng bạn muốn thực sự đẩy tới trong giai đoạn này." },
  maintain: { label: "MAINTAIN", hint: "Giữ ổn định, không biến thành ưu tiên tăng trưởng chính." },
  not_now: { label: "NOT NOW", hint: "Giữ an toàn trong Incubator để không tranh sự chú ý hiện tại." }
};

const KIND_COPY: Record<IncubatorKind, string> = {
  idea: "Ý tưởng",
  project_candidate: "Ứng viên dự án",
  someday: "Để sau",
  reference: "Tham khảo"
};

export function ClarityPromotion({
  apiUrl,
  capture,
  interpretation,
  onBack
}: {
  apiUrl: string;
  capture: CaptureView;
  interpretation: CaptureInterpretationView;
  onBack: () => void;
}) {
  const api = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const candidates = useMemo(() => buildPromotionCandidates(interpretation.content), [interpretation.content]);
  const [stage, setStage] = useState<Stage>("tradeoff");
  const [assignments, setAssignments] = useState<Record<string, CandidateAssignment>>(() =>
    createInitialAssignments(candidates)
  );
  const [incubatorKinds, setIncubatorKinds] = useState<Record<string, IncubatorKind>>(() =>
    Object.fromEntries(candidates.map((candidate) => [candidate.text, candidate.defaultIncubatorKind]))
  );
  const [directionTitle, setDirectionTitle] = useState("");
  const [directionDescription, setDirectionDescription] = useState("");
  const [seasonTitle, setSeasonTitle] = useState("");
  const [seasonPurpose, setSeasonPurpose] = useState("");
  const [primaryFocusText, setPrimaryFocusText] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [targetEndsOn, setTargetEndsOn] = useState("");
  const [prepared, setPrepared] = useState<ClarityPromotionDraftView | null>(null);
  const [confirmed, setConfirmed] = useState<CurrentDirectionView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = activeCandidate(candidates, assignments);
  const complete = tradeOffIsComplete(candidates, assignments);
  const notNow = candidates.filter((candidate) => assignments[candidate.text] === "not_now");
  const maintain = candidates.filter((candidate) => assignments[candidate.text] === "maintain");
  const formComplete =
    directionTitle.trim().length > 0 && seasonTitle.trim().length > 0 && seasonPurpose.trim().length > 0;

  const chooseBucket = (candidate: PromotionCandidate, bucket: TradeOffBucket) => {
    setAssignments((current) => assignCandidate(current, candidate.text, bucket));
    setError(null);
    if (bucket === "active") {
      const defaults = defaultDirectionAndSeason(candidate.text);
      setDirectionTitle(defaults.directionTitle);
      setDirectionDescription(defaults.directionDescription);
      setSeasonTitle(defaults.seasonTitle);
      setSeasonPurpose(defaults.seasonPurpose);
      setPrimaryFocusText(defaults.primaryFocusText);
    }
  };

  const prepareDraft = async () => {
    if (!active || !complete || !formComplete) return;
    setStage("preparing");
    setError(null);
    setMessage(null);

    try {
      const result = await api.prepareClarityPromotion(capture.id, {
        interpretationVersion: interpretation.version,
        activeText: active.text,
        maintainTexts: maintain.map((candidate) => candidate.text),
        notNowItems: notNow.map((candidate) => ({
          text: candidate.text,
          kind: incubatorKinds[candidate.text] ?? candidate.defaultIncubatorKind
        })),
        direction: {
          title: directionTitle.trim(),
          ...(directionDescription.trim() ? { description: directionDescription.trim() } : {})
        },
        season: {
          title: seasonTitle.trim(),
          purpose: seasonPurpose.trim(),
          ...(primaryFocusText.trim() ? { primaryFocusText: primaryFocusText.trim() } : {}),
          ...(startsOn ? { startsOn } : {}),
          ...(targetEndsOn ? { targetEndsOn } : {})
        }
      });
      setPrepared(result);
      setMessage("Đã tạo bản nháp. Direction và Current Season vẫn chưa active cho tới khi bạn xác nhận.");
      setStage("review");
    } catch (reason) {
      setError(readableError(reason));
      setStage("tradeoff");
    }
  };

  const confirmDraft = async () => {
    if (!prepared || !formComplete) return;
    setStage("confirming");
    setError(null);

    try {
      const result = await api.confirmClarityPromotion(prepared.recommendationId, {
        direction: {
          title: directionTitle.trim(),
          ...(directionDescription.trim() ? { description: directionDescription.trim() } : {})
        },
        season: {
          title: seasonTitle.trim(),
          purpose: seasonPurpose.trim(),
          ...(primaryFocusText.trim() ? { primaryFocusText: primaryFocusText.trim() } : {}),
          ...(startsOn ? { startsOn } : {}),
          ...(targetEndsOn ? { targetEndsOn } : {})
        },
        notNowItems: notNow.map((candidate) => ({
          text: candidate.text,
          kind: incubatorKinds[candidate.text] ?? candidate.defaultIncubatorKind
        }))
      });
      setConfirmed({ direction: result.direction, season: result.season });
      setMessage(
        result.incubatorItems.length > 0
          ? `Đã xác nhận Current Season và bảo vệ ${result.incubatorItems.length} mục trong Not Now.`
          : "Đã xác nhận Direction và Current Season."
      );
      setStage("confirmed");
    } catch (reason) {
      setError(readableError(reason));
      setStage("review");
    }
  };

  const resolveDraft = async (resolution: "reject" | "not_now") => {
    if (!prepared) return;
    setError(null);
    try {
      const result =
        resolution === "reject"
          ? await api.rejectClarityPromotion(prepared.recommendationId)
          : await api.deferClarityPromotion(prepared.recommendationId);
      setMessage(
        result.status === "not_now"
          ? "Đã đưa hướng này vào Not Now. Bạn không cần giữ nó trong đầu như một ưu tiên hiện tại."
          : "Đã từ chối bản nháp. Capture và interpretation vẫn còn để bạn chọn hướng khác."
      );
      setStage("resolved");
    } catch (reason) {
      setError(readableError(reason));
    }
  };

  if (candidates.length === 0) {
    return (
      <section className="clarity-flow">
        <p className="eyebrow">CLARITY RESET · TRADE-OFF</p>
        <h2>Chưa có ứng viên nào để chọn làm hướng hiện tại.</h2>
        <p>
          LifeOS không biến concern, question hay uncertainty thành commitment. Quay lại phần làm rõ và thêm một ý tưởng,
          cam kết, ứng viên dự án hoặc hướng có thể cân nhắc nếu phù hợp.
        </p>
        <button type="button" className="secondary-button" onClick={onBack}>Quay lại phần làm rõ</button>
      </section>
    );
  }

  if (stage === "confirmed" && confirmed) {
    return (
      <section className="clarity-flow clarity-done">
        <p className="eyebrow">CURRENT SEASON · CONFIRMED</p>
        <h2>{confirmed.direction.title}</h2>
        {confirmed.direction.description ? <p>{confirmed.direction.description}</p> : null}
        <div className="promotion-summary-grid">
          <article className="promotion-summary-card">
            <span>DIRECTION</span>
            <strong>{confirmed.direction.title}</strong>
            <small>Đã được bạn xác nhận.</small>
          </article>
          <article className="promotion-summary-card">
            <span>CURRENT SEASON</span>
            <strong>{confirmed.season.title}</strong>
            <small>{confirmed.season.purpose}</small>
          </article>
        </div>
        {message ? <InlineNotice message={message} /> : null}
        <div className="flow-actions">
          <a className="primary-button link-button" href="/direction">Xem DIRECTION</a>
          <a className="secondary-button link-button" href="/">Về NOW</a>
        </div>
      </section>
    );
  }

  if (stage === "resolved") {
    return (
      <section className="clarity-flow clarity-done">
        <p className="eyebrow">CLARITY RESET · RESOLVED</p>
        <h2>Không cần ép một Direction thành active.</h2>
        {message ? <InlineNotice message={message} /> : null}
        <div className="flow-actions">
          <a className="primary-button link-button" href="/clarity">Clarity Reset mới</a>
          <a className="secondary-button link-button" href="/">Về NOW</a>
        </div>
      </section>
    );
  }

  if (stage === "review" || stage === "confirming") {
    return (
      <section className="clarity-flow" aria-labelledby="promotion-review-title">
        <div className="flow-intro">
          <p className="eyebrow">CLARITY RESET · CONFIRM</p>
          <h2 id="promotion-review-title">Kiểm tra Direction và Current Season trước khi active.</h2>
          <p>Đây là draft. Bạn có thể sửa, đưa cả hướng vào Not Now hoặc từ chối hoàn toàn.</p>
        </div>

        {message ? <InlineNotice message={message} /> : null}
        {error ? <InlineError message={error} /> : null}

        <div className="why-card">
          <p className="eyebrow">WHY THIS DRAFT</p>
          <strong>Bạn vừa chọn “{active?.text}” là Active.</strong>
          <p>
            {maintain.length} mục được giữ ở Maintain · {notNow.length} mục được bảo vệ ở Not Now. Đây là bằng chứng trực
            tiếp từ lựa chọn của bạn, không phải chẩn đoán hay quyết định ẩn của AI.
          </p>
        </div>

        <DirectionSeasonFields
          directionTitle={directionTitle}
          directionDescription={directionDescription}
          seasonTitle={seasonTitle}
          seasonPurpose={seasonPurpose}
          primaryFocusText={primaryFocusText}
          startsOn={startsOn}
          targetEndsOn={targetEndsOn}
          disabled={stage === "confirming"}
          onDirectionTitle={setDirectionTitle}
          onDirectionDescription={setDirectionDescription}
          onSeasonTitle={setSeasonTitle}
          onSeasonPurpose={setSeasonPurpose}
          onPrimaryFocusText={setPrimaryFocusText}
          onStartsOn={setStartsOn}
          onTargetEndsOn={setTargetEndsOn}
        />

        <div className="promotion-review-lanes">
          <TradeOffLane title="ACTIVE" items={active ? [active] : []} />
          <TradeOffLane title="MAINTAIN" items={maintain} />
          <TradeOffLane title="NOT NOW" items={notNow} />
        </div>

        <div className="flow-actions promotion-confirm-actions">
          <button className="primary-button" type="button" disabled={!formComplete || stage === "confirming"} onClick={confirmDraft}>
            {stage === "confirming" ? "Đang xác nhận..." : "Xác nhận Direction & Current Season"}
          </button>
          <button className="secondary-button" type="button" disabled={stage === "confirming"} onClick={() => resolveDraft("not_now")}>
            Đưa cả hướng vào Not Now
          </button>
          <button className="text-button danger-text" type="button" disabled={stage === "confirming"} onClick={() => resolveDraft("reject")}>
            Bản nháp này không đúng
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="clarity-flow" aria-labelledby="tradeoff-title">
      <div className="flow-intro">
        <p className="eyebrow">CLARITY RESET · TRADE-OFF</p>
        <h2 id="tradeoff-title">Không phải mọi thứ đều được Active cùng lúc.</h2>
        <p>
          Phân loại từng ứng viên. LifeOS không chọn sẵn. Để tiếp tục, bạn cần đúng một Active; những mục còn lại phải được
          giữ ở Maintain hoặc Not Now.
        </p>
      </div>

      {error ? <InlineError message={error} /> : null}

      <div className="tradeoff-list">
        {candidates.map((candidate) => {
          const assignment = assignments[candidate.text] ?? "unassigned";
          return (
            <article className="tradeoff-card" key={candidate.text}>
              <div className="tradeoff-copy">
                <span>{categoryLabel(candidate.category)}</span>
                <strong>{candidate.text}</strong>
              </div>
              <div className="bucket-buttons" aria-label={`Phân loại ${candidate.text}`}>
                {(Object.keys(BUCKET_COPY) as TradeOffBucket[]).map((bucket) => (
                  <button
                    type="button"
                    key={bucket}
                    className={assignment === bucket ? `bucket-button selected ${bucket}` : "bucket-button"}
                    aria-pressed={assignment === bucket}
                    title={BUCKET_COPY[bucket].hint}
                    onClick={() => chooseBucket(candidate, bucket)}
                  >
                    {BUCKET_COPY[bucket].label}
                  </button>
                ))}
              </div>
              {assignment === "not_now" ? (
                <label className="incubator-kind-field">
                  Giữ dưới dạng
                  <select
                    value={incubatorKinds[candidate.text] ?? candidate.defaultIncubatorKind}
                    onChange={(event) =>
                      setIncubatorKinds((current) => ({ ...current, [candidate.text]: event.target.value as IncubatorKind }))
                    }
                  >
                    {(Object.keys(KIND_COPY) as IncubatorKind[]).map((kind) => (
                      <option value={kind} key={kind}>{KIND_COPY[kind]}</option>
                    ))}
                  </select>
                </label>
              ) : null}
            </article>
          );
        })}
      </div>

      {!complete ? (
        <div className="save-first-note">Chưa xong: phân loại tất cả ứng viên và giữ đúng một mục ở ACTIVE.</div>
      ) : null}

      {active ? (
        <div className="promotion-form-block">
          <p className="eyebrow">DRAFT FROM YOUR ACTIVE CHOICE</p>
          <p>LifeOS chỉ dùng lựa chọn Active của bạn để khởi tạo text có thể sửa. Chưa có gì được activate ở bước này.</p>
          <DirectionSeasonFields
            directionTitle={directionTitle}
            directionDescription={directionDescription}
            seasonTitle={seasonTitle}
            seasonPurpose={seasonPurpose}
            primaryFocusText={primaryFocusText}
            startsOn={startsOn}
            targetEndsOn={targetEndsOn}
            disabled={stage === "preparing"}
            onDirectionTitle={setDirectionTitle}
            onDirectionDescription={setDirectionDescription}
            onSeasonTitle={setSeasonTitle}
            onSeasonPurpose={setSeasonPurpose}
            onPrimaryFocusText={setPrimaryFocusText}
            onStartsOn={setStartsOn}
            onTargetEndsOn={setTargetEndsOn}
          />
        </div>
      ) : null}

      <div className="flow-actions split-actions">
        <button className="primary-button" type="button" disabled={!complete || !formComplete || stage === "preparing"} onClick={prepareDraft}>
          {stage === "preparing" ? "Đang tạo bản nháp..." : "Review Direction & Current Season"}
        </button>
        <button className="secondary-button" type="button" disabled={stage === "preparing"} onClick={onBack}>
          Quay lại interpretation
        </button>
      </div>
    </section>
  );
}

function DirectionSeasonFields({
  directionTitle,
  directionDescription,
  seasonTitle,
  seasonPurpose,
  primaryFocusText,
  startsOn,
  targetEndsOn,
  disabled,
  onDirectionTitle,
  onDirectionDescription,
  onSeasonTitle,
  onSeasonPurpose,
  onPrimaryFocusText,
  onStartsOn,
  onTargetEndsOn
}: {
  directionTitle: string;
  directionDescription: string;
  seasonTitle: string;
  seasonPurpose: string;
  primaryFocusText: string;
  startsOn: string;
  targetEndsOn: string;
  disabled: boolean;
  onDirectionTitle: (value: string) => void;
  onDirectionDescription: (value: string) => void;
  onSeasonTitle: (value: string) => void;
  onSeasonPurpose: (value: string) => void;
  onPrimaryFocusText: (value: string) => void;
  onStartsOn: (value: string) => void;
  onTargetEndsOn: (value: string) => void;
}) {
  return (
    <div className="direction-season-form">
      <div className="form-section">
        <p className="eyebrow">DIRECTION</p>
        <label className="field-label">
          Tên hướng hiện tại
          <input value={directionTitle} disabled={disabled} onChange={(event) => onDirectionTitle(event.target.value)} />
        </label>
        <label className="field-label">
          Mô tả <span>tùy chọn</span>
          <textarea rows={3} value={directionDescription} disabled={disabled} onChange={(event) => onDirectionDescription(event.target.value)} />
        </label>
      </div>
      <div className="form-section">
        <p className="eyebrow">CURRENT SEASON</p>
        <label className="field-label">
          Tên giai đoạn
          <input value={seasonTitle} disabled={disabled} onChange={(event) => onSeasonTitle(event.target.value)} />
        </label>
        <label className="field-label">
          Nếu giai đoạn này thành công, điều gì phải trở thành sự thật?
          <textarea rows={3} value={seasonPurpose} disabled={disabled} onChange={(event) => onSeasonPurpose(event.target.value)} />
        </label>
        <label className="field-label">
          Primary focus <span>tùy chọn</span>
          <input value={primaryFocusText} disabled={disabled} onChange={(event) => onPrimaryFocusText(event.target.value)} />
        </label>
        <div className="date-grid">
          <label className="field-label">
            Bắt đầu <span>tùy chọn</span>
            <input type="date" value={startsOn} disabled={disabled} onChange={(event) => onStartsOn(event.target.value)} />
          </label>
          <label className="field-label">
            Dự kiến kết thúc <span>tùy chọn</span>
            <input type="date" min={startsOn || undefined} value={targetEndsOn} disabled={disabled} onChange={(event) => onTargetEndsOn(event.target.value)} />
          </label>
        </div>
      </div>
    </div>
  );
}

function TradeOffLane({ title, items }: { title: string; items: PromotionCandidate[] }) {
  return (
    <article className="tradeoff-lane">
      <span>{title}</span>
      {items.length ? items.map((item) => <strong key={item.text}>{item.text}</strong>) : <small>Không có mục nào.</small>}
    </article>
  );
}

function categoryLabel(category: PromotionCandidate["category"]): string {
  if (category === "possibleDirections") return "Hướng có thể cân nhắc";
  if (category === "possibleProjects") return "Ứng viên dự án";
  if (category === "commitments") return "Cam kết";
  return "Ý tưởng";
}

function InlineNotice({ message }: { message: string }) {
  return <div className="inline-notice" role="status">{message}</div>;
}

function InlineError({ message }: { message: string }) {
  return <div className="inline-error" role="alert">{message}</div>;
}

function readableError(reason: unknown): string {
  if (reason instanceof ApiRequestError) {
    if (reason.status === 409 && isRecord(reason.body) && reason.body.error === "active_season_conflict") {
      return "Bạn đã có một Current Season đang active. LifeOS sẽ không âm thầm thay thế nó; hãy thay đổi Direction có chủ ý trước.";
    }
    return reason.message;
  }
  return reason instanceof Error ? reason.message : "Không thể hoàn tất thay đổi này.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
