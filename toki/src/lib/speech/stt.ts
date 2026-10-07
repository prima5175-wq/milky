// 음성 인식(STT) 추상화. 브라우저 Web Speech API 우선, 한국어 정확도가 부족하면 외부 서비스로 교체.
// 음성 원본은 저장하지 않는다. 변환된 글자만 사용한다.
export interface SttSession { stop(): void }
export interface SttProvider {
  supported(): boolean;
  start(handlers: { onResult: (text: string) => void; onEnd: () => void; onError: (msg: string) => void }): SttSession | null;
}

export const browserStt: SttProvider = {
  supported: () => typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
  start({ onResult, onEnd, onError }) {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.lang = "ko-KR"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => onResult(String(e.results?.[0]?.[0]?.transcript ?? ""));
    rec.onerror = (e: any) => onError(String(e.error ?? "error"));
    rec.onend = onEnd;
    rec.start();
    return { stop: () => rec.stop() };
  },
};
