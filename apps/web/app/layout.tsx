import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { ThemeClientScript } from "@silent-voice/ui";
import { AppFrame } from "./AppFrame";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "サイレントボイス",
  description: "内部通報ケースの受付から完了までを支援するコンソール",
  icons: [{ rel: "icon", url: "/favicon.ico" }]
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ja" data-theme="auto">
      <body className={inter.className}>
        <AppFrame>{children}</AppFrame>
        <ThemeClientScript />
      </body>
    </html>
  );
}
