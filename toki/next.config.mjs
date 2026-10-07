/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // pdfkit 은 실행 중에 자기 패키지의 데이터 파일을 읽으므로 번들에 넣지 않고 그대로 불러온다.
  serverExternalPackages: ["pdfkit"],
  // PDF 에 넣을 한글 폰트 파일을 배포본에 포함한다.
  outputFileTracingIncludes: { "/api/report": ["./node_modules/@expo-google-fonts/noto-sans-kr/400Regular/*.ttf", "./node_modules/@expo-google-fonts/noto-sans-kr/700Bold/*.ttf"] },
};
