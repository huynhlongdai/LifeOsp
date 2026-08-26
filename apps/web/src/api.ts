import {
  CAPTURE_INTERPRETATION_CONTRACT_ID,
  CAPTURE_INTERPRETATION_CONTRACT_VERSION,
  CAPTURE_PROCESSING_STATUSES,
  INTERPRETATION_CATEGORIES,
  INTERPRETATION_CONFIDENCE_CLASSES,
  type CaptureInterpretationContentV1,
  type CaptureInterpretationView,
  type CaptureView,
  type HealthStatus,
  type SessionView
} from "@lifeos/domain";

export type InterpretationFailure = {
  error: string;
  message: string;
  manualFallback?: boolean;
  validationErrors?: string[];
  latestVersion?: number;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
