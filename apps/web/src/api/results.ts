import type {
  ActionResultView,
  DailyCloseView,
  FocusResultView,
  RecordActionResultInput,
  RecordFocusResultInput,
  CloseDayInput
} from "@lifeos/domain";

export class ResultApiClient {
  constructor(private readonly baseUrl = "") {}

  async recordActionResult(
    actionId: string,
    input: RecordActionResultInput
  ): Promise<ActionResultView> {
    const response = await fetch(`${this.baseUrl}/v1/actions/${encodeURIComponent(actionId)}/results`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        resultType: input.resultType,
        note: input.note
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to record action result");
    }

    return response.json();
  }

  async recordFocusResult(
    focusSessionId: string,
    input: RecordFocusResultInput
  ): Promise<FocusResultView> {
    const response = await fetch(
      `${this.baseUrl}/v1/focus-sessions/${encodeURIComponent(focusSessionId)}/results`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resultType: input.resultType,
          actualMinutes: input.actualMinutes,
          note: input.note
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to record focus result");
    }

    return response.json();
  }

  async recordDailyClose(input: CloseDayInput): Promise<DailyCloseView> {
    const body: Record<string, unknown> = { date: input.date };
    if (input.note !== undefined) {
      body.note = input.note;
    }
    const response = await fetch(`${this.baseUrl}/v1/daily-closes`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to record daily close");
    }

    return response.json();
  }

  async getDailyClose(date: string): Promise<DailyCloseView | null> {
    const response = await fetch(`${this.baseUrl}/v1/daily-closes/${encodeURIComponent(date)}`, { credentials: "include" });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to get daily close");
    }

    return response.json();
  }

  async getActionResults(actionId: string): Promise<ActionResultView[]> {
    const response = await fetch(`${this.baseUrl}/v1/actions/${encodeURIComponent(actionId)}/results`, { credentials: "include" });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to get action results");
    }

    return response.json();
  }

  async getFocusResults(focusSessionId: string): Promise<FocusResultView[]> {
    const response = await fetch(
      `${this.baseUrl}/v1/focus-sessions/${encodeURIComponent(focusSessionId)}/results`,
      { credentials: "include" }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to get focus results");
    }

    return response.json();
  }
}
