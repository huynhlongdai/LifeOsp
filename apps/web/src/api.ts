import {
  CAPTURE_INTERPRETATION_CONTRACT_ID,
  CAPTURE_INTERPRETATION_CONTRACT_VERSION,
  CAPTURE_PROCESSING_STATUSES,
  DIRECTION_STATUSES,
  INCUBATOR_KINDS,
  INCUBATOR_STATUSES,
  INTERPRETATION_CATEGORIES,
  INTERPRETATION_CONFIDENCE_CLASSES,
  RECOMMENDATION_STATUSES,
  SEASON_STATUSES,
  type CaptureInterpretationContentV1,
  type CaptureInterpretationView,
  type CaptureView,
  type ClarityPromotionDraftInput,
  type ClarityPromotionDraftView,
  type CurrentDirectionView,
  type DirectionView,
  type HealthStatus,
  type IncubatorItemView,
  type SeasonView,
  type SessionView
} from "@lifeos/domain";

export type InterpretationFailure = {
  error: string;
  message: string;
  manualFallback?: boolean;
  validationErrors?: string[];
  latestVersion?: number;
};

export type FinalPromotionInput = Pick<ClarityPromotionDraftInput, "direction" | "season" | "notNowItems">;

export type PromotionConfirmedView = CurrentDirectionView & {
  incubatorItems: IncubatorItemView[];
};

export type PromotionResolutionView = {
  status: "rejected" | "not_now";
  incubatorItem?: IncubatorItemView;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    const message =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : `API request failed with status ${status}`;
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}

export type ApiClient = {
  getHealth(signal?: AbortSignal): Promise<HealthStatus>;
  bootstrapSession(signal?: AbortSignal): Promise<SessionView>;
  createCapture(rawText: string, signal?: AbortSignal): Promise<CaptureView>;
  getCapture(captureId: string, signal?: AbortSignal): Promise<CaptureView>;
  generateInterpretation(captureId: string, signal?: AbortSignal): Promise<CaptureInterpretationView>;
  getLatestInterpretation(captureId: string, signal?: AbortSignal): Promise<CaptureInterpretationView | null>;
  saveManualInterpretation(
    captureId: string,
    baseVersion: number,
    content: CaptureInterpretationContentV1,
    signal?: AbortSignal
  ): Promise<CaptureInterpretationView>;
  correctInterpretation(
    captureId: string,
    baseVersion: number,
    content: CaptureInterpretationContentV1,
    signal?: AbortSignal
  ): Promise<CaptureInterpretationView>;
  prepareClarityPromotion(
    captureId: string,
    input: ClarityPromotionDraftInput,
    signal?: AbortSignal
  ): Promise<ClarityPromotionDraftView>;
  confirmClarityPromotion(
    recommendationId: string,
    input: FinalPromotionInput,
    signal?: AbortSignal
  ): Promise<PromotionConfirmedView>;
  rejectClarityPromotion(recommendationId: string, signal?: AbortSignal): Promise<PromotionResolutionView>;
  deferClarityPromotion(recommendationId: string, signal?: AbortSignal): Promise<PromotionResolutionView>;
  getCurrentDirection(signal?: AbortSignal): Promise<CurrentDirectionView | null>;
};

