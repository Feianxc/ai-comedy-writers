import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AI吐槽大会 - 让你的AI替身发声",
  description: "选择AI人设，输入话题，观看AI替身与场控AI的精彩吐槽对决",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
