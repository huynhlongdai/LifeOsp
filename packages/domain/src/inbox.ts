import type { CaptureView } from "./index.js";
import type { IncubatorItemView, IncubatorKind } from "./promotion.js";

// Read models for the secondary surfaces Inbox (spec §3.1) and Incubator
// (spec §16.1). Both are facts-only lists; nothing here ranks or infers.

export const CAPTURE_LIST_DEFAULT_LIMIT = 50 as const;
export const CAPTURE_LIST_MAX_LIMIT = 200 as const;

export type CaptureListView = {
  generatedAt: string;
  items: CaptureView[];
  /** Total captures the user owns (all kinds), independent of `limit`. */
  total: number;
};

export type IncubatorListView = {
  generatedAt: string;
  /** Only status = incubated, newest first. */
  items: IncubatorItemView[];
  counts: Record<IncubatorKind, number>;
};
