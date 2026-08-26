import {
  NEED_STATES,
  type CaptureInterpretationContentV1,
  type InterpretationCategory,
  type NeedState
} from "@lifeos/domain";

export type NeedStateOption = {
  value: NeedState;
  label: string;
  hint: string;
};

const NEED_COPY: Record<NeedState, Omit<NeedStateOption, "value">> = {
  unclear_direction: {
    label: "Tôi chưa rõ mình muốn đi đâu",
    hint: "Tìm một hướng đủ rõ cho giai đoạn hiện tại."
  },
  dont_know_what_to_do: {
    label: "Hôm nay tôi không biết nên làm gì",
    hint: "Giảm lựa chọn và tìm việc đáng làm tiếp theo."
  },
  overloaded: {
    label: "Tôi có quá nhiều thứ trong đầu",
    hint: "Đưa mọi thứ ra ngoài rồi làm rõ điều cần ưu tiên."
  },
  procrastinating: {
    label: "Tôi biết việc cần làm nhưng cứ trì hoãn",
    hint: "Tìm chỗ đang mắc thay vì tự ép thêm."
  },
  abandoning_goals: {
    label: "Tôi thường bắt đầu rồi bỏ giữa chừng",
    hint: "Xem điều gì đang làm kế hoạch không bền."
  },
  rebalance_life: {
    label: "Tôi cần cân bằng lại cuộc sống",
    hint: "Xác định một điều cần điều chỉnh trước."
  },
  learning_not_applying: {
    label: "Tôi học nhiều nhưng chưa biến thành hành động",
    hint: "Chuyển điều đã học thành một thử nghiệm thực tế."
  },
  other: {
    label: "Vấn đề của tôi khác",
    hint: "Bạn có thể mô tả bằng lời của mình."
  }
};

export const NEED_STATE_OPTIONS: readonly NeedStateOption[] = NEED_STATES.map((value) => ({
  value,
  ...NEED_COPY[value]
}));

export const INTERPRETATION_CATEGORY_COPY: Record<
  InterpretationCategory,
  { label: string; empty: string }
> = {
  concerns: { label: "Điều đang làm bạn bận tâm", empty: "Chưa thấy mối bận tâm rõ ràng." },
  ideas: { label: "Ý tưởng", empty: "Chưa có ý tưởng được tách ra." },
  commitments: { label: "Điều bạn đã cam kết", empty: "Chưa thấy cam kết rõ ràng." },
  possibleProjects: { label: "Khả năng là dự án", empty: "Chưa có ứng viên dự án." },
  possibleDirections: { label: "Hướng có thể cân nhắc", empty: "Chưa có hướng được đề xuất." },
  questions: { label: "Câu hỏi còn mở", empty: "Chưa có câu hỏi cần làm rõ." },
  uncertainties: { label: "Điều chưa chắc chắn", empty: "Chưa có điểm mơ hồ được đánh dấu." }
};

export function createEmptyInterpretation(): CaptureInterpretationContentV1 {
  return {
    concerns: [],
    ideas: [],
    commitments: [],
    possibleProjects: [],
    possibleDirections: [],
    questions: [],
    uncertainties: []
  };
}

export function composeCaptureText(quickContext: string, brainDump: string): string {
  if (quickContext.trim().length === 0) return brainDump;
  return `Bối cảnh hiện tại:\n${quickContext}\n\nBrain dump:\n${brainDump}`;
}

export function captureIdFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get("capture");
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}
