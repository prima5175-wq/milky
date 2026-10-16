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
  refund_deadline: string;
  contact_url: string | null;
  notice: string | null;
  bundle_price: number;
  makeup_limit: number;
  sessions: Session[];
};
export type Course = "1차" | "2차" | "1·2차";
