// 읽어주기(TTS) 추상화. 브라우저 내장 음성을 먼저 쓰고, 나중에 외부 서비스로 교체할 수 있다.
export interface TtsProvider { supported(): boolean; speak(text: string, opts?: { rate?: number }): void; cancel(): void }

export const browserTts: TtsProvider = {
  supported: () => typeof window !== "undefined" && "speechSynthesis" in window,
  speak(text, opts) {
    if (!this.supported()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR"; u.rate = opts?.rate ?? 1;
    window.speechSynthesis.speak(u);
  },
  cancel() { if (this.supported()) window.speechSynthesis.cancel(); },
};
