import { and, eq, sql } from "drizzle-orm";
import type { DatabaseClient } from "./index.js";
import {
  actionResults,
  actions,
  captures,
  dailyCloses,
  directions,
  focusSessions,
  incubatorItems,
  outcomes,
  projects,
  seasons
} from "./schema.js";

export type DemoSeedSummary = {
  seeded: boolean;
  direction: string;
  outcomes: number;
  actions: number;
  focusSessions: number;
  captures: number;
  incubatorItems: number;
  dailyCloses: number;
};

function daysAgo(days: number, hour: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function isoDate(days: number): string {
  return daysAgo(days, 12).toISOString().slice(0, 10);
}

/**
 * Fills a brand-new account with one week of plausible history so every screen has something
 * to explain. It is a demo dataset, clearly labelled as such in the UI, and it is only ever
 * written for the user who asks for it.
 */
export async function seedDemoData(database: DatabaseClient, userId: string): Promise<DemoSeedSummary> {
  const existing = await database.db
    .select({ id: directions.id })
    .from(directions)
    .where(and(eq(directions.userId, userId), eq(directions.status, "active")))
    .limit(1);

  if (existing.length > 0) {
    return {
      seeded: false,
      direction: "",
      outcomes: 0,
      actions: 0,
      focusSessions: 0,
      captures: 0,
      incubatorItems: 0,
      dailyCloses: 0
    };
  }

  const [direction] = await database.db
    .insert(directions)
    .values({
      userId,
      title: "Làm chủ sức khỏe và sự nghiệp trong 90 ngày",
      description: "Ưu tiên thể lực buổi sáng và một sản phẩm cá nhân được ra mắt.",
      status: "active",
      confirmedAt: daysAgo(21, 9)
    })
    .returning({ id: directions.id, title: directions.title });

  const [season] = await database.db
    .insert(seasons)
    .values({
      userId,
      directionId: direction!.id,
      title: "Mùa Q3 — Ra mắt sản phẩm đầu tiên",
      purpose: "Đưa sản phẩm cá nhân lên sóng và giữ nhịp thể lực đều đặn.",
      startsOn: isoDate(21),
      targetEndsOn: isoDate(-69),
      status: "active",
      primaryFocusText: "Ra mắt bản beta cho 20 người dùng đầu tiên"
    })
    .returning({ id: seasons.id });

  const outcomeRows = await database.db
    .insert(outcomes)
    .values([
      {
        userId,
        seasonId: season!.id,
        title: "Beta có 20 người dùng thật",
        successDefinition: "20 người đăng ký và dùng ít nhất 1 lần trong tuần đầu.",
        status: "active",
        priority: 1
      },
      {
        userId,
        seasonId: season!.id,
        title: "Tập 4 buổi/tuần trong 8 tuần",
        successDefinition: "Ghi nhận đủ 4 buổi mỗi tuần, không bỏ quá 1 tuần.",
        status: "active",
        priority: 2
      }
    ])
    .returning({ id: outcomes.id });

  const [project] = await database.db
    .insert(projects)
    .values({
      userId,
      outcomeId: outcomeRows[0]!.id,
      title: "Bản beta LifeOS",
      description: "Từ bản dựng nội bộ đến bản mời người dùng đầu tiên.",
      status: "active",
      priority: 1
    })
    .returning({ id: projects.id });

  const actionRows = await database.db
    .insert(actions)
    .values([
      {
        userId,
        projectId: project!.id,
        outcomeId: outcomeRows[0]!.id,
        title: "Viết trang giới thiệu beta",
        doneCondition: "Trang có mô tả, ảnh và nút đăng ký hoạt động.",
        estimatedMinutes: 60,
        status: "ready",
        priority: 1
      },
      {
        userId,
        projectId: project!.id,
        outcomeId: outcomeRows[0]!.id,
        title: "Mời 10 người dùng thử đầu tiên",
        doneCondition: "Đã gửi lời mời cho 10 người và ghi lại phản hồi.",
        estimatedMinutes: 45,
        status: "ready",
        priority: 2
      },
      {
        userId,
        projectId: project!.id,
        outcomeId: outcomeRows[0]!.id,
        title: "Sửa 3 lỗi người dùng báo lại",
        doneCondition: "3 lỗi đã đóng và kiểm tra lại trên bản beta.",
        estimatedMinutes: 90,
        status: "ready",
        priority: 3
      },
      {
        userId,
        outcomeId: outcomeRows[1]!.id,
        title: "Chạy 5km buổi sáng",
        doneCondition: "Hoàn thành 5km và ghi lại cảm giác sau buổi chạy.",
        estimatedMinutes: 40,
        status: "completed",
        priority: 1,
        completedAt: daysAgo(1, 7)
      },
      {
        userId,
        projectId: project!.id,
        outcomeId: outcomeRows[0]!.id,
        title: "Dựng khung màn hình Reflect",
        doneCondition: "Màn hình Reflect hiển thị đủ dữ liệu tuần.",
        estimatedMinutes: 75,
        status: "completed",
        priority: 2,
        completedAt: daysAgo(3, 16)
      },
      {
        userId,
        projectId: project!.id,
        outcomeId: outcomeRows[0]!.id,
        title: "Chuẩn bị nội dung email mời",
        doneCondition: "Email đã viết xong và được đọc soát.",
        estimatedMinutes: 30,
        status: "completed",
        priority: 3,
        completedAt: daysAgo(5, 11)
      },
      {
        userId,
        projectId: project!.id,
        outcomeId: outcomeRows[0]!.id,
        title: "Dọn dẹp danh sách việc buổi sáng",
        doneCondition: "Danh sách hôm nay chỉ còn việc thật sự cần làm.",
        estimatedMinutes: 25,
        status: "completed",
        priority: 4,
        completedAt: daysAgo(0, 8)
      }
    ])
    .returning({ id: actions.id, title: actions.title, status: actions.status });

  const done = actionRows.filter((row) => row.status === "completed");

  const sessionRows = await database.db
    .insert(focusSessions)
    .values([
      { userId, actionId: done[0]!.id, plannedMinutes: 45, status: "completed", startedAt: daysAgo(1, 7), endedAt: daysAgo(1, 8) },
      { userId, actionId: done[1]!.id, plannedMinutes: 60, status: "completed", startedAt: daysAgo(3, 15), endedAt: daysAgo(3, 16) },
      { userId, actionId: done[2]!.id, plannedMinutes: 30, status: "completed", startedAt: daysAgo(5, 10), endedAt: daysAgo(5, 11) },
      { userId, actionId: actionRows[0]!.id, plannedMinutes: 50, status: "interrupted", startedAt: daysAgo(2, 14), endedAt: daysAgo(2, 15) },
      { userId, actionId: actionRows[1]!.id, plannedMinutes: 45, status: "completed", startedAt: daysAgo(6, 9), endedAt: daysAgo(6, 10) },
      { userId, actionId: done[3]!.id, plannedMinutes: 25, status: "completed", startedAt: daysAgo(0, 7), endedAt: daysAgo(0, 8) }
    ])
    .returning({ id: focusSessions.id });

  await database.db.insert(actionResults).values([
    {
      userId,
      actionId: done[0]!.id,
      focusSessionId: sessionRows[0]!.id,
      outcome: "completed",
      previousActionStatus: "active",
      note: "Chạy xong 5km, nhịp thở tốt hơn tuần trước.",
      focusMinutes: 45,
      plannedMinutes: 45,
      recordedAt: daysAgo(1, 8)
    },
    {
      userId,
      actionId: done[1]!.id,
      focusSessionId: sessionRows[1]!.id,
      outcome: "completed",
      previousActionStatus: "active",
      note: "Khung Reflect xong, còn thiếu phần biểu đồ năng lượng.",
      focusMinutes: 60,
      plannedMinutes: 60,
      recordedAt: daysAgo(3, 16)
    },
    {
      userId,
      actionId: done[2]!.id,
      focusSessionId: sessionRows[2]!.id,
      outcome: "partial",
      previousActionStatus: "active",
      note: "Viết được bản nháp, cần đọc soát lại.",
      focusMinutes: 30,
      plannedMinutes: 30,
      recordedAt: daysAgo(5, 11)
    },
    {
      userId,
      actionId: done[3]!.id,
      focusSessionId: sessionRows[5]!.id,
      outcome: "completed",
      previousActionStatus: "active",
      note: "Sáng nay dọn xong danh sách, đầu nhẹ hơn.",
      focusMinutes: 25,
      plannedMinutes: 25,
      recordedAt: daysAgo(0, 8)
    }
  ]);

  const captureRows = await database.db
    .insert(captures)
    .values([
      { userId, kind: "text", rawText: "Ý tưởng: thêm chế độ tuần cho màn hình Reflect.", processingStatus: "unprocessed", createdAt: daysAgo(1, 20) },
      { userId, kind: "voice_transcript", rawText: "Nhắc mình gọi cho anh Minh hỏi về hợp đồng thuê văn phòng.", processingStatus: "unprocessed", createdAt: daysAgo(2, 8) },
      { userId, kind: "quick_note", rawText: "Sách nên đọc: Deep Work — đọc lại chương về nhịp làm việc.", processingStatus: "unprocessed", createdAt: daysAgo(4, 22) },
      { userId, kind: "distraction", rawText: "Cứ mở điện thoại giữa phiên focus buổi chiều.", processingStatus: "unprocessed", createdAt: daysAgo(2, 15) }
    ])
    .returning({ id: captures.id });

  await database.db.insert(incubatorItems).values([
    { userId, sourceCaptureId: captureRows[2]!.id, title: "Khóa học nhỏ về nhịp làm việc sâu", notes: "Chờ sau khi beta ổn định.", kind: "project_candidate", status: "incubated", revisitOn: isoDate(-14) },
    { userId, title: "Viết blog hằng tuần", notes: "Ý tưởng hay nhưng chưa đủ thời gian mùa này.", kind: "someday", status: "incubated" },
    { userId, title: "Mẫu bảng theo dõi thể lực", notes: "Tham khảo cho Outcome tập luyện.", kind: "reference", status: "incubated" }
  ]);

  const closes = [1, 2, 3, 5].map((day) => ({
    userId,
    localDate: isoDate(day),
    tzOffsetMinutes: 420,
    note: day === 1 ? "Ngày tốt: giữ được phiên focus buổi sáng." : "Ổn, nhưng buổi chiều bị ngắt nhiều.",
    summary: { completed: day === 1 ? 2 : 1, focusMinutes: day === 1 ? 45 : 30 }
  }));
  await database.db.insert(dailyCloses).values(closes).onConflictDoNothing();

  await database.db
    .update(actions)
    .set({ scheduledFor: sql`now()` })
    .where(and(eq(actions.userId, userId), eq(actions.id, actionRows[0]!.id)));

  return {
    seeded: true,
    direction: direction!.title,
    outcomes: outcomeRows.length,
    actions: actionRows.length,
    focusSessions: sessionRows.length,
    captures: captureRows.length,
    incubatorItems: 3,
    dailyCloses: closes.length
  };
}
