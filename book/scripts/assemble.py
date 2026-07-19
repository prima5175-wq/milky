#!/usr/bin/env python3
"""part-1..8.md를 순서대로 이어 통합 초고를 생성한다."""
import sys, pathlib

BOOK = pathlib.Path(__file__).resolve().parent.parent
DRAFT = BOOK / "draft"
version = sys.argv[1] if len(sys.argv) > 1 else "1"
out = BOOK / f"북스펙-초고-v{version}.md"

header = """# 대치동 윤원장의 북스펙
### 대치동 상위 1%% 부모들의 선택은 바로 이것!
##### — 읽는 순간, 오너가 된다 · 문답 50 (초고 v%s)

> 저자 윤혜림(대치동 윤원장) · 문답을 이으면 한 권이 된다.
> ⚠️ 내부 초고. 브랜드명·특허·앱명 미포함 원칙.

---
""" % version

parts = []
for i in range(1, 11):
    f = DRAFT / f"part-{i}.md"
    if f.exists():
        parts.append(f.read_text(encoding="utf-8").strip())
    else:
        parts.append(f"<!-- part-{i}.md 없음 -->")

out.write_text(header + "\n\n---\n\n".join(parts) + "\n", encoding="utf-8")
print(f"wrote {out}")
print(f"chars: {len(out.read_text(encoding='utf-8'))}")
