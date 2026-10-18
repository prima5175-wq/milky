// 학부모 화면용 데이터 모양. 정원·신청 수·남은 자리 같은 숫자 필드는 일부러 만들지 않았어요.
export type Slot = { id: string; label: string; start_time: string; end_time: string; is_full: boolean };
export type Session = {
  code: "1차" | "2차";
  start_date: string;
  end_date: string;
  lesson_count: number;
  price: number;
  slots: Slot[];
};
export type Branch = {
  slug: string;
  name: string;
  open_at: string | null;
  close_at: string | null;
  is_open: boolean;
  phase: "before" | "priority" | "paused" | "general" | "closed";
  priority_end_at: string | null;
  general_open_at: string | null;
  final_deadline_at: string | null;
  next_change_at: string | null;
  server_now: string;
  refund_deadline: string;
  contact_url: string | null;
  notice: string | null;
  regular_hours: string | null;
  bundle_price: number;
  makeup_limit: number;
  makeup_start_date: string | null;
  sessions: Session[];
};
export type Course = "1차" | "2차" | "1·2차";
export type FormField = {
  id: string;
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox";
  options: string[];
  required: boolean;
  help: string | null;
};