export function createApiClient(baseUrl = ""): ApiClient {
  const request = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers
      }
    });
    const body: unknown = await response.json();
    if (!response.ok) throw new ApiRequestError(response.status, body);
    return body;
  };

  return {
    async getHealth(signal?: AbortSignal): Promise<HealthStatus> {
      const value = await request("/health", signal ? { signal } : {});
      if (!isHealthStatus(value)) {
        throw new Error("API health response does not match the LifeOS contract");
      }
      return value;
    },

    async bootstrapSession(signal?: AbortSignal): Promise<SessionView> {
      const value = await request("/v1/session/bootstrap", {
        method: "POST",
        ...(signal ? { signal } : {})
      });
      if (!isSessionView(value)) throw new Error("Session response does not match the LifeOS contract");
      return value;
    },

    async createCapture(rawText: string, signal?: AbortSignal): Promise<CaptureView> {
      const value = await request("/v1/captures", {
        method: "POST",
        body: JSON.stringify({ rawText }),
        ...(signal ? { signal } : {})
      });
      if (!isCaptureView(value)) throw new Error("Capture response does not match the LifeOS contract");
      return value;
    },

    async getCapture(captureId: string, signal?: AbortSignal): Promise<CaptureView> {
      const value = await request(`/v1/captures/${encodeURIComponent(captureId)}`, signal ? { signal } : {});
      if (!isCaptureView(value)) throw new Error("Capture response does not match the LifeOS contract");
      return value;
    },

    async generateInterpretation(captureId: string, signal?: AbortSignal): Promise<CaptureInterpretationView> {
      const value = await request(
        `/v1/captures/${encodeURIComponent(captureId)}/interpretations/generate`,
        { method: "POST", ...(signal ? { signal } : {}) }
      );
      if (!isInterpretationView(value)) {
        throw new Error("Interpretation response does not match the LifeOS contract");
      }
      return value;
    },

    async getLatestInterpretation(
      captureId: string,
      signal?: AbortSignal
    ): Promise<CaptureInterpretationView | null> {
      try {
        const value = await request(
          `/v1/captures/${encodeURIComponent(captureId)}/interpretations/latest`,
          signal ? { signal } : {}
        );
        if (!isInterpretationView(value)) {
          throw new Error("Interpretation response does not match the LifeOS contract");
        }
        return value;
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) return null;
        throw error;
      }
    },

    async saveManualInterpretation(captureId, baseVersion, content, signal) {
      return writeUserInterpretation(request, "manual", captureId, baseVersion, content, signal);
    },

    async correctInterpretation(captureId, baseVersion, content, signal) {
      return writeUserInterpretation(request, "correct", captureId, baseVersion, content, signal);
    },

    async prepareClarityPromotion(captureId, input, signal) {
      const value = await request(`/v1/captures/${encodeURIComponent(captureId)}/promotion/prepare`, {
        method: "POST",
        body: JSON.stringify(input),
        ...(signal ? { signal } : {})
      });
      if (!isClarityPromotionDraftView(value)) {
        throw new Error("Clarity promotion response does not match the LifeOS contract");
      }
      return value;
    },

    async confirmClarityPromotion(recommendationId, input, signal) {
      const value = await request(`/v1/clarity-promotions/${encodeURIComponent(recommendationId)}/confirm`, {
        method: "POST",
        body: JSON.stringify(input),
        ...(signal ? { signal } : {})
      });
      if (!isPromotionConfirmedView(value)) {
        throw new Error("Confirmed Direction response does not match the LifeOS contract");
      }
      return value;
    },

    async rejectClarityPromotion(recommendationId, signal) {
      return resolvePromotion(request, recommendationId, "reject", signal);
    },

    async deferClarityPromotion(recommendationId, signal) {
      return resolvePromotion(request, recommendationId, "not-now", signal);
    },

    async getCurrentDirection(signal) {
      try {
        const value = await request("/v1/direction/current", signal ? { signal } : {});
        if (!isCurrentDirectionView(value)) {
          throw new Error("Current Direction response does not match the LifeOS contract");
        }
        return value;
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) return null;
        throw error;
      }
    }
  };
}

async function writeUserInterpretation(
  request: (path: string, init?: RequestInit) => Promise<unknown>,
  kind: "manual" | "correct",
  captureId: string,
  baseVersion: number,
  content: CaptureInterpretationContentV1,
  signal?: AbortSignal
): Promise<CaptureInterpretationView> {
  const value = await request(
    `/v1/captures/${encodeURIComponent(captureId)}/interpretations/${kind}`,
    {
      method: "POST",
      body: JSON.stringify({ baseVersion, content }),
      ...(signal ? { signal } : {})
    }
  );
  if (!isInterpretationView(value)) {
    throw new Error("Interpretation response does not match the LifeOS contract");
  }
  return value;
}

async function resolvePromotion(
  request: (path: string, init?: RequestInit) => Promise<unknown>,
  recommendationId: string,
  resolution: "reject" | "not-now",
  signal?: AbortSignal
): Promise<PromotionResolutionView> {
  const value = await request(`/v1/clarity-promotions/${encodeURIComponent(recommendationId)}/${resolution}`, {
    method: "POST",
    ...(signal ? { signal } : {})
  });
  if (!isRecord(value) || (value.status !== "rejected" && value.status !== "not_now")) {
    throw new Error("Clarity promotion resolution does not match the LifeOS contract");
  }
  if (value.incubatorItem !== undefined && !isIncubatorItemView(value.incubatorItem)) {
    throw new Error("Clarity promotion resolution does not match the LifeOS contract");
  }
  return value as PromotionResolutionView;
}

function isHealthStatus(value: unknown): value is HealthStatus {
  if (!isRecord(value)) return false;
  return (
    value.status === "ok" &&
    value.service === "lifeos-api" &&
    typeof value.timestamp === "string"
  );
}

