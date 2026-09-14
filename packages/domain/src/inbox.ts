import type { CaptureId } from "./ids.js";
import type { IncubatorItemView } from "./promotion.js";

/**
 * INBOX lists what the user parked: raw captures and incubated items. It is read-only —
 * nothing here becomes a commitment without Clarity Reset.
 */
export type InboxCaptureView = {
  id: CaptureId;
  rawText: string;
  processingStatus: string;
  createdAt: string;
  hasInterpretation: boolean;
};

export type InboxView = {
  captures: InboxCaptureView[];
  incubated: IncubatorItemView[];
  counts: { captures: number; incubated: number };
};
