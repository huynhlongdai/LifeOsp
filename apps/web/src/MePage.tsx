import { useEffect, useMemo, useState } from "react";
import type { MeOverviewView, MeUnavailableSection } from "@lifeos/domain";
import { createApiClient } from "./api";
import { createMeApiClient } from "./me-api";
import { EmptyState, ErrorState, type AsyncState } from "./ui-states";

// ME overview (spec §14.1). V0 is intentionally read-only and shows only
// "Current personal context" with real data. Operating Preferences (§14.2),
// Pattern Candidates (§14.3) and Personalization status (§14.4) need a
// preference/pattern-candidate model that doesn't exist yet — named here
// honestly instead of faked, per the "no fabricated confidence" rule.

const SECTION_COPY: Record<MeUnavailableSection, { title: string; body: string }> = {
  operatingPreferences: {
    title: "Cách LifeOS làm việc với bạn",
    body: "Sẽ hiện ở đây khi LifeOS bắt đầu ghi nhận sở thích của bạn (thời lượng Action ưa thích, khung giờ, ràng buộc gợi ý) — mỗi điều đều có nguồn gốc rõ ràng và bạn sửa/xoá được."
  },
  patternCandidates: {
    title: "Điều LifeOS nhận thấy",
    body: "Khi có đủ dữ liệu, LifeOS sẽ đề xuất những điều nó nhận thấy để bạn xác nhận, xác nhận một phần, hoặc từ chối — chưa có gì được suy luận ở bản này."
  },
  personalizationStatus: {
    title: "LifeOS đang dùng gì để cá nhân hoá",
    body: "Sẽ giải thích rõ điều gì đang được dùng, điều gì mới là tạm thời, điều gì đang tắt — khi các phần trên có dữ liệu thật."
  },
  dataSources: {
    title: "Nguồn dữ liệu & liên kết",
    body: "Chưa có tích hợp bên ngoài nào ở bản này."
  }
};

export function MePage({ apiUrl }: { apiUrl: string }) {
  const meApi = useMemo(() => createMeApiClient(apiUrl), [apiUrl]);
  const sessionApi = useMemo(() => createApiClient(apiUrl), [apiUrl]);
  const [state, setState] = useState<AsyncState<MeOverviewView>>({ kind: "loading" });

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
