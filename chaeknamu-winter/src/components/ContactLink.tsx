// 문의 연락처. 전화번호면 누르면 바로 전화가 걸리고, 주소(링크)면 새 탭으로 열려요.
const isPhone = (v: string) => /^[\d\s\-+()]+$/.test(v);

export default function ContactLink({ value, className = "font-bold text-pine underline" }: { value: string; className?: string }) {
  if (isPhone(value)) {
    return <a href={`tel:${value.replace(/[^\d+]/g, "")}`} className={className}>{value}</a>;
  }
  return <a href={value} target="_blank" rel="noopener noreferrer" className={className}>문의하기</a>;
}
