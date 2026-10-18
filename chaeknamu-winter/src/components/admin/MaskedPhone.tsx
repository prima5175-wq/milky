"use client";
import { useState } from "react";

const fmt = (d: string) => `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;

// 연락처는 기본으로 가려 두고, 누르면 보여요
export default function MaskedPhone({ phone }: { phone: string }) {
  const [show, setShow] = useState(false);
  return (
    <button type="button" onClick={() => setShow(!show)} className="min-h-8 tabular-nums underline decoration-dotted" title="눌러서 보기/가리기">
      {show ? fmt(phone) : `${phone.slice(0, 3)}-****-${phone.slice(7)}`}
    </button>
  );
}
