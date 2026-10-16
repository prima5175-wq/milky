// 관마다 포인트 색이 달라지도록 감싸 줘요 (data-branch 에 따라 색이 바뀌어요)
export default async function BranchLayout({ children, params }: { children: React.ReactNode; params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  return <div data-branch={branch}>{children}</div>;
}
