import { findCoachFacts, findOrCreatePreferences, parseWorkDays, type DatabaseClient } from "@lifeos/db";
import type { CoachInsight, CoachView } from "@lifeos/domain";
import type { FastifyInstance } from "fastify";
import { resolveActorUserId } from "./identity.js";

type CoachErrorView = { error: "unavailable" | "unauthenticated"; message: string };

export function registerCoachRoutes(app: FastifyInstance, database: DatabaseClient | null) {
  app.get("/v1/coach", async (request, reply): Promise<CoachView | CoachErrorView> => {
    reply.header("cache-control", "no-store");
    if (!database) {
      reply.code(503);
      return { error: "unavailable", message: "Coach storage is unavailable" };
    }

    const userId = await resolveActorUserId(request, database);
    if (!userId) {
      reply.code(401);
      return { error: "unauthenticated", message: "An active LifeOS session is required" };
    }

    const [facts, preferences] = await Promise.all([
      findCoachFacts(database, userId),
      findOrCreatePreferences(database, userId)
    ]);

    const workWindowMinutesPerDay = preferences.workEndMinute - preferences.workStartMinute;
    const workDaysPerWeek = parseWorkDays(preferences.workDays).length;

    return {
      generatedAt: new Date().toISOString(),
      capacity: {
        workWindowMinutesPerDay,
        workDaysPerWeek,
        plannedWeeklyMinutes: workWindowMinutesPerDay * workDaysPerWeek,
        focusMinutesLast7Days: facts.focusMinutesLast7Days,
        focusSessionsLast7Days: facts.focusSessionsLast7Days,
        interruptedSessionsLast7Days: facts.interruptedSessionsLast7Days,
        scheduledMinutesNext7Days: facts.scheduledMinutesNext7Days
      },
      insights: buildInsights(facts),
      facts: {
        actionsCompletedLast7Days: facts.actionsCompletedLast7Days,
        actionsPartialLast7Days: facts.actionsPartialLast7Days,
        actionsPostponedLast7Days: facts.actionsPostponedLast7Days,
        dailyClosesLast7Days: facts.dailyClosesLast7Days,
        ...(facts.bestFocusHour === null ? {} : { bestFocusHour: facts.bestFocusHour })
      }
    };
  });
}

/**
 * Builds observations from counted facts only. Each insight repeats the numbers it came
 * from, and none of them changes anything: the coach observes, the user decides.
 */
export function buildInsights(facts: Awaited<ReturnType<typeof findCoachFacts>>): CoachInsight[] {
  const insights: CoachInsight[] = [];

  if (facts.focusSessionsLast7Days === 0) {
    insights.push({
      id: "no-focus-data",
      kind: "focus",
      title: "Chưa có phiên Focus nào trong 7 ngày",
      body: "LifeOS chưa có dữ liệu để nhận xét. Chạy vài phiên Focus rồi quay lại đây.",
      evidence: ["0 phiên Focus trong 7 ngày qua"]
    });
    return insights;
  }

  const endedBadly = facts.interruptedSessionsLast7Days + facts.abandonedSessionsLast7Days;
  if (endedBadly > 0) {
    insights.push({
      id: "interrupted-focus",
      kind: "focus",
      title: "Một phần phiên Focus không đi trọn",
      body: "Nếu lặp lại, hãy xem điều gì cắt ngang phiên: thông báo, việc chen ngang, hay Action quá to.",
      evidence: [
        `${facts.interruptedSessionsLast7Days} phiên bị gián đoạn / ${facts.abandonedSessionsLast7Days} phiên bỏ dở`,
        `trên tổng ${facts.focusSessionsLast7Days} phiên trong 7 ngày`
      ]
    });
  }

  if (facts.bestFocusHour !== null) {
    insights.push({
      id: "best-focus-hour",
      kind: "focus",
      title: `Bạn hay hoàn thành phiên Focus lúc ${String(facts.bestFocusHour).padStart(2, "0")}:00`,
      body: "Đây là khung giờ bạn thật sự làm được, không phải khung giờ lý tưởng. Cân nhắc giữ nó cho việc quan trọng.",
      evidence: [`thống kê 30 ngày, tính theo giờ bắt đầu của các phiên đã hoàn thành`]
    });
  }

  if (facts.actionsPostponedLast7Days > 0 || facts.actionsPartialLast7Days > 0) {
    insights.push({
      id: "unfinished-actions",
      kind: "result",
      title: "Có việc đang dở hoặc bị hoãn",
      body: "Ghi kết quả cho những việc này trong REFLECT để chúng không âm thầm trôi đi.",
      evidence: [
        `${facts.actionsPartialLast7Days} Action ghi kết quả một phần`,
        `${facts.actionsPostponedLast7Days} Action bị hoãn`
      ]
    });
  }

  insights.push({
    id: "closing-habit",
    kind: "closing",
    title:
      facts.dailyClosesLast7Days >= 5
        ? "Thói quen chốt ngày đang ổn định"
        : "Chốt ngày chưa đều",
    body:
      facts.dailyClosesLast7Days >= 5
        ? "Giữ nhịp này: chốt ngày là nguồn dữ liệu duy nhất cho mọi nhận xét ở đây."
        : "Mỗi ngày chốt một lần sẽ giúp các nhận xét ở đây chính xác hơn.",
    evidence: [`${facts.dailyClosesLast7Days}/7 ngày có chốt ngày`]
  });

  return insights;
}
