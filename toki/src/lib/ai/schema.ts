import { z } from "zod";

/** AI 응답 형식. detectedLevel 0 = 해당 없음. 범위 검증은 코드에서 한다(스키마 제약 지원 여부와 무관하게 안전하도록). */
export const AiReplySchema = z.object({
  friendReply: z.string(),
  feedback: z.string(),
  detectedLevel: z.number(),
  safetyFlag: z.boolean(),
});
export type AiReply = z.infer<typeof AiReplySchema>;
