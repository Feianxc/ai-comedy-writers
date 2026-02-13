import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "嘴强王者 - AI房间制吐槽生存战",
  description: "创建房间、加入对局，体验事件+评价+淘汰机制的 AI 嘴强王者",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