function isSessionView(value: unknown): value is SessionView {
  if (!isRecord(value)) return false;
  if (value.status === "active") return typeof value.expiresAt === "string";
  return value.status === "unauthenticated" || value.status === "unavailable";
}

function isCaptureView(value: unknown): value is CaptureView {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.kind === "text" &&
    typeof value.rawText === "string" &&
    typeof value.processingStatus === "string" &&
    (CAPTURE_PROCESSING_STATUSES as readonly string[]).includes(value.processingStatus) &&
    typeof value.createdAt === "string"
  );
}

function isInterpretationView(value: unknown): value is CaptureInterpretationView {
  if (!isRecord(value) || !isRecord(value.content)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.captureId !== "string" ||
    !Number.isInteger(value.version) ||
    value.contractId !== CAPTURE_INTERPRETATION_CONTRACT_ID ||
    value.contractVersion !== CAPTURE_INTERPRETATION_CONTRACT_VERSION ||
    (value.author !== "ai" && value.author !== "user") ||
    typeof value.createdAt !== "string"
  ) {
    return false;
  }

  for (const category of INTERPRETATION_CATEGORIES) {
    const items = value.content[category];
    if (!Array.isArray(items)) return false;
    for (const item of items) {
      if (!isRecord(item)) return false;
      if (typeof item.text !== "string") return false;
      if (
        typeof item.confidence !== "string" ||
        !(INTERPRETATION_CONFIDENCE_CLASSES as readonly string[]).includes(item.confidence)
      ) {
        return false;
      }
      if (item.sourceExcerpt !== undefined && typeof item.sourceExcerpt !== "string") return false;
    }
  }

  return true;
}

function isClarityPromotionDraftView(value: unknown): value is ClarityPromotionDraftView {
  return (
    isRecord(value) &&
    typeof value.recommendationId === "string" &&
    typeof value.captureId === "string" &&
    Number.isInteger(value.interpretationVersion) &&
    isDirectionView(value.direction) &&
    isSeasonView(value.season) &&
    typeof value.activeText === "string" &&
    isStringArray(value.maintainTexts) &&
    isNotNowItems(value.notNowItems) &&
    typeof value.recommendationStatus === "string" &&
    (RECOMMENDATION_STATUSES as readonly string[]).includes(value.recommendationStatus)
  );
}

function isPromotionConfirmedView(value: unknown): value is PromotionConfirmedView {
  return (
    isCurrentDirectionView(value) &&
    Array.isArray(value.incubatorItems) &&
    value.incubatorItems.every(isIncubatorItemView)
  );
}

function isCurrentDirectionView(value: unknown): value is CurrentDirectionView {
  return isRecord(value) && isDirectionView(value.direction) && isSeasonView(value.season);
}

function isDirectionView(value: unknown): value is DirectionView {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.status === "string" &&
    (DIRECTION_STATUSES as readonly string[]).includes(value.status) &&
    (value.description === undefined || typeof value.description === "string") &&
    (value.sourceCaptureId === undefined || typeof value.sourceCaptureId === "string") &&
    (value.confirmedAt === undefined || typeof value.confirmedAt === "string") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isSeasonView(value: unknown): value is SeasonView {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.directionId === undefined || typeof value.directionId === "string") &&
    typeof value.title === "string" &&
    typeof value.purpose === "string" &&
    typeof value.status === "string" &&
    (SEASON_STATUSES as readonly string[]).includes(value.status) &&
    (value.startsOn === undefined || typeof value.startsOn === "string") &&
    (value.targetEndsOn === undefined || typeof value.targetEndsOn === "string") &&
    (value.primaryFocusText === undefined || typeof value.primaryFocusText === "string") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isIncubatorItemView(value: unknown): value is IncubatorItemView {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.sourceCaptureId === undefined || typeof value.sourceCaptureId === "string") &&
    typeof value.title === "string" &&
    (value.notes === undefined || typeof value.notes === "string") &&
    typeof value.kind === "string" &&
    (INCUBATOR_KINDS as readonly string[]).includes(value.kind) &&
    typeof value.status === "string" &&
    (INCUBATOR_STATUSES as readonly string[]).includes(value.status) &&
    (value.revisitOn === undefined || typeof value.revisitOn === "string") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isNotNowItems(value: unknown): value is ClarityPromotionDraftInput["notNowItems"] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.text === "string" &&
        typeof item.kind === "string" &&
        (INCUBATOR_KINDS as readonly string[]).includes(item.kind)
    )
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
