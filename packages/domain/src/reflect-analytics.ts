/**
 * REFLECT analytics: energy, habits and a schedule suggestion, all derived from
 * counted rows. Nothing here is scheduled automatically and nothing is estimated —
 * when a signal has no data behind it, the view says so instead of drawing a shape.
 */

export type EnergyBar = { hour: number; minutes: number; level: number };

export type ReflectEnergyView = {
  /** Focus minutes today, one bar per local hour inside the user's work window. */
  bars: EnergyBar[];
  minutesToday: number;
  /** Best contiguous 2h window over the last 30 days of completed sessions. */
  peakWindow: { startHour: number; endHour: number; minutes: number } | null;
  deltaPercentVsPreviousWeek: number | null;
  minutesLast7Days: number;
  minutesPrevious7Days: number;
};

export type HabitDay = { localDate: string; done: boolean };

export type HabitView = {
  id: "deep-work" | "daily-close" | "result-logged" | "capture";
  name: string;
  rule: string;
  color: string;
  streak: number;
  days: HabitDay[];
};

export type ScheduleBlock = {
  startMinute: number;
  endMinute: number;
  type: string;
  color: string;
  description: string;
  evidence: string;
};

export type ReflectAnalyticsView = {
  tzOffsetMinutes: number;
  energy: ReflectEnergyView;
  habits: HabitView[];
  schedule: { blocks: ScheduleBlock[]; note: string };
};

export type ReflectAnalyticsInput = {
  tzOffsetMinutes: number;
  focusMinutesTodayByHour: { hour: number; minutes: number }[];
  focusMinutesByHourLast30Days: { hour: number; minutes: number }[];
  focusMinutesLast7Days: number;
  focusMinutesPrevious7Days: number;
  days: {
    localDate: string;
    focusMinutes: number;
    completedFocusSessions: number;
    actionsWithResult: number;
    closed: boolean;
    captures: number;
  }[];
  preferences: { workStartMinute: number; workEndMinute: number; focusMinutes: number };
};

/** Bars are relative to the busiest hour of the day, so the scale is always real. */
function buildEnergy(input: ReflectAnalyticsInput): ReflectEnergyView {
  const startHour = Math.floor(input.preferences.workStartMinute / 60);
  const endHour = Math.max(startHour + 1, Math.ceil(input.preferences.workEndMinute / 60));
  const todayByHour = new Map(input.focusMinutesTodayByHour.map((entry) => [entry.hour, entry.minutes]));

  const rawBars: { hour: number; minutes: number }[] = [];
  for (let hour = startHour; hour < endHour; hour += 1) rawBars.push({ hour, minutes: todayByHour.get(hour) ?? 0 });

  const peakMinutes = Math.max(0, ...rawBars.map((bar) => bar.minutes));
  const bars: EnergyBar[] = rawBars.map((bar) => ({
    ...bar,
    level: peakMinutes === 0 ? 0 : bar.minutes / peakMinutes
  }));

  const last30 = new Map(input.focusMinutesByHourLast30Days.map((entry) => [entry.hour, entry.minutes]));
  let peakWindow: ReflectEnergyView["peakWindow"] = null;
  for (let hour = 0; hour <= 22; hour += 1) {
    const minutes = (last30.get(hour) ?? 0) + (last30.get(hour + 1) ?? 0);
    if (minutes > 0 && (peakWindow === null || minutes > peakWindow.minutes)) {
      peakWindow = { startHour: hour, endHour: hour + 2, minutes };
    }
  }

  const deltaPercentVsPreviousWeek =
    input.focusMinutesPrevious7Days === 0
      ? null
      : Math.round(((input.focusMinutesLast7Days - input.focusMinutesPrevious7Days) / input.focusMinutesPrevious7Days) * 100);

  return {
    bars,
    minutesToday: rawBars.reduce((sum, bar) => sum + bar.minutes, 0),
    peakWindow,
    deltaPercentVsPreviousWeek,
    minutesLast7Days: input.focusMinutesLast7Days,
    minutesPrevious7Days: input.focusMinutesPrevious7Days
  };
}

/** Streak counts backwards from the most recent day, so a gap today breaks it honestly. */
function streakOf(days: HabitDay[]): number {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (!days[index]?.done) break;
    streak += 1;
  }
  return streak;
}

