import "./globals.css";
import { t } from "@/lib/i18n";

export const metadata = { title: t().app.name, description: t().app.tagline };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
