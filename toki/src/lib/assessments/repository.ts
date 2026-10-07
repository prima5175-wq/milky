import type { AssessmentRecord, CatalogEntry } from "./types";
import type { NoteLike } from "./timeline";

/** 저장소 인터페이스. 지금은 데모 구현, Supabase 연결 시 같은 인터페이스로 교체한다. */
export interface ChildSummary { id: string; nickname: string; ageBand: string }
export interface AssessmentRepository {
  listChildren(): Promise<ChildSummary[]>;
  getChild(id: string): Promise<ChildSummary | null>;
  listCatalog(): Promise<CatalogEntry[]>;
  listRecords(childId: string): Promise<AssessmentRecord[]>;
  listNotes(childId: string): Promise<NoteLike[]>;
}