function buildHabits(input: ReflectAnalyticsInput): HabitView[] {
  const deepWorkGoal = Math.max(1, input.preferences.focusMinutes) * 2;
  const definitions: { id: HabitView["id"]; name: string; rule: string; color: string; done: (day: ReflectAnalyticsInput["days"][number]) => boolean }[] = [
    {
      id: "deep-work",
      name: `Deep work ${Math.round((deepWorkGoal / 60) * 10) / 10}h+`,
      rule: `Tổng thời gian Focus trong ngày ≥ ${deepWorkGoal} phút`,
      color: "var(--primary)",
      done: (day) => day.focusMinutes >= deepWorkGoal
    },
    {
      id: "result-logged",
      name: "Ghi kết quả Action",
      rule: "Có ít nhất 1 Action được ghi kết quả trong ngày",
      color: "#3b82f6",
      done: (day) => day.actionsWithResult > 0
    },
    {
      id: "capture",
      name: "Brain Dump trong ngày",
      rule: "Có ít nhất 1 lần ghi vào Brain Dump",
      color: "#22c55e",
      done: (day) => day.captures > 0
    },
    {
      id: "daily-close",
      name: "Chốt ngày",
      rule: "Ngày đó đã được chốt trong REFLECT",
      color: "#f59e0b",
      done: (day) => day.closed
    }
  ];

  return definitions.map((definition) => {
    const days = input.days.map((day) => ({ localDate: day.localDate, done: definition.done(day) }));
    return {
      id: definition.id,
      name: definition.name,
      rule: definition.rule,
      color: definition.color,
      streak: streakOf(days),
      days
    };
  });
}

/**
 * A suggestion, never a calendar write: the work window from ME, split around the
 * hours the user actually completed Focus sessions in the last 30 days.
 */
function buildSchedule(input: ReflectAnalyticsInput, energy: ReflectEnergyView): { blocks: ScheduleBlock[]; note: string } {
  const start = input.preferences.workStartMinute;
  const end = input.preferences.workEndMinute;
  if (end - start < 120) {
    return { blocks: [], note: "Giờ làm việc trong ME quá ngắn để đề xuất khối thời gian." };
  }
  const startHour = Math.ceil(start / 60);
  const lastStartHour = Math.floor(end / 60) - 2;
  const last30 = new Map(input.focusMinutesByHourLast30Days.map((entry) => [entry.hour, entry.minutes]));
  let best: { hour: number; minutes: number } | null = null;
  for (let hour = startHour; hour <= lastStartHour; hour += 1) {
    const minutes = (last30.get(hour) ?? 0) + (last30.get(hour + 1) ?? 0);
    if (best === null || minutes > best.minutes) best = { hour, minutes };
  }

  if (energy.peakWindow === null || best === null) {
    return {
      blocks: [],
      note: "Chưa có phiên Focus hoàn thành nào trong 30 ngày — LifeOS chưa biết khung giờ mạnh của bạn."
    };
  }

  const peakStart = best.hour * 60;
  const peakEnd = peakStart + 120;
  const evidence =
    best.minutes > 0
      ? `${Math.round(best.minutes)} phút Focus hoàn thành trong khung này (30 ngày)`
      : "Khung giờ mạnh của bạn nằm ngoài giờ làm việc trong ME — đây là khối đầu ngày làm việc";
  const blocks: ScheduleBlock[] = [];

  if (peakStart - start >= 30) {
    blocks.push({
      startMinute: start,
      endMinute: peakStart,
      type: "Khởi động",
      color: "#f59e0b",
      description: "Việc nhẹ, sắp xếp ngày, trả lời tin nhắn",
      evidence: "Giờ làm việc bạn đặt trong ME"
    });
  }

  blocks.push({
    startMinute: peakStart,
    endMinute: peakEnd,
    type: "Deep Work",
    color: "var(--primary)",
    description: "Việc quan trọng nhất trong ngày",
    evidence
  });

  if (end - peakEnd >= 60) {
    blocks.push({
      startMinute: peakEnd,
      endMinute: Math.min(peakEnd + 60, end),
      type: "Nghỉ ngơi",
      color: "#22c55e",
      description: "Ăn, đi bộ, tách khỏi màn hình",
      evidence: "Chèn sau khối Deep Work"
    });
  }

  if (end - peakEnd > 60) {
    blocks.push({
      startMinute: Math.min(peakEnd + 60, end),
      endMinute: end,
      type: "Focus 2",
      color: "#3b82f6",
      description: "Việc thứ hai, họp nhẹ",
      evidence: "Phần còn lại của giờ làm việc trong ME"
    });
  }

  return { blocks, note: "Đây là đề xuất. LifeOS không tự đặt lịch cho bạn." };
}

export function buildReflectAnalytics(input: ReflectAnalyticsInput): ReflectAnalyticsView {
  const energy = buildEnergy(input);
  return {
    tzOffsetMinutes: input.tzOffsetMinutes,
    energy,
    habits: buildHabits(input),
    schedule: buildSchedule(input, energy)
  };
}
