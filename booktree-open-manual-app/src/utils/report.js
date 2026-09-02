/*
 * 원장님 진행상황을 지사 구글시트로 보냅니다.
 *
 * 왜 JSONP 인가요?
 *   앱은 GitHub Pages 에서 열리고 Apps Script 는 다른 도메인이라, 일반 fetch 는
 *   브라우저가 CORS 로 막습니다. Apps Script 웹앱은 CORS 헤더를 임의로 붙일 수
 *   없어서, 출석 체크인 키오스크와 동일하게 <script> 태그를 이용한 JSONP 를 씁니다.
 *
 * 실패해도 앱은 그대로 동작해야 합니다. 네트워크가 끊겨 있든 주소가 틀렸든
 * 원장님 화면에는 아무 영향이 없어야 해요. 그래서 모든 오류를 삼킵니다.
 */

import { REPORT_CONFIG } from '../data/manual.js';

const TIMEOUT_MS = 8000;

function jsonp(url, params) {
  return new Promise((resolve, reject) => {
    const cb = `__btReport_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement('script');
    let done = false;

    const cleanup = () => {
      if (done) return;
      done = true;
      delete window[cb];
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, TIMEOUT_MS);

    window[cb] = (data) => { cleanup(); resolve(data); };

    const qs = new URLSearchParams({ ...params, callback: cb }).toString();
    script.src = `${url}${url.includes('?') ? '&' : '?'}${qs}`;
    script.onerror = () => { cleanup(); reject(new Error('network')); };
    document.head.appendChild(script);
  });
}

/**
 * 진행상황 전송.
 * 설정이 비어 있으면 아무것도 하지 않고 조용히 끝냅니다(기능이 꺼진 상태).
 */
export async function reportProgress(payload) {
  const { webAppUrl, token } = REPORT_CONFIG || {};
  if (!webAppUrl || !token) return { skipped: true };

  // 지점명이 없으면 어느 지점인지 알 수 없어 보내지 않습니다.
  if (!payload.branch) return { skipped: true };

  try {
    return await jsonp(webAppUrl, {
      action: 'report',
      token,
      branch: payload.branch,
      manager: payload.manager || '',
      openDate: payload.openDate || '',
      dday: payload.dday ?? '',
      percent: payload.percent ?? 0,
      doneCount: payload.doneCount ?? 0,
      totalCount: payload.totalCount ?? 0,
      doneSteps: (payload.doneSteps || []).join(', '),
      quiz1: payload.quiz?.q1 ?? '',
      quiz2: payload.quiz?.q2 ?? '',
      quiz3: payload.quiz?.q3 ?? '',
    });
  } catch (e) {
    // 전송 실패는 원장님 화면에 영향을 주지 않아요.
    return { error: String(e) };
  }
}

export function isReportEnabled() {
  const { webAppUrl, token } = REPORT_CONFIG || {};
  return Boolean(webAppUrl && token);
}
