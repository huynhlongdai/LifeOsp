import type {
  CaptureInterpretationContentV1,
  IncubatorKind,
  InterpretationCategory,
  TradeOffBucket
} from "@lifeos/domain";

export const PROMOTION_CATEGORIES = ["possibleDirections", "possibleProjects", "commitments", "ideas"] as const satisfies readonly InterpretationCategory[];

export type PromotionCandidate = {
  text: string;
  category: (typeof PROMOTION_CATEGORIES)[number];
  defaultIncubatorKind: IncubatorKind;
};

export type CandidateAssignment = TradeOffBucket | "unassigned";

export function buildPromotionCandidates(content: CaptureInterpretationContentV1): PromotionCandidate[] {
  const seen = new Set<string>();
  const candidates: PromotionCandidate[] = [];

  for (const category of PROMOTION_CATEGORIES) {
    for (const item of content[category]) {
      const text = item.text.trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      candidates.push({
        text,
        category,
        defaultIncubatorKind: defaultIncubatorKind(category)
      });
    }
  }

  return candidates;
}

export function createInitialAssignments(candidates: readonly PromotionCandidate[]): Record<string, CandidateAssignment> {
  return Object.fromEntries(candidates.map((candidate) => [candidate.text, "unassigned"]));
}

export function assignCandidate(
  assignments: Record<string, CandidateAssignment>,
  text: string,
  bucket: CandidateAssignment
): Record<string, CandidateAssignment> {
  const next = { ...assignments };
  if (bucket === "active") {
    for (const [candidateText, current] of Object.entries(next)) {
      if (current === "active") next[candidateText] = "unassigned";
    }
  }
  next[text] = bucket;
  return next;
}

export function tradeOffIsComplete(
  candidates: readonly PromotionCandidate[],
  assignments: Record<string, CandidateAssignment>
): boolean {
  if (candidates.length === 0) return false;
  let activeCount = 0;
  for (const candidate of candidates) {
    const bucket = assignments[candidate.text];
    if (!bucket || bucket === "unassigned") return false;
    if (bucket === "active") activeCount += 1;
  }
  return activeCount === 1;
}

export function activeCandidate(
  candidates: readonly PromotionCandidate[],
  assignments: Record<string, CandidateAssignment>
): PromotionCandidate | null {
  return candidates.find((candidate) => assignments[candidate.text] === "active") ?? null;
}

export function defaultDirectionAndSeason(activeText: string) {
  return {
    directionTitle: activeText,
    directionDescription: "",
    seasonTitle: `Giai đoạn: ${activeText}`,
    seasonPurpose: `Tập trung vào ${activeText} mà không giữ mọi lựa chọn ở trạng thái active.`,
    primaryFocusText: activeText
  };
}

function defaultIncubatorKind(category: PromotionCandidate["category"]): IncubatorKind {
  if (category === "ideas") return "idea";
  if (category === "possibleProjects") return "project_candidate";
  return "someday";
}
