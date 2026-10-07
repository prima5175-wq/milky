// 보상 설계: 앱 안 연습보다 실제 생활 미션 성공에 더 크게 준다. 앱 사용 자체가 목적이 되지 않게 하기 위해서다.
// 랜덤 뽑기·무한 스크롤 같은 중독 장치는 넣지 않는다.
export const POINTS = { practiceDone: 1, missionConfirmed: 5 } as const;
export const DAILY_PRACTICE_POINT_CAP = 3; // 하루에 연습으로 받을 수 있는 최대 점수

export function practicePointsToday(alreadyToday: number): number {
  return Math.max(0, Math.min(POINTS.practiceDone, DAILY_PRACTICE_POINT_CAP - alreadyToday));
}
